import { generateUnicornTraits, drawUnicorn, type UnicornTraits } from './render/unicorn';
import { generateMonsterTraits, type MonsterTraits } from './game/monster';
import { drawMonster } from './render/monster';
import { drawTreasureChest, drawTrapFloor } from './render/event';
import {
  drawHpBar,
  drawMenu,
  drawLog,
  drawFloorBadge,
  drawTitleCard,
  drawRunSummary,
  drawStatsPanel,
  drawLevelBadge,
  drawMuteToggle,
  drawNameTag,
  maxLogScroll,
} from './render/ui';
import { generateFloorEncounter, resolveTrap, resolveTreasure, type FloorEncounter } from './game/dungeon';
import { createProgression, grantXp, xpForMonster, type Progression } from './game/progression';
import { rollMutationItem, CONSUMABLE_DROP_CHANCE, TREASURE_MUTATION_CHANCE } from './game/item';
import { mulberry32, chance } from './game/rng';
import { animOffset, animProgress, drawImpactBurst } from './render/fx';
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
  isBattleOver,
  type Combatant,
  type BattleState,
} from './game/battle';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const context = canvas.getContext('2d')!;

const GAME_TITLE = '🦄 Rainbow Depths';
const GAME_SUBTITLE = 'A procedural unicorn dungeon crawl';

type GameState = 'Title' | 'Battle' | 'Event' | 'GameOver';

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

// Screen/floor transitions swap state at the midpoint of a fade — one
// mechanism covers Title<->Battle, floor advances, and Battle/Event->GameOver
// instead of hard cuts. Floor advances use the rainbow sweep; every other
// transition uses the plain dark fade.
type FadePhase = 'none' | 'out' | 'in';
type FadeStyle = 'dark' | 'rainbow';
let fadePhase: FadePhase = 'none';
let fadeStyle: FadeStyle = 'dark';
let fadeStart = 0;
let pendingAction: (() => void) | null = null;
const FADE_DURATION = 220;

function transitionTo(action: () => void, style: FadeStyle = 'dark'): void {
  pendingAction = action;
  fadeStyle = style;
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

// stats panel sits to the left of the combat log, both aligned to the same
// row so neither overlaps the player sprite above them
const STATS_PANEL_X = 16;
const STATS_PANEL_W = 78;

// combat log panel geometry — kept in sync with the drawLog() call below so
// wheel-scroll hit-testing matches what's actually on screen
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

let logScroll = 0;
let autoFollowLog = true;

function resetLogScroll(): void {
  logScroll = 0;
  autoFollowLog = true;
}

function resetCombatAnims(): void {
  playerAttackAnimStart = null;
  enemyAttackAnimStart = null;
  playerHitAnimStart = null;
  enemyHitAnimStart = null;
}

function enterFloor(): void {
  encounter = generateFloorEncounter(runSeed, floor);
  selected = 0;
  eventChoiceMade = false;
  battleRewardsGranted = false;
  resetLogScroll();
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
    battle!.log.push(rollMutationItem(rewardRngFor(0x2), player, traits));
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
          state = 'GameOver';
          selected = 0;
        });
      } else {
        transitionTo(advanceFloor, 'rainbow');
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
        eventLines.push(rollMutationItem(rewardRngFor(0x3), player, traits));
        rainbowFruitsFound += 1;
      }
    } else {
      eventLines.push('You leave the treasure untouched.');
    }
    eventChoiceMade = true;
    selected = 0;
    return;
  }

  transitionTo(advanceFloor, 'rainbow');
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'm' || e.key === 'M') {
    toggleMute();
    return;
  }
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

canvas.addEventListener(
  'wheel',
  (e) => {
    if (state === 'Title') return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    if (mx < LOG_X || mx > LOG_X + LOG_W || my < LOG_Y || my > LOG_Y + LOG_H) return;

    e.preventDefault();
    const lines = state === 'Battle' && battle ? battle.log : state === 'Event' ? eventLines : gameOverLines;
    const max = maxLogScroll(lines.length, LOG_H);
    logScroll = Math.min(max, Math.max(0, logScroll + Math.sign(e.deltaY)));
    autoFollowLog = logScroll >= max;
  },
  { passive: false }
);

const RAINBOW_SWEEP_STOPS: [number, string][] = [
  [0, '#ff6b9e'],
  [0.2, '#ffb36b'],
  [0.4, '#fff36b'],
  [0.6, '#6bffa3'],
  [0.8, '#6bb8ff'],
  [1, '#c26bff'],
];

