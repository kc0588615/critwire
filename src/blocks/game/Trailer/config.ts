import type { Block } from 'payload'

export const TrailerEmbed: Block = {
  slug: 'trailerEmbed',
  interfaceName: 'TrailerEmbedBlock',
  labels: {
    plural: 'Trailer Embeds',
    singular: 'Trailer Embed',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        description: 'YouTube or Vimeo video URL.',
      },
      required: true,
      validate: (value: null | string | string[] | undefined) => {
        if (typeof value !== 'string' || value === '') return 'A video URL is required.'
        try {
          const url = new URL(value)
          const host = url.hostname.replace(/^www\./, '')
          if (
            host === 'youtube.com' ||
            host === 'youtu.be' ||
            host === 'youtube-nocookie.com' ||
            host === 'vimeo.com' ||
            host === 'player.vimeo.com'
          ) {
            return true
          }
          return 'Only YouTube and Vimeo URLs are supported.'
        } catch {
          return 'Must be a valid URL.'
        }
      },
    },
  ],
}
