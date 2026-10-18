import * as migration_20261016_175939_initial from './20261016_175939_initial';
import * as migration_20261016_190233_site_chrome from './20261016_190233_site_chrome';
import * as migration_20261016_192156_content_features from './20261016_192156_content_features';
import * as migration_20261017_020000_poc_data_snapshot from './20261017_020000_poc_data_snapshot';
import * as migration_20261017_031543_i18n_nav from './20261017_031543_i18n_nav';
import * as migration_20261017_034617_ops_features from './20261017_034617_ops_features';
import * as migration_20261017_042751_menu_tree from './20261017_042751_menu_tree';
import * as migration_20261017_050000_poc_data_restore from './20261017_050000_poc_data_restore';
import * as migration_20261018_103453_commerce_plugins from './20261018_103453_commerce_plugins';

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
    up: migration_20261017_020000_poc_data_snapshot.up,
    down: migration_20261017_020000_poc_data_snapshot.down,
    name: '20261017_020000_poc_data_snapshot',
  },
  {
    up: migration_20261017_031543_i18n_nav.up,
    down: migration_20261017_031543_i18n_nav.down,
    name: '20261017_031543_i18n_nav',
  },
  {
    up: migration_20261017_034617_ops_features.up,
    down: migration_20261017_034617_ops_features.down,
    name: '20261017_034617_ops_features',
  },
  {
    up: migration_20261017_042751_menu_tree.up,
    down: migration_20261017_042751_menu_tree.down,
    name: '20261017_042751_menu_tree',
  },
  {
    up: migration_20261017_050000_poc_data_restore.up,
    down: migration_20261017_050000_poc_data_restore.down,
    name: '20261017_050000_poc_data_restore',
  },
  {
    up: migration_20261018_103453_commerce_plugins.up,
    down: migration_20261018_103453_commerce_plugins.down,
    name: '20261018_103453_commerce_plugins'
  },
];
