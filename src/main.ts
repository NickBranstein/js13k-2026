import { generateUnicornTraits, drawUnicorn, type UnicornTraits } from './render/unicorn';
import { generateMonsterTraits, type MonsterTraits } from './game/monster';
import { loadLifetimeStats, recordRun, type LifetimeStats } from './game/stats';
import { drawMonster } from './render/monster';
import { drawTreasureChest, drawTrapFloor } from './render/event';
import {
  drawHpBar,
  drawMenu,
  drawLog,
  drawFloorBadge,
  drawTitleCard,
  drawRunSummary,
  drawMutationReveal,
  drawTransformPanel,
  wrapText,
  drawStatsPanel,
  drawLevelBadge,
  drawMuteToggle,
  muteToggleBounds,
  drawHelpButton,
} from './render/ui';
import { GOLD_TEXT, TEXT_COLOR, PANEL_BORDER } from './render/shared';
import { generateFloorEncounter, resolveTrap, resolveTreasure, type FloorEncounter } from './game/dungeon';
import { createProgression, grantXp, xpForMonster, type Progression } from './game/progression';
import { rollMutationItem, CONSUMABLE_DROP_CHANCE, TREASURE_MUTATION_CHANCE } from './game/item';
import { handleDevKeydown, drawDevTools } from './dev/devtools';
import { mulberry32, chance } from './game/rng';
import { animOffset, animProgress } from './render/fx';
import {
  playMenuMove,
  playConfirm,
  playHit,
  playVictory,
  playCharm,
  playLevelUp,
  playDefeat,
  startAmbient,
  stopAmbient,
  toggleMute,
  isMuted,
} from './audio/audio';
import {
  createBattle,
  playerAttack,
  playerUseItem,
  playerCharm,
  isVulnerable,
  isBattleOver,
  type Combatant,
  type BattleState,
} from './game/battle';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const context = canvas.getContext('2d')!;

const GAME_TITLE = '🦄 Rainbow Depths';
const GAME_SUBTITLE = 'A procedural unicorn dungeon crawl';

type GameState = 'Title' | 'Battle' | 'Event' | 'MutationReveal' | 'MutationTransform' | 'GameOver';

let runSeed = 0;
let floor = 1;
let traits: UnicornTraits;
let player: Combatant;
let progression: Progression;
let inventory = 0; // consumable potion count
let state: GameState = 'Title';
let encounter: FloorEncounter;
let monsterTraits: MonsterTraits | undefined;
let battle: BattleState | undefined;
let battleRewardsGranted = false;
let eventLines: string[] = [];
let eventChoiceMade = false; // Treasure: has Collect/Leave been chosen yet?
let gameOverLines: string[] = [];
let selected = 0;
let lifetimeStats: LifetimeStats = loadLifetimeStats();
let howToOpen = false;

// Set when a mutation item is found; consumed the next time the player would
// otherwise advance a floor, showing the reveal screen (then the transform
// animation) first. pendingMutationBefore snapshots the unicorn's look
// before the mutation was applied, for the transform crossfade.
let pendingMutationReveal: { name: string; detail: string } | null = null;
let pendingMutationBefore: UnicornTraits | null = null;
let transformStart: number | null = null;
const TRANSFORM_DURATION = 1600;

function tryAdvanceOrReveal(): void {
  if (pendingMutationReveal) {
    state = 'MutationReveal';
    return;
  }
  advanceFloor();
}

// Run stats, tracked for the Game Over summary panel.
let monstersDefeated = 0;
let bossesDefeated = 0;
let treasuresFound = 0;
let trapsFound = 0;
let rainbowFruitsFound = 0; // permanent mutation items — "Rainbow Fruit" is the umbrella name

// HP bar tween state — bars animate toward the real value instead of snapping.
let displayedPlayerHp = 0;
let displayedEnemyHp = 0;
const HP_TWEEN_RATE = 0.15;

