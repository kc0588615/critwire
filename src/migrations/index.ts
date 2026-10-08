import * as migration_20260707_125310_initial from './20260707_125310_initial';
import * as migration_20260707_132058_phase2_collections from './20260707_132058_phase2_collections';
import * as migration_20260707_142015_phase3_game_pages from './20260707_142015_phase3_game_pages';
import * as migration_20260707_225012_phase6_contact_jobs from './20260707_225012_phase6_contact_jobs';
import * as migration_20260712_065641_issues_orderable_and_tally_forms from './20260712_065641_issues_orderable_and_tally_forms';
import * as migration_20260712_082516_flagship_site_config from './20260712_082516_flagship_site_config';
import * as migration_20260926_030253_tenant_scoped_media_folders from './20260926_030253_tenant_scoped_media_folders';
import * as migration_20260926_042239_reconcile_issue_upvote_counts from './20260926_042239_reconcile_issue_upvote_counts';
import * as migration_20260926_054934_remove_website_template from './20260926_054934_remove_website_template';
import * as migration_20260926_055704_backfill_media_folder_tenants from './20260926_055704_backfill_media_folder_tenants';
import * as migration_20260929_074053_design_default_theme from './20260929_074053_design_default_theme';
import * as migration_20260930_060748_remove_site_generator from './20260930_060748_remove_site_generator';
import * as migration_20260930_061601_feedback_model from './20260930_061601_feedback_model';
import * as migration_20260930_072559_portal_theme from './20260930_072559_portal_theme';
import * as migration_20260930_080647_remove_landing_builder from './20260930_080647_remove_landing_builder';
import * as migration_20260930_111418_open_signup from './20260930_111418_open_signup';
import * as migration_20261002_144959_discord from './20261002_144959_discord';
import * as migration_20261002_160638_discord_update_posts from './20261002_160638_discord_update_posts';
import * as migration_20261002_161631_discord_stage_posts from './20261002_161631_discord_stage_posts';
import * as migration_20261004_225524_legal_acceptances from './20261004_225524_legal_acceptances';
import * as migration_20261004_234836_contact_job_sweep from './20261004_234836_contact_job_sweep';
import * as migration_20261005_000942_users_deleted from './20261005_000942_users_deleted';
import * as migration_20261005_001725_drop_submitter_email from './20261005_001725_drop_submitter_email';
import * as migration_20261007_123110_cw_typography_standard from './20261007_123110_cw_typography_standard';
import * as migration_20261007_125048_cw_portal_defaults from './20261007_125048_cw_portal_defaults';
import * as migration_20261008_063141_cc_portal_defaults from './20261008_063141_cc_portal_defaults';

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
    name: '20260926_030253_tenant_scoped_media_folders',
  },
  {
    up: migration_20260926_042239_reconcile_issue_upvote_counts.up,
    down: migration_20260926_042239_reconcile_issue_upvote_counts.down,
    name: '20260926_042239_reconcile_issue_upvote_counts',
  },
  {
    up: migration_20260926_054934_remove_website_template.up,
    down: migration_20260926_054934_remove_website_template.down,
    name: '20260926_054934_remove_website_template',
  },
  {
    up: migration_20260926_055704_backfill_media_folder_tenants.up,
    down: migration_20260926_055704_backfill_media_folder_tenants.down,
    name: '20260926_055704_backfill_media_folder_tenants',
  },
  {
    up: migration_20260929_074053_design_default_theme.up,
    down: migration_20260929_074053_design_default_theme.down,
    name: '20260929_074053_design_default_theme',
  },
  {
    up: migration_20260930_060748_remove_site_generator.up,
    down: migration_20260930_060748_remove_site_generator.down,
    name: '20260930_060748_remove_site_generator',
  },
  {
    up: migration_20260930_061601_feedback_model.up,
    down: migration_20260930_061601_feedback_model.down,
    name: '20260930_061601_feedback_model',
  },
  {
    up: migration_20260930_072559_portal_theme.up,
    down: migration_20260930_072559_portal_theme.down,
    name: '20260930_072559_portal_theme',
  },
  {
    up: migration_20260930_080647_remove_landing_builder.up,
    down: migration_20260930_080647_remove_landing_builder.down,
    name: '20260930_080647_remove_landing_builder',
  },
  {
    up: migration_20260930_111418_open_signup.up,
    down: migration_20260930_111418_open_signup.down,
    name: '20260930_111418_open_signup',
  },
  {
    up: migration_20261002_144959_discord.up,
    down: migration_20261002_144959_discord.down,
    name: '20261002_144959_discord',
  },
  {
    up: migration_20261002_160638_discord_update_posts.up,
    down: migration_20261002_160638_discord_update_posts.down,
    name: '20261002_160638_discord_update_posts',
  },
  {
    up: migration_20261002_161631_discord_stage_posts.up,
    down: migration_20261002_161631_discord_stage_posts.down,
    name: '20261002_161631_discord_stage_posts',
  },
  {
    up: migration_20261004_225524_legal_acceptances.up,
    down: migration_20261004_225524_legal_acceptances.down,
    name: '20261004_225524_legal_acceptances',
  },
  {
    up: migration_20261004_234836_contact_job_sweep.up,
    down: migration_20261004_234836_contact_job_sweep.down,
    name: '20261004_234836_contact_job_sweep',
  },
  {
    up: migration_20261005_000942_users_deleted.up,
    down: migration_20261005_000942_users_deleted.down,
    name: '20261005_000942_users_deleted',
  },
  {
    up: migration_20261005_001725_drop_submitter_email.up,
    down: migration_20261005_001725_drop_submitter_email.down,
    name: '20261005_001725_drop_submitter_email',
  },
  {
    up: migration_20261007_123110_cw_typography_standard.up,
    down: migration_20261007_123110_cw_typography_standard.down,
    name: '20261007_123110_cw_typography_standard',
  },
  {
    up: migration_20261007_125048_cw_portal_defaults.up,
    down: migration_20261007_125048_cw_portal_defaults.down,
    name: '20261007_125048_cw_portal_defaults',
  },
  {
    up: migration_20261008_063141_cc_portal_defaults.up,
    down: migration_20261008_063141_cc_portal_defaults.down,
    name: '20261008_063141_cc_portal_defaults'
  },
];
