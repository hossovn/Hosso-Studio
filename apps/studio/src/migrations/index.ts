import * as migration_20261030_120000_affiliate_cps from './20261030_120000_affiliate_cps';
import * as migration_20261020_090000_bookings_maintenance from './20261020_090000_bookings_maintenance';
import * as migration_20261016_175939_initial from './20261016_175939_initial';
import * as migration_20261016_190233_site_chrome from './20261016_190233_site_chrome';
import * as migration_20261016_192156_content_features from './20261016_192156_content_features';
import * as migration_20261017_020000_poc_data_snapshot from './20261017_020000_poc_data_snapshot';
import * as migration_20261017_031543_i18n_nav from './20261017_031543_i18n_nav';
import * as migration_20261017_034617_ops_features from './20261017_034617_ops_features';
import * as migration_20261017_042751_menu_tree from './20261017_042751_menu_tree';
import * as migration_20261017_050000_poc_data_restore from './20261017_050000_poc_data_restore';
import * as migration_20261018_103453_commerce_plugins from './20261018_103453_commerce_plugins';
import * as migration_20261019_082743_schema_2fa_jobs_shop_specs from './20261019_082743_schema_2fa_jobs_shop_specs';
import * as migration_20261019_091256_shop_wim_link_and_price_toggle from './20261019_091256_shop_wim_link_and_price_toggle';
import * as migration_20261019_092550_header_footer_layout from './20261019_092550_header_footer_layout';
import * as migration_20261019_120000_site_chrome_areas from './20261019_120000_site_chrome_areas';
import * as migration_20261021_011019_cross_sell from './20261021_011019_cross_sell';
import * as migration_20261030_110000_cross_sell_direct_credentials from './20261030_110000_cross_sell_direct_credentials';
import * as migration_20261030_130000_payload_job_stats from './20261030_130000_payload_job_stats';
import * as migration_20261030_140000_cross_sell_tracking from './20261030_140000_cross_sell_tracking';
import * as migration_20261030_150000_product_content from './20261030_150000_product_content';
import * as migration_20261031_090000_cross_sell_catalog_sync from './20261031_090000_cross_sell_catalog_sync';

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
    name: '20261018_103453_commerce_plugins',
  },
  {
    up: migration_20261019_082743_schema_2fa_jobs_shop_specs.up,
    down: migration_20261019_082743_schema_2fa_jobs_shop_specs.down,
    name: '20261019_082743_schema_2fa_jobs_shop_specs',
  },
  {
    up: migration_20261019_091256_shop_wim_link_and_price_toggle.up,
    down: migration_20261019_091256_shop_wim_link_and_price_toggle.down,
    name: '20261019_091256_shop_wim_link_and_price_toggle',
  },
  {
    up: migration_20261019_092550_header_footer_layout.up,
    down: migration_20261019_092550_header_footer_layout.down,
    name: '20261019_092550_header_footer_layout',
  },
  {
    up: migration_20261019_120000_site_chrome_areas.up,
    down: migration_20261019_120000_site_chrome_areas.down,
    name: '20261019_120000_site_chrome_areas',
  },
  {
    up: migration_20261020_090000_bookings_maintenance.up,
    down: migration_20261020_090000_bookings_maintenance.down,
    name: '20261020_090000_bookings_maintenance',
  },
  {
    up: migration_20261021_011019_cross_sell.up,
    down: migration_20261021_011019_cross_sell.down,
    name: '20261021_011019_cross_sell',
  },
  {
    up: migration_20261030_110000_cross_sell_direct_credentials.up,
    down: migration_20261030_110000_cross_sell_direct_credentials.down,
    name: '20261030_110000_cross_sell_direct_credentials',
  },
  { up: migration_20261030_120000_affiliate_cps.up, down: migration_20261030_120000_affiliate_cps.down, name: '20261030_120000_affiliate_cps' },
  { up: migration_20261030_130000_payload_job_stats.up, down: migration_20261030_130000_payload_job_stats.down, name: '20261030_130000_payload_job_stats' },
  { up: migration_20261030_140000_cross_sell_tracking.up, down: migration_20261030_140000_cross_sell_tracking.down, name: '20261030_140000_cross_sell_tracking' },
  { up: migration_20261030_150000_product_content.up, down: migration_20261030_150000_product_content.down, name: '20261030_150000_product_content' },
  { up: migration_20261031_090000_cross_sell_catalog_sync.up, down: migration_20261031_090000_cross_sell_catalog_sync.down, name: '20261031_090000_cross_sell_catalog_sync' },
];
