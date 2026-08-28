import React from 'react'
import { THEMES, FALLBACK_THEME, HOURS_SECTIONS } from '../constants'

export default function GameCard({
  game, sectionKey, onDetail,
  draggable, isDragging, isDropTarget,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const theme = THEMES[sectionKey] || FALLBACK_THEME
  const showHours = HOURS_SECTIONS.includes(sectionKey)

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
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="card-cover-placeholder">🎮</div>
          )
        }
      </div>

      {/* Body */}
      <div className="card-body">
        <p className="card-title">{game.name}</p>
        {showHours && game.hoursPlayed != null && (
          <p className="card-hours">
            <span className="card-hours-icon">⏱</span>
            {game.hoursPlayed}h
          </p>
        )}
      </div>
    </div>
  )
}
