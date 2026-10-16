import * as migration_20261016_175939_initial from './20261016_175939_initial';
import * as migration_20261016_190233_site_chrome from './20261016_190233_site_chrome';

export const migrations = [
  {
    up: migration_20261016_175939_initial.up,
    down: migration_20261016_175939_initial.down,
    name: '20261016_175939_initial',
  },
  {
    up: migration_20261016_190233_site_chrome.up,
    down: migration_20261016_190233_site_chrome.down,
    name: '20261016_190233_site_chrome'
  },
];