// Combat animation timing (attack lunges, hit flash/shake). null = inactive.
const LUNGE_DURATION = 260;
const LUNGE_DISTANCE = 46;
const HIT_DURATION = 380;
const SHAKE_MAGNITUDE = 16;
const ENEMY_TURN_OFFSET = 380;
let playerAttackAnimStart: number | null = null;
let enemyAttackAnimStart: number | null = null;
let playerHitAnimStart: number | null = null;
let enemyHitAnimStart: number | null = null;

// Screen transitions swap state at the midpoint of a fade — one mechanism
// covers Title<->Battle and Battle/Event->GameOver instead of hard cuts.
// Floor advances are instant (no transition).
type FadePhase = 'none' | 'out' | 'in';
let fadePhase: FadePhase = 'none';
let fadeStart = 0;
let pendingAction: (() => void) | null = null;
const FADE_DURATION = 220;

function transitionTo(action: () => void): void {
  pendingAction = action;
  fadePhase = 'out';
  fadeStart = performance.now();
}

function monsterToCombatant(m: MonsterTraits): Combatant {
  return { name: m.name, hp: m.hp, maxHp: m.maxHp, atk: m.atk, def: m.def, charisma: 0 };
}

function monsterSeedFor(seed: number, floorNum: number): number {
  return (seed ^ (floorNum * 0x27d4eb2f)) >>> 0;
}

// A seeded RNG for reward rolls (consumable drop, mutation item pick), distinct
// per floor so the same run seed always produces the same drops.
function rewardRngFor(offset: number): () => number {
  return mulberry32((runSeed ^ (floor * 0x2545f491) ^ offset) >>> 0);
}

// Command bar options for the current state — the same menu box drives combat
// actions, treasure collect/leave, and advancing to the next floor.
function currentMenuOptions(): string[] {
  if (state === 'Title') return ['Start'];
  if (state === 'MutationReveal') return ['Continue'];
  if (state === 'MutationTransform') {
    return transformStart !== null && performance.now() - transformStart < TRANSFORM_DURATION ? [] : ['Continue'];
  }
  if (state === 'GameOver') return ['New Run', 'Title Screen'];
  if (state === 'Battle') {
    if (!battle) return [];
    if (isBattleOver(battle)) return battle.phase === 'Defeat' ? ['Continue'] : ['Proceed'];
    const options = ['Attack'];
    if (inventory > 0) options.push('Potion');
    options.push('Charm');
    return options;
  }
  // state === 'Event'
  if (encounter.type === 'Treasure' && !eventChoiceMade) return ['Collect', 'Leave'];
  return ['Proceed'];
}

// Geometry for the currently active command-bar menu — shared by rendering
// (so drawMenu is called with these exact numbers) and click/tap
// hit-testing, so taps land exactly where the drawn rows are.
interface MenuRect {
  x: number;
  y: number;
  w: number;
  h: number;
  centered: boolean;
}

function menuBounds(): MenuRect | null {
  const modalCenterY = canvas.height / 2;
  if (state === 'Title') {
    return { x: canvas.width / 2 - 68, y: canvas.height - 140, w: 136, h: 48, centered: true };
  }
  if (state === 'MutationReveal') {
    return { x: canvas.width / 2 - 90, y: modalCenterY + 380 / 2 - 66, w: 180, h: 48, centered: true };
  }
  if (state === 'MutationTransform') {
    if (currentMenuOptions().length === 0) return null;
    return { x: canvas.width / 2 - 90, y: modalCenterY + 520 / 2 - 66, w: 180, h: 48, centered: true };
  }
  return { x: canvas.width - 340, y: canvas.height - 200, w: 284, h: 150, centered: false };
}

const HELP_BTN_SIZE = 34;

