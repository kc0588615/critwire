import * as migration_20260707_125310_initial from './20260707_125310_initial';

export const migrations = [
  {
    up: migration_20260707_125310_initial.up,
    down: migration_20260707_125310_initial.down,
    name: '20260707_125310_initial'
  },
];
