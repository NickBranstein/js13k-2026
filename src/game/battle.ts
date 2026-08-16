// Turn-based battle state machine. Condensed from the plan's
// Idle -> PlayerMenu -> ResolveAction -> EnemyAction -> ResolveAction -> CheckEnd -> Idle
// into two turn phases plus terminal outcomes: PlayerTurn/EnemyTurn drive the loop,
// Victory/Defeat/Charmed end it.

import { mulberry32, range, chance } from './rng';

export interface Combatant {
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  charisma: number;
}

export const enum BattlePhase { PlayerTurn, EnemyTurn, Victory, Defeat, Charmed }

export interface BattleState {
  player: Combatant;
  enemy: Combatant;
  phase: BattlePhase;
  log: string[];
  rng: () => number;
}

function logLine(state: BattleState, line: string): void {
  state.log.push(line);
}

export function createBattle(player: Combatant, enemy: Combatant, seed: number): BattleState {
  return {
    player,
    enemy,
    phase: BattlePhase.PlayerTurn,
    log: [`A wild ${enemy.name} appears!`],
    rng: mulberry32(seed >>> 0),
  };
}

function rollDamage(state: BattleState, attacker: Combatant, defender: Combatant): number {
  const variance = range(state.rng, 0.85, 1.15);
  const raw = attacker.atk - defender.def * 0.5;
  return Math.max(1, Math.round(raw * variance));
}

function checkEnd(state: BattleState): boolean {
  if (state.enemy.hp <= 0) {
    state.phase = BattlePhase.Victory;
    logLine(state, `${state.enemy.name} is defeated!`);
    return true;
  }
  if (state.player.hp <= 0) {
    state.phase = BattlePhase.Defeat;
    logLine(state, `${state.player.name} has fallen...`);
    return true;
  }
  return false;
}

function enemyTurn(state: BattleState): void {
  state.phase = BattlePhase.EnemyTurn;
  const dmg = rollDamage(state, state.enemy, state.player);
  state.player.hp = Math.max(0, state.player.hp - dmg);
  logLine(state, `${state.enemy.name} attacks for ${dmg}!`);
  if (checkEnd(state)) return;
  state.phase = BattlePhase.PlayerTurn;
}

export function playerAttack(state: BattleState): void {
  if (state.phase !== BattlePhase.PlayerTurn) return;
  const dmg = rollDamage(state, state.player, state.enemy);
  state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
  logLine(state, `${state.player.name} attacks for ${dmg}!`);
  if (checkEnd(state)) return;
  enemyTurn(state);
}

const POTION_HEAL_PCT = 0.4;

export function playerUseItem(state: BattleState): void {
  if (state.phase !== BattlePhase.PlayerTurn) return;
  const heal = Math.round(state.player.maxHp * POTION_HEAL_PCT);
  const healed = Math.min(state.player.maxHp, state.player.hp + heal) - state.player.hp;
  state.player.hp += healed;
  logLine(state, `${state.player.name} uses a potion and heals ${healed} HP!`);
  enemyTurn(state);
}

// An enemy below this HP fraction is "vulnerable" — worn down enough to be
// easier to charm, so soften-then-charm is a real alternative to attacking
// straight to zero rather than charm being an any-time coin-flip. The odds
// themselves stay hidden from the player (see isVulnerable, used for a UI
// glow + flavor line instead of a number) — an intuition, not a spreadsheet.
const CHARM_VULNERABLE_HP_PCT = 0.4;
const CHARM_VULNERABLE_BONUS = 15;

export function isVulnerable(enemy: Combatant): boolean {
  return enemy.hp <= enemy.maxHp * CHARM_VULNERABLE_HP_PCT;
}

export function charmChance(player: Combatant, enemy: Combatant): number {
  return Math.min(90, player.charisma + (isVulnerable(enemy) ? CHARM_VULNERABLE_BONUS : 0));
}

export function playerCharm(state: BattleState): void {
  if (state.phase !== BattlePhase.PlayerTurn) return;
  const success = chance(state.rng, charmChance(state.player, state.enemy) * 0.01);
  if (success) {
    state.phase = BattlePhase.Charmed;
    logLine(state, `${state.enemy.name} is charmed and befriended!`);
    return;
  }
  logLine(state, `${state.player.name} tries to charm ${state.enemy.name}... it fails.`);
  enemyTurn(state);
}

export function isBattleOver(state: BattleState): boolean {
  return state.phase === BattlePhase.Victory || state.phase === BattlePhase.Defeat || state.phase === BattlePhase.Charmed;
}