// Shared by drawing and click hit-testing, same as menuBounds — sits just
// left of the mute toggle, whose width shifts slightly with muted state.
function helpButtonBounds(): { x: number; y: number; size: number } {
  const mtb = muteToggleBounds(context, canvas.width - 16, 16, isMuted());
  return { x: mtb.x - 10 - HELP_BTN_SIZE, y: mtb.y, size: HELP_BTN_SIZE };
}

// stats panel sits to the left of the combat log, both aligned to the same
// row so neither overlaps the player sprite above them
const STATS_PANEL_X = 16;
const STATS_PANEL_W = 78;

// combat log panel geometry — kept in sync with the drawLog() call below
const LOG_X = STATS_PANEL_X + STATS_PANEL_W + 12;
const LOG_Y = canvas.height - 200;
const LOG_W = canvas.width - 400 - (LOG_X - 56);
const LOG_H = 150;

// level badge sits directly above the stats panel, same column
const LEVEL_BADGE_H = 74;
const LEVEL_BADGE_GAP = 10;
const LEVEL_BADGE_Y = LOG_Y - LEVEL_BADGE_GAP - LEVEL_BADGE_H;

// HP bar geometry — sprites are centered under their matching bar
const HP_BAR_W = 340;
const PLAYER_HP_X = 56;
const ENEMY_HP_X = canvas.width - 396;
const PLAYER_SPRITE_X = PLAYER_HP_X + HP_BAR_W / 2;
const ENEMY_SPRITE_X = ENEMY_HP_X + HP_BAR_W / 2;

function resetCombatAnims(): void {
  playerAttackAnimStart = null;
  enemyAttackAnimStart = null;
  playerHitAnimStart = null;
  enemyHitAnimStart = null;
}

// Shown once per battle, the moment the enemy first crosses into "vulnerable"
// (see isVulnerable in game/battle.ts) — a flavor cue for the Charm glow
// rather than a number, so the player still has to notice and act on it.
// vulnerableMessageLogIndex/AnimStart drive drawLog's letter-grow-in effect
// on that specific line.
let vulnerableMessageShown = false;
let vulnerableMessageLogIndex = -1;
let vulnerableMessageAnimStart = 0;

function enterFloor(): void {
  encounter = generateFloorEncounter(runSeed, floor);
  selected = 0;
  eventChoiceMade = false;
  battleRewardsGranted = false;
  vulnerableMessageShown = false;
  vulnerableMessageLogIndex = -1;
  resetCombatAnims();

  if (encounter.type === 'Monster') {
    const monsterSeed = monsterSeedFor(runSeed, floor);
    monsterTraits = generateMonsterTraits(monsterSeed, floor, encounter.boss);
    battle = createBattle(player, monsterToCombatant(monsterTraits), monsterSeed);
    displayedEnemyHp = battle.enemy.hp;
    state = 'Battle';
    return;
  }

  monsterTraits = undefined;
  battle = undefined;

  if (encounter.type === 'Treasure') {
    treasuresFound += 1;
    eventLines = [`Floor ${floor}: Treasure Room`, 'You find a treasure chest. Collect it or leave it behind?'];
    state = 'Event';
  } else {
    trapsFound += 1;
    const result = resolveTrap(runSeed, floor, floor, player.hp);
    player.hp = Math.max(1, player.hp - result.damage);
    eventLines = [`Floor ${floor}: Trap Room`, result.message];
    eventChoiceMade = true;
    state = 'Event';
  }
}

function advanceFloor(): void {
  floor += 1;
  enterFloor();
}

function startRun(): void {
  runSeed = Math.floor(Math.random() * 1000000);
  traits = generateUnicornTraits(runSeed);
  player = { name: 'Unicorn', hp: 80, maxHp: 80, atk: 16, def: 10, charisma: 20 };
  progression = createProgression();
  inventory = 0;
  floor = 1;
  displayedPlayerHp = player.hp;
  monstersDefeated = 0;
  bossesDefeated = 0;
  treasuresFound = 0;
  trapsFound = 0;
  rainbowFruitsFound = 0;
  pendingMutationReveal = null;
  pendingMutationBefore = null;
  transformStart = null;
  startAmbient();
  enterFloor();
}

