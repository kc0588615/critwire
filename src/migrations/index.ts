import * as migration_20260707_125310_initial from './20260707_125310_initial';
import * as migration_20260707_132058_phase2_collections from './20260707_132058_phase2_collections';
import * as migration_20260707_142015_phase3_game_pages from './20260707_142015_phase3_game_pages';
import * as migration_20260707_225012_phase6_contact_jobs from './20260707_225012_phase6_contact_jobs';
import * as migration_20260712_065641_issues_orderable_and_tally_forms from './20260712_065641_issues_orderable_and_tally_forms';
import * as migration_20260712_082516_flagship_site_config from './20260712_082516_flagship_site_config';
import * as migration_20260926_030253_tenant_scoped_media_folders from './20260926_030253_tenant_scoped_media_folders';

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
    name: '20260707_142015_phase3_game_pages',
  },
  {
    up: migration_20260707_225012_phase6_contact_jobs.up,
    down: migration_20260707_225012_phase6_contact_jobs.down,
    name: '20260707_225012_phase6_contact_jobs',
  },
  {
    up: migration_20260712_065641_issues_orderable_and_tally_forms.up,
    down: migration_20260712_065641_issues_orderable_and_tally_forms.down,
    name: '20260712_065641_issues_orderable_and_tally_forms',
  },
  {
    up: migration_20260712_082516_flagship_site_config.up,
    down: migration_20260712_082516_flagship_site_config.down,
    name: '20260712_082516_flagship_site_config',
  },
  {
    up: migration_20260926_030253_tenant_scoped_media_folders.up,
    down: migration_20260926_030253_tenant_scoped_media_folders.down,
    name: '20260926_030253_tenant_scoped_media_folders'
  },
];
