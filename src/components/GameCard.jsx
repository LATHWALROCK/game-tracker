import React, { useState } from 'react'
import { THEMES, FALLBACK_THEME, HOURS_SECTIONS } from '../constants'
export default function GameCard({ game, sectionKey, onEdit, onDelete, onDetail }) {
  const [hover, setHover] = useState(false)
  const theme = THEMES[sectionKey] || FALLBACK_THEME
  const showHours = HOURS_SECTIONS.includes(sectionKey)
  return (
    <div className="game-card" style={{ borderColor: theme.border }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onDetail}>
      {hover && (
        <div className="card-actions">
          <button className="card-action-btn" onClick={e => { e.stopPropagation(); onEdit() }}>✏️</button>
          <button className="card-action-btn card-action-btn--delete" onClick={e => { e.stopPropagation(); onDelete() }}>🗑</button>
        </div>
      )}
      <div className="card-cover-wrap">
        {game.cover
          ? <img src={game.cover} alt={game.name} className="card-cover" loading="lazy" onError={e => { e.target.style.display='none' }} />
          : <div className="card-cover-placeholder">🎮</div>}
      </div>
      <div className="card-body">
        <p className="card-title">{game.name}</p>
        {showHours && game.hoursPlayed != null && <p className="card-hours">{game.hoursPlayed}h played</p>}
      </div>
    </div>
  )
}
