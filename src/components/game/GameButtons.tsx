import React from 'react'

type Button = {
  id?: null | string
  label: string
  url: string
  variant?: 'primary' | 'secondary' | null
}

export const GameButtons: React.FC<{ buttons?: Button[] | null }> = ({ buttons }) => {
  if (!buttons?.length) return null

  return (
    <div className="flex flex-wrap gap-3">
      {buttons.map((button, i) => (
        <a
          className={
            button.variant === 'secondary'
              ? 'inline-flex items-center rounded-md border border-current px-5 py-2.5 font-medium transition-opacity hover:opacity-80'
              : 'inline-flex items-center rounded-md bg-(--game-accent,#111) px-5 py-2.5 font-medium text-white transition-opacity hover:opacity-90'
          }
          href={button.url}
          key={button.id ?? i}
          rel="noopener noreferrer"
          target="_blank"
        >
          {button.label}
        </a>
      ))}
    </div>
  )
}
