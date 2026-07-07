import * as migration_20260707_125310_initial from './20260707_125310_initial';
import * as migration_20260707_132058_phase2_collections from './20260707_132058_phase2_collections';
import * as migration_20260707_142015_phase3_game_pages from './20260707_142015_phase3_game_pages';

export const migrations = [
  {
    up: migration_20260707_125310_initial.up,
    down: migration_20260707_125310_initial.down,
    name: '20260707_125310_initial',
  },
  {
    up: migration_20260707_132058_phase2_collections.up,
    down: migration_20260707_132058_phase2_collections.down,
    name: '20260707_132058_phase2_collections',
  },
  {
    up: migration_20260707_142015_phase3_game_pages.up,
    down: migration_20260707_142015_phase3_game_pages.down,
    name: '20260707_142015_phase3_game_pages'
  },
];