traits = generateUnicornTraits(Math.floor(Math.random() * 1000000)); // title-screen preview

// Awards XP/level-ups, a chance at a consumable, and (guaranteed on bosses) a
// permanent mutation item. Runs once per battle, right after it's won.
function maybeGrantBattleRewards(): void {
  if (!battle || battleRewardsGranted || !isBattleOver(battle)) return;
  if (battle.phase !== 'Victory' && battle.phase !== 'Charmed') return;
  if (!monsterTraits) return;
  battleRewardsGranted = true;

  if (battle.phase === 'Victory') {
    playVictory();
    monstersDefeated += 1;
    if (monsterTraits.isBoss) bossesDefeated += 1;
  } else {
    playCharm();
  }

  const xpGain = xpForMonster(monsterTraits);
  const levelResult = grantXp(progression, player, xpGain);
  levelResult.messages.forEach((m) => battle!.log.push(m));
  if (levelResult.levelsGained > 0) playLevelUp(0.4);

  if (chance(rewardRngFor(0x1), CONSUMABLE_DROP_CHANCE)) {
    inventory += 1;
    battle!.log.push('You found a Rainbow Potion! (Item +1)');
  }

  if (monsterTraits.isBoss) {
    pendingMutationBefore = { ...traits };
    pendingMutationReveal = rollMutationItem(rewardRngFor(0x2), player, traits);
    rainbowFruitsFound += 1;
  }
}

// Player's lunge/enemy-hit-flash play immediately; if the enemy also
// counterattacks in this same resolved turn, its lunge/player-hit-flash are
// staggered to start after the player's animation, so the two hits read as
// sequential even though battle.ts resolved them in one synchronous call.
function triggerCombatAnims(enemyHpBefore: number, playerHpBefore: number, wasPlayerAttack: boolean): void {
  if (!battle) return;
  const now = performance.now();

  if (wasPlayerAttack && battle.enemy.hp < enemyHpBefore) {
    playerAttackAnimStart = now;
    enemyHitAnimStart = now + LUNGE_DURATION * 0.5;
    playHit((LUNGE_DURATION * 0.5) / 1000);
  }

  if (battle.player.hp < playerHpBefore) {
    const enemyStart = now + (wasPlayerAttack ? ENEMY_TURN_OFFSET : 0);
    enemyAttackAnimStart = enemyStart;
    playerHitAnimStart = enemyStart + LUNGE_DURATION * 0.5;
    playHit((enemyStart - now + LUNGE_DURATION * 0.5) / 1000);
  }
}

