import * as migration_20261016_175939_initial from './20261016_175939_initial';

export const migrations = [
  {
    up: migration_20261016_175939_initial.up,
    down: migration_20261016_175939_initial.down,
    name: '20261016_175939_initial'
  },
];
