import React from 'react'

/**
 * First-load placeholder. Section labels aren't known until the fetch resolves,
 * so this renders a generic shape — and reuses the real `.cards-grid` rule so
 * the geometry matches exactly and nothing shifts when real data swaps in.
 */
export default function Skeleton({ sections = 2, cards = 8 }) {
  return (
    <>
      <p className="sr-only" role="status">Loading your library…</p>

      <div className="skeleton-wrap" aria-hidden="true">
        {Array.from({ length: sections }).map((_, s) => (
          <section className="game-section" key={s}>
            <div className="section-header">
              <div className="section-header-row">
                <span className="sk sk-tile" />
                <div className="section-titles">
                  <span className="sk sk-line sk-line--title" />
                  <span className="sk sk-line sk-line--sub" />
                </div>
              </div>
              <div className="section-rule" />
            </div>

            <div className="cards-grid">
              {Array.from({ length: cards }).map((_, c) => (
                <span className="sk sk-card" key={c} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
