import pino from 'pino'

const redact = [
  'req.headers.authorization',
  'headers.authorization',
  '*.password',
  '*.token',
  '*.secret',
  '*.apiKey',
  '*.discordWebhookUrl',
  '*.RESEND_API_KEY',
  '*.TURNSTILE_SECRET_KEY',
]

export const logger = pino({
  base: {
    app: 'critwire',
    env: process.env.NODE_ENV ?? 'development',
  },
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact,
})

export const getLogger = (module: string) => logger.child({ module })
