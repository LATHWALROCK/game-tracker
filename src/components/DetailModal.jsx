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

        {/* Close button */}
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="detail-layout">

          {/* Cover — square */}
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

            {/* Badge + Hours row */}
            <div className="detail-meta">
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

              {showHours && (
                <div className="detail-hours">
                  <span className="detail-hours-icon">⏱</span>
                  <span>{game.hoursPlayed}h played</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="detail-divider" />

            {/* Actions */}
            <div className="detail-actions">
              <button
                className="btn btn-primary detail-action-btn"
                onClick={onEdit}
              >
                <span>✏️</span> Edit Game
              </button>
              <button
                className="btn btn-danger detail-action-btn"
                onClick={onDelete}
              >
                <span>🗑</span> Delete
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
