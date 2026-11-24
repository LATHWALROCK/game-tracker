import React from 'react'
import { canBeNowPlaying, THEMES, FALLBACK_THEME } from '../constants'
import Cover from './Cover'

export default function NowPlaying({ data, onDetail }) {
  const items = []
  for (const [sectionKey, section] of Object.entries(data)) {
    if (sectionKey.startsWith('_') || !section?.games || !canBeNowPlaying(sectionKey)) continue
    const games = section.games || []
    games.forEach((game, idx) => {
      if (game.currentlyPlaying) items.push({ sectionKey, idx, game, label: section.label })
    })
  }

  if (items.length === 0) return null

  return (
    <div className="now-playing">
      <h2 className="now-playing-heading">
        <span className="now-playing-icon">▶</span> Now Playing
      </h2>

      <div className="now-playing-row">
        {items.map(({ sectionKey, idx, game, label }) => {
          const theme = THEMES[sectionKey] || FALLBACK_THEME
          const showHours = game.hoursPlayed != null

          return (
            <div
              key={`${sectionKey}-${idx}-${game.name}`}
              className="np-panel"
              onClick={() => onDetail(game, sectionKey, idx)}
            >
              {/* The cover doubles as its own backdrop — blurred, scaled past the
                  edges to hide blur bleed, and darkened by a scrim below. */}
              {game.cover && (
                <img className="np-backdrop" src={game.cover} alt="" aria-hidden="true"
                     referrerPolicy="no-referrer" />
              )}
              <div className="np-scrim" aria-hidden="true" />

              <div className="np-body">
                <div className="np-cover-wrap">
                  <Cover
                    src={game.cover}
                    alt={game.name}
                    className="np-cover"
                    placeholderClassName="np-cover-placeholder"
                  />
                </div>

                <div className="np-info">
                  <p className="np-name">{game.name}</p>
                  <p className="np-meta">
                    <span className="np-badge" style={{ color: theme.color, borderColor: theme.color }}>
                      {label || 'Game'}
                    </span>
                    {showHours && <span className="np-hours">{game.hoursPlayed}h</span>}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
