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

export type BattlePhase = 'PlayerTurn' | 'EnemyTurn' | 'Victory' | 'Defeat' | 'Charmed';

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
    phase: 'PlayerTurn',
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
    state.phase = 'Victory';
    logLine(state, `${state.enemy.name} is defeated!`);
    return true;
  }
  if (state.player.hp <= 0) {
    state.phase = 'Defeat';
    logLine(state, `${state.player.name} has fallen...`);
    return true;
  }
  return false;
}

function enemyTurn(state: BattleState): void {
  state.phase = 'EnemyTurn';
  const dmg = rollDamage(state, state.enemy, state.player);
  state.player.hp = Math.max(0, state.player.hp - dmg);
  logLine(state, `${state.enemy.name} attacks for ${dmg}!`);
  if (checkEnd(state)) return;
  state.phase = 'PlayerTurn';
}

export function playerAttack(state: BattleState): void {
  if (state.phase !== 'PlayerTurn') return;
  const dmg = rollDamage(state, state.player, state.enemy);
  state.enemy.hp = Math.max(0, state.enemy.hp - dmg);
  logLine(state, `${state.player.name} attacks for ${dmg}!`);
  if (checkEnd(state)) return;
  enemyTurn(state);
}

const POTION_HEAL_PCT = 0.3;

export function playerUseItem(state: BattleState): void {
  if (state.phase !== 'PlayerTurn') return;
  const heal = Math.round(state.player.maxHp * POTION_HEAL_PCT);
  const healed = Math.min(state.player.maxHp, state.player.hp + heal) - state.player.hp;
  state.player.hp += healed;
  logLine(state, `${state.player.name} uses a potion and heals ${healed} HP!`);
  enemyTurn(state);
}

export function playerCharm(state: BattleState): void {
  if (state.phase !== 'PlayerTurn') return;
  const success = chance(state.rng, state.player.charisma * 0.01);
  if (success) {
    state.phase = 'Charmed';
    logLine(state, `${state.enemy.name} is charmed and befriended!`);
    return;
  }
  logLine(state, `${state.player.name} tries to charm ${state.enemy.name}... it fails.`);
  enemyTurn(state);
}

export function isBattleOver(state: BattleState): boolean {
  return state.phase === 'Victory' || state.phase === 'Defeat' || state.phase === 'Charmed';
}
