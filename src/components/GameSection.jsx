import React from 'react'
import GameCard from './GameCard'
import { THEMES, FALLBACK_THEME } from '../constants'

export default function GameSection({ sectionKey, section, onEdit, onDelete, onDetail }) {
  const theme = THEMES[sectionKey] || FALLBACK_THEME
  const games = section.games || []

  return (
    <section className="game-section">
      <h2 className="section-heading" style={{ borderLeftColor: theme.color }}>
        <span className="section-icon">{section.icon}</span>
        {section.label}
        <span className="section-count">{games.length}</span>
      </h2>

      {games.length === 0 ? (
        <p className="section-empty">No games yet. Add one!</p>
      ) : (
        <div className="cards-grid">
          {games.map((game, idx) => (
            <GameCard
              key={`${sectionKey}-${idx}`}
              game={game}
              sectionKey={sectionKey}
              onDetail={() => onDetail(game, sectionKey, idx)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
