import React from 'react'
import { THEMES, FALLBACK_THEME } from '../constants'

export default function GameCard({
  game, sectionKey, onDetail, showHours,
  draggable, isDragging, isDropTarget,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const theme = THEMES[sectionKey] || FALLBACK_THEME
  const hours = showHours && game.hoursPlayed != null ? game.hoursPlayed : null

  const className = [
    'game-card',
    isDragging && 'game-card--dragging',
    isDropTarget && 'game-card--drag-over',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={className}
      style={{ '--theme-color': theme.color, '--theme-border': theme.border }}
      onClick={onDetail}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Cover — square */}
      <div className="card-cover-wrap">
        {game.cover
          ? (
            <img
              src={game.cover}
              alt={game.name}
              className="card-cover"
              loading="lazy"
              draggable={false}
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="card-cover-placeholder">🎮</div>
          )
        }

        {/* Hours overlay — only while the section is sorted by hours played */}
        {hours != null && (
          <span className="card-hours-badge" aria-label={`${hours} hours played`}>
            {hours}<span className="card-hours-unit">h</span>
          </span>
        )}
      </div>
    </div>
  )
}
