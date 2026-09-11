import React, { useMemo, useState } from 'react'
import GameCard from './GameCard'
import Select from './Select'
import { THEMES, FALLBACK_THEME, isSortable } from '../constants'
import { SORT_MODES, sortGames, arrayMove } from '../utils/gameOrdering'

export default function GameSection({ sectionKey, section, onDelete, onDetail, onReorder, onAddToSection }) {
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
      <header
        className="section-header"
        style={{ '--theme-color': theme.color, '--theme-border': theme.border }}
      >
        <div className="section-header-row">
          <span className="section-icon-tile" aria-hidden="true">{section.icon}</span>

          <div className="section-titles">
            <h2 className="section-title">{section.label}</h2>
            <span className="section-count">
              {games.length} {games.length === 1 ? 'game' : 'games'}
            </span>
          </div>

          {showSort && games.length > 0 && (
            <div className="section-sort">
              <Select
                value={sortMode}
                options={SORT_MODES}
                onChange={setSortMode}
                label={`Sort ${section.label}`}
              />
            </div>
          )}
        </div>

        <div className="section-rule" />
      </header>

      {games.length === 0 ? (
        <div className="section-empty" style={{ '--theme-color': theme.color, '--theme-border': theme.border }}>
          <span className="section-empty-icon" aria-hidden="true">{section.icon}</span>
          <p className="section-empty-text">No games in {section.label} yet</p>
          <button className="btn btn-ghost" onClick={onAddToSection}>+ Add a game</button>
        </div>
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
