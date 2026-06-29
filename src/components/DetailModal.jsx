import React from 'react'
import { THEMES, FALLBACK_THEME, HOURS_SECTIONS } from '../constants'
export default function DetailModal({ isOpen, game, sectionKey, onClose, onEdit, onDelete }) {
  if (!isOpen || !game) return null
  const theme = THEMES[sectionKey] || FALLBACK_THEME
  const showHours = HOURS_SECTIONS.includes(sectionKey) && game.hoursPlayed != null
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal modal--detail">
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="detail-layout">
          <div className="detail-cover-wrap">
            {game.cover
              ? <img src={game.cover} alt={game.name} className="detail-cover" onError={e => { e.target.style.display='none' }} />
              : <div className="detail-cover-placeholder">🎮</div>}
          </div>
          <div className="detail-info">
            <h2 className="detail-title">{game.name}</h2>
            <span className="detail-badge" style={{ backgroundColor: theme.border, color: theme.color, borderColor: theme.color }}>
              {theme.label}
            </span>
            {showHours && (
              <div className="detail-hours">
                <span className="detail-hours-icon">⏱</span>
                <span>{game.hoursPlayed} hours played</span>
              </div>
            )}
            <div className="detail-actions">
              <button className="btn btn-primary" onClick={onEdit}>✏️ Edit</button>
              <button className="btn btn-danger" onClick={onDelete}>🗑 Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