function drawFadeOverlay(t: number): void {
  if (fadePhase === 'none') return;
  const progress = Math.min(1, (t - fadeStart) / FADE_DURATION);

  if (fadeStyle === 'dark') {
    const alpha = fadePhase === 'out' ? progress : 1 - progress;
    context.fillStyle = `rgba(20,12,32,${alpha})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // Rainbow sweep (floor advances only): a band sweeps left-to-right across
  // the whole transition — grows to fully cover the screen during "out"
  // (state swap happens right as it's fully covered), then keeps sweeping
  // the same direction to uncover during "in" — one continuous wipe rather
  // than two separate fades.
  const w = canvas.width;
  const coverStart = fadePhase === 'out' ? 0 : progress * w;
  const coverEnd = fadePhase === 'out' ? progress * w : w;
  if (coverEnd <= coverStart) return;

  const gradient = context.createLinearGradient(0, 0, w, 0);
  RAINBOW_SWEEP_STOPS.forEach(([stop, color]) => gradient.addColorStop(stop, color));
  context.fillStyle = gradient;
  context.fillRect(coverStart, 0, coverEnd - coverStart, canvas.height);

  const edgeX = fadePhase === 'out' ? coverEnd : coverStart;
  const shimmer = context.createLinearGradient(edgeX - 24, 0, edgeX + 24, 0);
  shimmer.addColorStop(0, 'rgba(255,255,255,0)');
  shimmer.addColorStop(0.5, 'rgba(255,255,255,0.85)');
  shimmer.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = shimmer;
  context.fillRect(edgeX - 24, 0, 48, canvas.height);
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
    drawMuteToggle(context, canvas.width - 16, 16, isMuted());
    const uiScale = canvas.height / 600;

    if (state === 'Title') {
      context.save();
      context.translate(canvas.width / 2, canvas.height * 0.72);
      context.scale(uiScale * 1.4, uiScale * 1.4);
      drawUnicorn(context, 0, 0, traits, t);
      context.restore();

      drawTitleCard(context, 48, 40, GAME_TITLE, GAME_SUBTITLE, t);
      drawMenu(context, canvas.width / 2 - 142, canvas.height - 140, 284, 60, currentMenuOptions(), selected);
      drawFadeOverlay(t);
      return;
    }

    const playerLunge = animOffset(playerAttackAnimStart, t, LUNGE_DURATION, LUNGE_DISTANCE);
    const playerHitP = animProgress(playerHitAnimStart, t, HIT_DURATION);
    const playerShakeX = playerHitP !== null ? (Math.random() - 0.5) * SHAKE_MAGNITUDE * (1 - playerHitP) : 0;
    const playerShakeY = playerHitP !== null ? (Math.random() - 0.5) * SHAKE_MAGNITUDE * 0.5 * (1 - playerHitP) : 0;

    context.save();
    context.translate(PLAYER_SPRITE_X + playerLunge + playerShakeX, canvas.height * 0.62 + playerShakeY);
    context.scale(uiScale, uiScale);
    drawUnicorn(context, 0, 0, traits, t);
    context.restore();
    if (playerHitP !== null) drawImpactBurst(context, PLAYER_SPRITE_X, canvas.height * 0.52, playerHitP);

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
      if (enemyHitP !== null) drawImpactBurst(context, ENEMY_SPRITE_X, canvas.height * 0.5, enemyHitP);
      const nameTagY = Math.max(
        126, // never closer than this to the enemy HP bar (y=80, h=26) + margin
        canvas.height * 0.5 - 150 * monsterTraits.scale * uiScale
      );
      drawNameTag(context, ENEMY_SPRITE_X, nameTagY, monsterTraits.name);
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
        480,
        350,
        {
          floorReached: floor,
          level: progression.level,
          monstersDefeated,
          bossesDefeated,
          treasuresFound,
          trapsFound,
          rainbowFruitsFound,
        },
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
    if (autoFollowLog) logScroll = maxLogScroll(currentLog.length, LOG_H);
    drawLog(context, LOG_X, LOG_Y, LOG_W, LOG_H, currentLog, logScroll);

    drawMenu(context, canvas.width - 340, canvas.height - 200, 284, 150, currentMenuOptions(), selected);
    drawFadeOverlay(t);
}

function loop(): void {
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
