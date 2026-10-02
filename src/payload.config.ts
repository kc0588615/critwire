import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { isSuperAdmin, superAdminOnly } from './access/isSuperAdmin'
import type { User } from './payload-types'
import { AbuseReports } from './collections/AbuseReports'
import { DiscordPosts } from './collections/DiscordPosts'
import { GameProjects } from './collections/GameProjects'
import { IssueReports } from './collections/IssueReports'
import { Issues } from './collections/Issues'
import { IssueVotes } from './collections/IssueVotes'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { PatchNotes } from './collections/PatchNotes'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { emailAdapter } from './lib/email/adapter'
import { discordWebhookContactTask, emailContactFormTask } from './jobs/contact'
import { discordUpdatePostTask } from './jobs/discord'
import { isDiscordOn } from './lib/discord/config'
import { DISCORD_QUEUE } from './lib/discord/posts'
import { migrations } from './migrations'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // Above the sign-in form: the welcome line, and signup when it's open.
      beforeLogin: ['@/components/BeforeLogin'],
      // The top of the dashboard, by role (§13).
      beforeDashboard: ['@/components/BeforeDashboard'],
      graphics: {
        Icon: '@/components/admin/Icon',
        Logo: '@/components/admin/Logo',
      },
      views: {
        // Password recovery goes through Turnstile and rate limits (§4a).
        forgot: { Component: '@/components/admin/ForgotPasswordView' },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      icons: [
        { rel: 'icon', sizes: '32x32', url: '/favicon.ico' },
        { rel: 'icon', type: 'image/svg+xml', url: '/favicon.svg' },
      ],
      titleSuffix: ' | Critwire',
    },
    user: Users.slug,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  db: postgresAdapter({
    // In production DATABASE_URL points at PgBouncer (transaction mode),
    // not Postgres directly. node-postgres is compatible with transaction
    // pooling as long as no session state is assumed — keep it that way.
    pool: {
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX ?? 20),
    },
    // Runs pending migrations automatically on boot in production —
    // required because the standalone Docker image has no payload CLI.
    prodMigrations: migrations,
  }),
  collections: [
    Tenants,
    GameProjects,
    PatchNotes,
    Issues,
    IssueReports,
    IssueVotes,
    Pages,
    Media,
    Users,
    AbuseReports,
    DiscordPosts,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  email: emailAdapter(),
  plugins,
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      // Super admins, or the scheduler's `CRON_SECRET` bearer. Studio
      // users must not trigger queue runs.
      run: ({ req }: { req: PayloadRequest }): boolean => {
        if (isSuperAdmin(req.user)) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        return req.headers.get('authorization') === `Bearer ${secret}`
      },
    },
    // Jobs hold every studio's queued contact messages, so the REST
    // collection is super-admin only; super admins see it in the admin
    // to recover failed deliveries. The queue itself uses the Local API.
    jobsCollectionOverrides: ({ defaultJobsCollection }) => ({
      ...defaultJobsCollection,
      access: {
        create: superAdminOnly,
        delete: superAdminOnly,
        read: superAdminOnly,
        update: superAdminOnly,
      },
      admin: {
        ...defaultJobsCollection.admin,
        // The admin passes the serialized client user; `roles` is on it.
        hidden: ({ user }) => !isSuperAdmin(user as User),
      },
    }),
    // Single-VPS deployment: queued contact jobs are run explicitly by
    // the submit handler after enqueueing, and this autorun is a backup
    // for transient failures or process restarts.
    // Adds `concurrency_key`: Discord post jobs supersede the pending
    // post for the same update or item, so quick changes become one post.
    enableConcurrencyControl: true,
    // Discord posts have their own queue, run only where Discord is on:
    // servers sharing a database (E2E's two) never complete a post unsent.
    // At most 10 a minute keeps a webhook under Discord's 30.
    autoRun: () => [
      { cron: '* * * * *', limit: 10, queue: 'default' },
      ...(isDiscordOn() ? [{ cron: '* * * * *', limit: 10, queue: DISCORD_QUEUE }] : []),
    ],
    tasks: [emailContactFormTask, discordWebhookContactTask, discordUpdatePostTask],
  },
})
