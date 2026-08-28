import React from 'react'

export default function NowPlaying({ data, onDetail }) {
  const items = []
  for (const [sectionKey, section] of Object.entries(data)) {
    const games = section.games || []
    games.forEach((game, idx) => {
      if (game.currentlyPlaying) items.push({ sectionKey, idx, game })
    })
  }

  if (items.length === 0) return null

  return (
    <div className="now-playing">
      <h2 className="now-playing-heading">
        <span className="now-playing-icon">▶</span> Now Playing
      </h2>
      <div className="now-playing-row">
        {items.map(({ sectionKey, idx, game }) => (
          <div
            key={`${sectionKey}-${idx}-${game.name}`}
            className="now-playing-item"
            onClick={() => onDetail(game, sectionKey, idx)}
          >
            <div className="now-playing-cover-wrap">
              {game.cover
                ? (
                  <img
                    src={game.cover}
                    alt={game.name}
                    className="now-playing-cover"
                    loading="lazy"
                    draggable={false}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ) : (
                  <div className="now-playing-cover-placeholder">🎮</div>
                )
              }
            </div>
            <p className="now-playing-name">{game.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
