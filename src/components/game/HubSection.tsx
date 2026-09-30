import React from 'react'

/**
 * One section of the hub below its header: an h2 the section is
 * labelled by, then its content. The header owns the page's h1, and
 * item titles inside a section are h3s.
 */
export const HubSection: React.FC<{ children: React.ReactNode; heading: string; id: string }> = ({
  children,
  heading,
  id,
}) => (
  <section aria-labelledby={id} className="fs-section">
    <div className="fs-shell">
      <div className="fs-column-wide">
        <h2 className="fs-h2 fs-section-head" id={id}>
          {heading}
        </h2>
        {children}
      </div>
    </div>
  </section>
)