function confirmSelection(): void {
  const options = currentMenuOptions();
  const choice = options[selected];

  if (state === 'Title') {
    transitionTo(startRun);
    return;
  }

  if (state === 'MutationReveal') {
    state = 'MutationTransform';
    transformStart = performance.now();
    selected = 0;
    return;
  }

  if (state === 'MutationTransform') {
    pendingMutationReveal = null;
    pendingMutationBefore = null;
    transformStart = null;
    advanceFloor();
    return;
  }

  if (state === 'GameOver') {
    if (choice === 'Title Screen') {
      transitionTo(() => {
        stopAmbient();
        state = 'Title';
        traits = generateUnicornTraits(Math.floor(Math.random() * 1000000));
        selected = 0;
      });
    } else {
      transitionTo(startRun);
    }
    return;
  }

  if (state === 'Battle') {
    if (!battle) return;
    if (isBattleOver(battle)) {
      if (battle.phase === 'Defeat') {
        playDefeat();
        stopAmbient();
        transitionTo(() => {
          gameOverLines = [...battle!.log, `Fell on Floor ${floor}.`];
          lifetimeStats = recordRun(lifetimeStats, {
            floor,
            monstersDefeated,
            bossesDefeated,
            treasuresFound,
            trapsFound,
            rainbowFruitsFound,
          });
          state = 'GameOver';
          selected = 0;
        });
      } else {
        tryAdvanceOrReveal();
      }
      return;
    }
    const enemyHpBefore = battle.enemy.hp;
    const playerHpBefore = battle.player.hp;
    const wasAttack = choice === 'Attack';

    if (choice === 'Attack') playerAttack(battle);
    else if (choice === 'Potion') {
      inventory -= 1;
      playerUseItem(battle);
    } else if (choice === 'Charm') playerCharm(battle);

    if (!vulnerableMessageShown && battle.enemy.hp > 0 && isVulnerable(battle.enemy)) {
      vulnerableMessageShown = true;
      vulnerableMessageLogIndex = battle.log.length;
      vulnerableMessageAnimStart = performance.now();
      battle.log.push(`${battle.enemy.name} finds your charisma hard to resist...`);
    }

    triggerCombatAnims(enemyHpBefore, playerHpBefore, wasAttack);
    maybeGrantBattleRewards();
    if (isBattleOver(battle)) selected = 0;
    return;
  }

  // state === 'Event'
  if (encounter.type === 'Treasure' && !eventChoiceMade) {
    if (choice === 'Collect') {
      const result = resolveTreasure(runSeed, floor, TREASURE_MUTATION_CHANCE);
      player.hp = Math.min(player.maxHp, player.hp + result.heal);
      eventLines.push(`You find a treasure chest. Healed ${result.heal} HP.`);
      if (result.foundMutationItem) {
        pendingMutationBefore = { ...traits };
        pendingMutationReveal = rollMutationItem(rewardRngFor(0x3), player, traits);
        rainbowFruitsFound += 1;
      }
    } else {
      eventLines.push('You leave the treasure untouched.');
    }
    eventChoiceMade = true;
    selected = 0;
    return;
  }

  tryAdvanceOrReveal();
}

window.addEventListener('keydown', (e) => {
  if (__DEV__ && handleDevKeydown(e, { state, traits, player, grantPotion: () => (inventory += 1) })) {
    return;
  }
  if (e.key === 'm' || e.key === 'M') {
    toggleMute();
    return;
  }
  if (e.key === 'Escape') {
    howToOpen = !howToOpen;
    return;
  }
  if (howToOpen) return;
  if (fadePhase !== 'none') return;
  const advance = e.key === 'Enter' || e.key === ' ';
  const options = currentMenuOptions();
  if (options.length === 0) return;

  if (e.key === 'ArrowUp' || e.key === 'w') {
    selected = (selected + options.length - 1) % options.length;
    playMenuMove();
  } else if (e.key === 'ArrowDown' || e.key === 's') {
    selected = (selected + 1) % options.length;
    playMenuMove();
  } else if (advance) {
    playConfirm();
    confirmSelection();
  }
});

