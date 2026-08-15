// Item generation. Two layers: consumables (temporary, used in battle) and
// permanent mutation items (rare, alter both stats and the unicorn's look).

import type { Combatant } from './battle';
import type { UnicornTraits } from '../render/unicorn';
import { COATS, PATTERNS, GLOW_SHAPES, rollManeStops, rollHornPalette } from '../render/unicorn';
import { PATTERN_COLORS } from '../render/shared';
import { pick, rangeInt } from './rng';

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

export const MUTATION_ITEMS: MutationItem[] = [
  {
    name: 'Unicorn Fruit',
    apply: (player, traits, rng) => {
      traits.hornPalette = rollHornPalette(rng);
      player.atk += 3;
      return 'Your horn glows with a new color and your strikes sharpen. (+3 ATK)';
    },
  },
  {
    name: 'Rainbow Nectar',
    apply: (player, traits, rng) => {
      traits.pattern = pick(rng, PATTERNS);
      traits.patternColor = pick(rng, PATTERN_COLORS);
      player.maxHp += 15;
      player.hp += 15;
      return `Your coat blooms with ${traits.pattern.toLowerCase()} and your vitality swells. (+15 Max HP)`;
    },
  },
  {
    name: 'Comet Shard',
    apply: (player, traits, rng) => {
      traits.glowColor = pick(rng, PATTERN_COLORS);
      traits.glowCount = rangeInt(rng, 2, 5);
      traits.glowShape = pick(rng, GLOW_SHAPES);
      player.atk += 1;
      player.def += 1;
      return `${traits.glowCount} glowing comet ${traits.glowShape.toLowerCase()}s now orbit you, sturdier all around. (+1 ATK, +1 DEF)`;
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
    name: 'Starlight Berry',
    apply: (player, traits, rng) => {
      traits.maneStops = rollManeStops(rng);
      player.charisma += 5;
      return 'Your mane recolors into shimmering new hues and your charm deepens. (+5 Charisma)';
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
