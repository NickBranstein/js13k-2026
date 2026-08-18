// Player leveling. Stats grow from battle XP rather than staying static —
// this is what lets a run survive past the mid-teens of floor depth instead
// of the monster stat curve permanently outpacing a fixed player.

import type { Combatant } from './battle';
import type { MonsterTraits } from './monster';

export interface Progression {
  level: number;
  xp: number;
}

export function createProgression(): Progression {
  return { level: 1, xp: 0 };
}

function xpToNext(level: number): number {
  return 20 + (level - 1) * 15;
}

export function xpForMonster(m: MonsterTraits): number {
  const base = Math.round(m.maxHp * 0.4 + m.atk * 1.5 + m.def);
  return m.isBoss ? base * 2 : base;
}

export interface LevelUpResult {
  levelsGained: number;
  messages: string[];
}

// Mutates progression and player in place; returns log lines to surface to the player.
export function grantXp(progression: Progression, player: Combatant, xpGain: number): LevelUpResult {
  progression.xp += xpGain;
  const messages: string[] = [`Gained ${xpGain} XP.`];
  let levelsGained = 0;

  while (progression.xp >= xpToNext(progression.level)) {
    progression.xp -= xpToNext(progression.level);
    progression.level += 1;
    levelsGained += 1;

    player.maxHp += 8;
    player.hp += 8;
    player.atk += 2;
    player.def += 1;

    messages.push(`${player.name} reached level ${progression.level}! Stats increased.`);
  }

  return { levelsGained, messages };
}
