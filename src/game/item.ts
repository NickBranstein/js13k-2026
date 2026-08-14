// Item generation. Two layers: consumables (temporary, used in battle) and
// permanent mutation items (rare, alter both stats and the unicorn's look).

import type { Combatant } from './battle';
import type { UnicornTraits } from '../render/unicorn';
import { COATS, MANE_MOODS, AURA_TYPES } from '../render/unicorn';
import { pick } from './rng';

// Not every fight should reward a consumable — this keeps Item scarce enough
// to be a real choice rather than a free extra action every battle.
export const CONSUMABLE_DROP_CHANCE = 0.35;

// Treasure rooms have a small chance to also surface a mutation item on top
// of the usual heal.
export const TREASURE_MUTATION_CHANCE = 0.2;

interface MutationItem {
  name: string;
  apply: (player: Combatant, traits: UnicornTraits, rng: () => number) => string;
}

const MUTATION_ITEMS: MutationItem[] = [
  {
    name: 'Unicorn Fruit',
    apply: (player, traits) => {
      traits.hornTurns += 1;
      player.atk += 3;
      return 'Your horn grows another spiral turn and your strikes sharpen. (+3 ATK)';
    },
  },
  {
    name: 'Rainbow Nectar',
    apply: (player, traits, rng) => {
      traits.aura = pick(rng, AURA_TYPES);
      player.maxHp += 15;
      player.hp += 15;
      return `Your aura shifts to a ${traits.aura} and your vitality swells. (+15 Max HP)`;
    },
  },
  {
    name: 'Comet Shard',
    apply: (player, traits) => {
      traits.scale += 0.06;
      player.atk += 1;
      player.def += 1;
      return 'You grow slightly larger and sturdier all around. (+1 ATK, +1 DEF)';
    },
  },
  {
    name: 'Moonpetal Bloom',
    apply: (player, traits, rng) => {
      traits.coat = pick(rng, COATS);
      player.def += 3;
      return `Your coat shifts to ${traits.coat.name} and your hide toughens. (+3 DEF)`;
    },
  },
  {
    name: 'Starlight Mane',
    apply: (player, traits, rng) => {
      const mood = pick(rng, MANE_MOODS);
      traits.mood = mood;
      traits.maneStops = mood.stops;
      player.charisma += 5;
      return `Your mane recolors into a ${mood.name} and your charm deepens. (+5 Charisma)`;
    },
  },
];

export interface MutationResult {
  name: string;
  detail: string;
}

// Mutates player and traits in place; returns what to show on the reveal screen.
export function rollMutationItem(rng: () => number, player: Combatant, traits: UnicornTraits): MutationResult {
  const item = pick(rng, MUTATION_ITEMS);
  const detail = item.apply(player, traits, rng);
  return { name: item.name, detail };
}
