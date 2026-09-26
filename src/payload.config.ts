import { postgresAdapter } from '@payloadcms/db-postgres'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { isSuperAdmin, superAdminOnly } from './access/isSuperAdmin'
import type { User } from './payload-types'
import { Categories } from './collections/Categories'
import { GamePages } from './collections/GamePages'
import { GameProjects } from './collections/GameProjects'
import { IssueReports } from './collections/IssueReports'
import { Issues } from './collections/Issues'
import { IssueVotes } from './collections/IssueVotes'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { PatchNotes } from './collections/PatchNotes'
import { Posts } from './collections/Posts'
import { Tenants } from './collections/Tenants'
import { Users } from './collections/Users'
import { discordWebhookContactTask, emailContactFormTask } from './jobs/contact'
import { migrations } from './migrations'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
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
    GamePages,
    PatchNotes,
    Issues,
    IssueReports,
    IssueVotes,
    Pages,
    Posts,
    Media,
    Categories,
    Users,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
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
    autoRun: [{ cron: '* * * * *', limit: 10, queue: 'default' }],
    tasks: [emailContactFormTask, discordWebhookContactTask],
  },
})
