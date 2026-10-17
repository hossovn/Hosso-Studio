import * as migration_20261016_175939_initial from './20261016_175939_initial';
import * as migration_20261016_190233_site_chrome from './20261016_190233_site_chrome';
import * as migration_20261016_192156_content_features from './20261016_192156_content_features';
import * as migration_20261017_031543_i18n_nav from './20261017_031543_i18n_nav';

export const migrations = [
  {
    up: migration_20261016_175939_initial.up,
    down: migration_20261016_175939_initial.down,
    name: '20261016_175939_initial',
  },
  {
    up: migration_20261016_190233_site_chrome.up,
    down: migration_20261016_190233_site_chrome.down,
    name: '20261016_190233_site_chrome',
  },
  {
    up: migration_20261016_192156_content_features.up,
    down: migration_20261016_192156_content_features.down,
    name: '20261016_192156_content_features',
  },
  {
    up: migration_20261017_031543_i18n_nav.up,
    down: migration_20261017_031543_i18n_nav.down,
    name: '20261017_031543_i18n_nav'
  },
];
