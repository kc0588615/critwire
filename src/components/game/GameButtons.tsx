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
          className={button.variant === 'secondary' ? 'cc-button-secondary' : 'cc-button-primary'}
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
