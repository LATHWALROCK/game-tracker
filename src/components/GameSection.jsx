import React, { useMemo, useState } from 'react'
import GameCard from './GameCard'
import { THEMES, FALLBACK_THEME, isSortable } from '../constants'
import { SORT_MODES, sortGames, arrayMove } from '../utils/gameOrdering'

export default function GameSection({ sectionKey, section, onEdit, onDelete, onDetail, onReorder }) {
  const theme = THEMES[sectionKey] || FALLBACK_THEME
  const games = section.games || []
  const showSort = isSortable(sectionKey)

  const [sortMode, setSortMode] = useState('manual')
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const displayGames = useMemo(() => sortGames(games, sortMode), [games, sortMode])
  const dragEnabled = sortMode === 'manual' && games.length > 1

  const resetDrag = () => { setDragIdx(null); setOverIdx(null) }

  const handleDragStart = (idx, e) => {
    // Firefox requires dataTransfer.setData to be called for the drag to proceed at all.
    e.dataTransfer.setData('text/plain', String(idx))
    e.dataTransfer.effectAllowed = 'move'
    setDragIdx(idx)
  }

  const handleDrop = (e) => {
    // Without preventDefault, the browser's default drop action (e.g. opening the
    // dragged card as a navigation) runs instead of our reorder logic.
    e.preventDefault()
    if (dragIdx == null || overIdx == null || dragIdx === overIdx) { resetDrag(); return }
    onReorder(sectionKey, arrayMove(games, dragIdx, overIdx))
    resetDrag()
  }

  return (
    <section className="game-section">
      <h2 className="section-heading" style={{ borderLeftColor: theme.color }}>
        <span className="section-icon">{section.icon}</span>
        {section.label}
        <span className="section-count">{games.length}</span>
        {showSort && games.length > 0 && (
          <select
            className="section-sort"
            value={sortMode}
            onChange={e => setSortMode(e.target.value)}
            aria-label={`Sort ${section.label}`}
          >
            {SORT_MODES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        )}
      </h2>

      {games.length === 0 ? (
        <p className="section-empty">No games yet. Add one!</p>
      ) : (
        <div className="cards-grid">
          {displayGames.map((game, idx) => (
            <GameCard
              key={`${sectionKey}-${game.name}-${game.addedAt ?? idx}`}
              game={game}
              sectionKey={sectionKey}
              showHours={sortMode === 'hours'}
              onDetail={() => onDetail(game, sectionKey, games.indexOf(game))}
              draggable={dragEnabled}
              isDragging={dragIdx === idx}
              isDropTarget={overIdx === idx && dragIdx !== idx}
              onDragStart={e => handleDragStart(idx, e)}
              onDragOver={e => { e.preventDefault(); setOverIdx(idx) }}
              onDrop={handleDrop}
              onDragEnd={resetDrag}
            />
          ))}
        </div>
      )}
    </section>
  )
}
