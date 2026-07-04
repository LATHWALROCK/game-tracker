import React from 'react'
import { THEMES, FALLBACK_THEME, HOURS_SECTIONS } from '../constants'

export default function DetailModal({ isOpen, game, sectionKey, onClose, onEdit, onDelete }) {
  if (!isOpen || !game) return null

  const theme = THEMES[sectionKey] || FALLBACK_THEME
  const showHours = HOURS_SECTIONS.includes(sectionKey) && game.hoursPlayed != null

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal modal--detail">

        <div className="detail-layout">

          {/* Cover */}
          <div className="detail-cover-wrap">
            {game.cover
              ? (
                <img
                  src={game.cover}
                  alt={game.name}
                  className="detail-cover"
                  onError={e => { e.target.style.display = 'none' }}
                />
              ) : (
                <div className="detail-cover-placeholder">🎮</div>
              )
            }
          </div>

          {/* Info */}
          <div className="detail-info">

            {/* Title */}
            <h2 className="detail-title">{game.name}</h2>

             <div class = "played">
                {/* Section badge */}
            <span
              className="detail-badge"
              style={{
                backgroundColor: theme.border,
                color: theme.color,
                borderColor: theme.color
              }}
            >
              {theme.label}
            </span>

            {/* Hours */}
            {showHours && (
              <div className="detail-hours">
                <span className="detail-hours-icon">⏱</span>
                <span>{game.hoursPlayed} hours played</span>
              </div>
            )}
             </div>

            {/* Divider */}
            <div className="detail-divider" />

            {/* Actions */}
            <div className="detail-actions">
              <button className="btn btn-primary detail-action-btn" onClick={onEdit}>
                <span>✏️</span> Edit Game
              </button>
              <button className="btn btn-danger detail-action-btn" onClick={onDelete}>
                <span>🗑</span> Delete
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