// Maps a mouse/touch event's client coordinates onto canvas-space pixels,
// accounting for the CSS-scaled display size (canvas.width/height are the
// fixed internal resolution, not the on-screen size).
function canvasPoint(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

// Click/tap support for the command-bar menu. A single tap both selects and
// confirms the tapped row — mobile browsers synthesize a 'click' from a
// tap, so this doubles as touch support with no separate touch handlers.
// The audio engine lazily unlocks on first sound played from a user
// gesture, and click qualifies just like keydown does.
canvas.addEventListener('click', (e) => {
  if (howToOpen) {
    howToOpen = false;
    return;
  }
  if (fadePhase !== 'none') return;
  const { x: mx, y: my } = canvasPoint(e);

  if (state !== 'Title') {
    const mtb = muteToggleBounds(context, canvas.width - 16, 16, isMuted());
    if (mx >= mtb.x && mx <= mtb.x + mtb.w && my >= mtb.y && my <= mtb.y + mtb.h) {
      toggleMute();
      return;
    }
    const hb = helpButtonBounds();
    if (mx >= hb.x && mx <= hb.x + hb.size && my >= hb.y && my <= hb.y + hb.size) {
      howToOpen = true;
      return;
    }
  }

  const mb = menuBounds();
  if (!mb) return;
  const options = currentMenuOptions();
  if (options.length === 0) return;
  if (mx < mb.x || mx > mb.x + mb.w || my < mb.y || my > mb.y + mb.h) return;

  const rowH = mb.h / options.length;
  const row = Math.min(options.length - 1, Math.floor((my - mb.y) / rowH));
  selected = row;
  playConfirm();
  confirmSelection();
});

const HOW_TO_LINES = [
  'Arrows / WASD - move selection',
  'Enter / Space / Tap - confirm',
  'M - mute',
  'Charm - chance to befriend; better odds on a weakened foe',
  'Potion - heals HP in battle',
  'Esc / Tap Any - close this panel',
];

function drawHowTo(): void {
  if (!howToOpen) return;
  context.fillStyle = 'rgba(10,6,18,0.6)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const hw = 560;
  const hh = 70 + HOW_TO_LINES.length * 30;
  const hx = canvas.width / 2 - hw / 2;
  const hy = canvas.height / 2 - hh / 2;
  context.beginPath();
  context.roundRect(hx, hy, hw, hh, 18);
  context.fillStyle = 'rgba(53,32,84,0.95)';
  context.fill();
  context.lineWidth = 2.5;
  context.strokeStyle = PANEL_BORDER;
  context.stroke();

  context.textAlign = 'center';
  context.fillStyle = TEXT_COLOR;
  context.font = '700 24px sans-serif';
  context.textBaseline = 'top';
  context.fillText('How To Play', canvas.width / 2, hy + 22);

  context.textAlign = 'left';
  context.font = '600 16px sans-serif';
  HOW_TO_LINES.forEach((line, i) => context.fillText(line, hx + 32, hy + 68 + i * 30));
  context.textBaseline = 'alphabetic';
}

function drawFadeOverlay(t: number): void {
  if (fadePhase === 'none') return;
  const progress = Math.min(1, (t - fadeStart) / FADE_DURATION);
  const alpha = fadePhase === 'out' ? progress : 1 - progress;
  context.fillStyle = `rgba(20,12,32,${alpha})`;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function drawBackdrop() {
  const sky = context.createLinearGradient(0, 0, 0, canvas.height * 0.72);
  sky.addColorStop(0, '#dff1ff');
  sky.addColorStop(1, '#fbeaff');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#eadcff';
  context.beginPath();
  context.ellipse(canvas.width / 2, canvas.height * 0.82 + 90, canvas.width * 0.72, 110, 0, 0, Math.PI * 2);
  context.fill();
}

function render(): void {
    const t = performance.now();

    if (fadePhase === 'out' && t - fadeStart >= FADE_DURATION) {
      pendingAction?.();
      pendingAction = null;
      fadePhase = 'in';
      fadeStart = t;
    } else if (fadePhase === 'in' && t - fadeStart >= FADE_DURATION) {
      fadePhase = 'none';
    }

    drawBackdrop();
    const uiScale = canvas.height / 600;

    if (state === 'Title') {
      context.save();
      context.translate(canvas.width / 2, canvas.height * 0.72);
      context.scale(uiScale * 1.4, uiScale * 1.4);
      drawUnicorn(context, traits, t);
      context.restore();

      drawTitleCard(context, 48, 40, GAME_TITLE, GAME_SUBTITLE, t);
      if (lifetimeStats.bestFloor > 0) {
        context.font = '700 18px sans-serif';
        context.fillStyle = GOLD_TEXT;
        context.textAlign = 'right';
        context.fillText(`🏆 Best Floor: ${lifetimeStats.bestFloor}`, canvas.width - 48, canvas.height - 48);
        context.textAlign = 'left';
      }
      const titleMenu = menuBounds()!;
      drawMenu(context, titleMenu.x, titleMenu.y, titleMenu.w, titleMenu.h, currentMenuOptions(), selected, true);
      drawFadeOverlay(t);
      drawHowTo();
      if (__DEV__) drawDevTools(context, canvas.width);
      return;
    }

    drawMuteToggle(context, canvas.width - 16, 16, isMuted());
    const helpBtn = helpButtonBounds();
    drawHelpButton(context, helpBtn.x, helpBtn.y, helpBtn.size);

    const playerLunge = animOffset(playerAttackAnimStart, t, LUNGE_DURATION, LUNGE_DISTANCE);
    const playerHitP = animProgress(playerHitAnimStart, t, HIT_DURATION);
    const playerShakeX = playerHitP !== null ? (Math.random() - 0.5) * SHAKE_MAGNITUDE * (1 - playerHitP) : 0;
    const playerShakeY = playerHitP !== null ? (Math.random() - 0.5) * SHAKE_MAGNITUDE * 0.5 * (1 - playerHitP) : 0;

    if (state !== 'MutationTransform') {
      context.save();
      context.translate(PLAYER_SPRITE_X + playerLunge + playerShakeX, canvas.height * 0.62 + playerShakeY);
      context.scale(uiScale, uiScale);
      drawUnicorn(context, traits, t);
      context.restore();
    }

    if (state === 'Battle' && monsterTraits) {
      const enemyLunge = animOffset(enemyAttackAnimStart, t, LUNGE_DURATION, LUNGE_DISTANCE);
      const enemyHitP = animProgress(enemyHitAnimStart, t, HIT_DURATION);
      const enemyShakeX = enemyHitP !== null ? (Math.random() - 0.5) * SHAKE_MAGNITUDE * (1 - enemyHitP) : 0;
      const enemyShakeY = enemyHitP !== null ? (Math.random() - 0.5) * SHAKE_MAGNITUDE * 0.5 * (1 - enemyHitP) : 0;

      context.save();
      context.translate(ENEMY_SPRITE_X - enemyLunge + enemyShakeX, canvas.height * 0.5 + enemyShakeY);
      context.scale(uiScale, uiScale);
      drawMonster(context, 0, 0, monsterTraits, t);
      context.restore();
    } else if (state === 'Event') {
      context.save();
      context.translate(ENEMY_SPRITE_X, canvas.height * 0.5);
      context.scale(uiScale, uiScale);
      if (encounter.type === 'Treasure') drawTreasureChest(context, 0, 0, t);
      else drawTrapFloor(context, 0, 0, t);
      context.restore();
    } else if (state === 'GameOver') {
      drawRunSummary(
        context,
        canvas.width / 2,
        canvas.height * 0.44,
        560,
        380,
        {
          floorReached: floor,
          level: progression.level,
          monstersDefeated,
          bossesDefeated,
          treasuresFound,
          trapsFound,
          rainbowFruitsFound,
        },
        lifetimeStats,
        t
      );
    }

    if (state !== 'GameOver') {
      drawFloorBadge(context, canvas.width / 2, 16, floor, encounter.boss);
    }

    displayedPlayerHp += (player.hp - displayedPlayerHp) * HP_TWEEN_RATE;
    if (Math.abs(player.hp - displayedPlayerHp) < 0.4) displayedPlayerHp = player.hp;
    drawHpBar(context, PLAYER_HP_X, 80, HP_BAR_W, 26, player, displayedPlayerHp, progression.level);

    if (state === 'Battle' && battle) {
      displayedEnemyHp += (battle.enemy.hp - displayedEnemyHp) * HP_TWEEN_RATE;
      if (Math.abs(battle.enemy.hp - displayedEnemyHp) < 0.4) displayedEnemyHp = battle.enemy.hp;
      drawHpBar(context, ENEMY_HP_X, 80, HP_BAR_W, 26, battle.enemy, displayedEnemyHp);
    }

    drawLevelBadge(context, STATS_PANEL_X, LEVEL_BADGE_Y, STATS_PANEL_W, LEVEL_BADGE_H, progression.level, t);

    drawStatsPanel(context, STATS_PANEL_X, LOG_Y, STATS_PANEL_W, LOG_H, [
      ['ATK', player.atk],
      ['DEF', player.def],
      ['CHA', player.charisma],
      ['POT', inventory],
    ]);

    const currentLog = state === 'Battle' && battle ? battle.log : state === 'Event' ? eventLines : gameOverLines;
    drawLog(
      context,
      LOG_X,
      LOG_Y,
      LOG_W,
      LOG_H,
      currentLog,
      state === 'Battle' ? vulnerableMessageLogIndex : -1,
      vulnerableMessageAnimStart,
      t
    );

    const modalCenterY = canvas.height / 2;

    if (state === 'MutationReveal' && pendingMutationReveal) {
      context.fillStyle = 'rgba(10,6,18,0.45)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawMutationReveal(context, canvas.width / 2, modalCenterY, 680, 380, pendingMutationReveal.name, pendingMutationReveal.detail, t);
    } else if (state === 'MutationTransform' && pendingMutationBefore && pendingMutationReveal) {
      const progress = transformStart === null ? 1 : Math.min(1, (t - transformStart) / TRANSFORM_DURATION);
      const tcx = canvas.width / 2;
      const tcy = modalCenterY;
      const tw = 820;
      const th = 520;

      context.fillStyle = 'rgba(10,6,18,0.45)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      drawTransformPanel(context, tcx, tcy, tw, th, t);

      // Unicorn geometry stands with feet at the translate origin and its
      // head/horn extending roughly 300 units upward and negligibly below
      // it — read from drawUnicorn's own coordinate math, not guessed.
      const spriteScale = uiScale * 0.68;
      const spriteY = tcy + 105;
      const leftX = tcx - tw * 0.27;
      const rightX = tcx + tw * 0.27;

      context.save();
      context.translate(leftX, spriteY);
      context.scale(spriteScale, spriteScale);
      drawUnicorn(context, pendingMutationBefore, t);
      context.restore();

      context.save();
      context.translate(rightX, spriteY);
      context.scale(spriteScale, spriteScale);
      context.globalAlpha = progress;
      drawUnicorn(context, traits, t);
      context.globalAlpha = 1;
      context.restore();

      context.textAlign = 'center';
      context.fillStyle = GOLD_TEXT;
      context.textBaseline = 'middle';
      context.font = '700 42px sans-serif';
      context.fillText('→', tcx, spriteY - 135);

      context.textBaseline = 'top';
      context.font = '700 20px sans-serif';
      context.fillText(`✨ ${pendingMutationReveal.name} ✨`, tcx, tcy - th / 2 + 20);

      context.font = '600 15px sans-serif';
      const transformLines = wrapText(context, pendingMutationReveal.detail, tw - 100);
      transformLines.forEach((line, i) => context.fillText(line, tcx, tcy - th / 2 + 52 + i * 22));
      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
    }

    const menuOptions = currentMenuOptions();
    const mb = menuBounds();
    if (mb) {
      const charmGlow =
        state === 'Battle' && battle && !isBattleOver(battle) && isVulnerable(battle.enemy)
          ? menuOptions.indexOf('Charm')
          : -1;
      drawMenu(context, mb.x, mb.y, mb.w, mb.h, menuOptions, selected, mb.centered, charmGlow, t);
    }
    drawFadeOverlay(t);
    drawHowTo();
    if (__DEV__) drawDevTools(context, canvas.width);
}

function loop(): void {
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
