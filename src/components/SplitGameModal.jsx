import React, { useState, useEffect, useMemo, useRef } from 'react'
import Cover from './Cover'
import { normalizeTitle } from '../utils/psnDiff'
import { useOverlayClose } from '../hooks/useOverlayClose'

/**
 * Dropdown selector that ONLY shows existing games from the user's library,
 * featuring cover art thumbnails, section badges, and quick search.
 */
function GamePickerDropdown({ selectedName, libraryGames, onSelect, error, onOpenChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [openUpwards, setOpenUpwards] = useState(false)
  const dropdownRef = useRef(null)

  const handleToggle = (open) => {
    setIsOpen(open)
    if (onOpenChange) onOpenChange(open)
  }

  const selectedGame = useMemo(() => {
    if (!selectedName) return null
    return libraryGames.find(g => g.name.toLowerCase() === selectedName.toLowerCase()) || null
  }, [selectedName, libraryGames])

  const filteredGames = useMemo(() => {
    if (!search.trim()) return libraryGames
    const q = search.toLowerCase().trim()
    return libraryGames.filter(g => g.name.toLowerCase().includes(q))
  }, [libraryGames, search])

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      // If limited space below and more space above, open upwards
      if (spaceBelow < 280 && rect.top > spaceBelow) {
        setOpenUpwards(true)
      } else {
        setOpenUpwards(false)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        handleToggle(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div
      className={`game-picker-dropdown ${isOpen ? 'game-picker-dropdown--open' : ''} ${error ? 'game-picker-dropdown--error' : ''}`}
      ref={dropdownRef}
    >
      <button
        type="button"
        className={`game-picker-trigger ${selectedGame ? 'game-picker-trigger--selected' : ''}`}
        onClick={() => handleToggle(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedGame ? (
          <div className="game-picker-selected-item">
            <Cover
              src={selectedGame.cover}
              alt={selectedGame.name}
              className="game-picker-thumb"
              placeholderClassName="game-picker-thumb-placeholder"
            />
            <div className="game-picker-item-details">
              <span className="game-picker-title">{selectedGame.name}</span>
              <span className="game-picker-sub">
                {selectedGame.sectionIcon} {selectedGame.sectionLabel} • ⏱ {selectedGame.hoursPlayed || 0}h
              </span>
            </div>
          </div>
        ) : (
          <span className="game-picker-placeholder">
            🎮 Choose an existing game from your library…
          </span>
        )}
        <span className="game-picker-arrow">{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div
          className={`game-picker-popover ${openUpwards ? 'game-picker-popover--upwards' : ''}`}
          role="listbox"
        >
          <div className="game-picker-search-wrap">
            <input
              type="text"
              className="game-picker-search-input"
              placeholder="Search library games…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              onClick={e => e.stopPropagation()}
            />
            {search && (
              <button
                type="button"
                className="game-picker-search-clear"
                onClick={(e) => {
                  e.stopPropagation()
                  setSearch('')
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="game-picker-list">
            {filteredGames.length === 0 ? (
              <div className="game-picker-empty">
                {search ? 'No matching games found' : 'No games found in library'}
              </div>
            ) : (
              filteredGames.map((g) => {
                const isCurrent = selectedName && g.name.toLowerCase() === selectedName.toLowerCase()
                return (
                  <button
                    key={`${g.sectionKey}-${g.name}-${g.idx}`}
                    type="button"
                    className={`game-picker-option ${isCurrent ? 'game-picker-option--active' : ''}`}
                    onClick={() => {
                      onSelect(g)
                      handleToggle(false)
                      setSearch('')
                    }}
                    role="option"
                    aria-selected={isCurrent}
                  >
                    <Cover
                      src={g.cover}
                      alt={g.name}
                      className="game-picker-option-thumb"
                      placeholderClassName="game-picker-option-thumb-placeholder"
                    />
                    <div className="game-picker-option-info">
                      <span className="game-picker-option-title">{g.name}</span>
                      <span className="game-picker-option-meta">
                        {g.sectionIcon} {g.sectionLabel} • ⏱ {g.hoursPlayed || 0}h in library
                      </span>
                    </div>
                    {isCurrent && <span className="game-picker-check">✓</span>}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function SplitGameModal({ isOpen, bundleGame, library, onClose, onSaveSplit }) {
  const [subGames, setSubGames] = useState([
    { name: '', cover: '', hours: '', sectionKey: 'played' },
    { name: '', cover: '', hours: '', sectionKey: 'played' }
  ])
  const [errors, setErrors] = useState({})
  const [openDropdownIdx, setOpenDropdownIdx] = useState(null)
  const overlayProps = useOverlayClose(onClose)

  const availableSections = useMemo(() => {
    if (!library) return []
    return Object.entries(library)
      .filter(([k, sec]) => !k.startsWith('_') && sec?.games)
      .map(([key, sec]) => ({ key, label: sec.label, icon: sec.icon }))
  }, [library])

  // Extract all existing games from the library with their covers, section, and current playtime
  const existingLibraryGames = useMemo(() => {
    if (!library) return []
    const list = []
    for (const [sectionKey, sec] of Object.entries(library)) {
      if (sectionKey.startsWith('_') || !sec?.games) continue
      for (let idx = 0; idx < sec.games.length; idx++) {
        const g = sec.games[idx]
        if (g && g.name) {
          list.push({
            name: g.name,
            cover: g.cover || '',
            hoursPlayed: g.hoursPlayed || 0,
            sectionKey,
            sectionLabel: sec.label || sectionKey,
            sectionIcon: sec.icon || '🎮',
            idx
          })
        }
      }
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [library])

  const defaultSectionKey = availableSections.length > 0 ? availableSections[0].key : 'played'

  useEffect(() => {
    if (isOpen && bundleGame) {
      const norm = normalizeTitle(bundleGame.name)
      const existingMapping = library?._psn_mappings?.[norm] || library?._psn_mappings?.[bundleGame.name]

      if (existingMapping?.type === 'split' && Array.isArray(existingMapping.games)) {
        setSubGames(
          existingMapping.games.map(g => ({
            name: g.name,
            cover: g.cover || '',
            hours: g.hours != null ? String(g.hours) : '',
            sectionKey: g.sectionKey || defaultSectionKey
          }))
        )
      } else {
        const initialHours = bundleGame.hoursPlayed || 0
        const halfHours = initialHours > 0 ? Math.round((initialHours / 2) * 10) / 10 : ''

        setSubGames([
          { name: '', cover: '', hours: halfHours !== '' ? String(halfHours) : '', sectionKey: defaultSectionKey },
          { name: '', cover: '', hours: halfHours !== '' ? String(halfHours) : '', sectionKey: defaultSectionKey }
        ])
      }
      setErrors({})
    }
  }, [isOpen, bundleGame, library, defaultSectionKey])

  const handleAddRow = () => {
    setSubGames(prev => [...prev, { name: '', cover: '', hours: '', sectionKey: defaultSectionKey }])
  }

  const handleRemoveRow = (idx) => {
    if (subGames.length <= 2) return
    setSubGames(prev => prev.filter((_, i) => i !== idx))
  }

  const handleFieldChange = (idx, field, value) => {
    setSubGames(prev =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    )
  }

  const handleSelectGame = (idx, libGame) => {
    setSubGames(prev =>
      prev.map((item, i) => {
        if (i !== idx) return item
        if (!libGame) {
          return { ...item, name: '', cover: '', sectionKey: defaultSectionKey }
        }
        return {
          ...item,
          name: libGame.name,
          cover: libGame.cover || '',
          sectionKey: libGame.sectionKey || item.sectionKey
        }
      })
    )
    setErrors(prev => {
      const next = { ...prev }
      delete next[`name_${idx}`]
      return next
    })
  }

  const handleSplitEvenly = () => {
    const totalHours = bundleGame?.hoursPlayed || 0
    if (totalHours <= 0 || subGames.length === 0) return
    const perGame = Math.round((totalHours / subGames.length) * 10) / 10
    setSubGames(prev => prev.map(g => ({ ...g, hours: String(perGame) })))
  }

  const validate = () => {
    const errs = {}
    subGames.forEach((g, i) => {
      if (!g.name.trim()) {
        errs[`name_${i}`] = 'Please select a game from your library'
      }
    })
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    const mapping = {
      originalTitle: bundleGame.name,
      type: 'split',
      createdAt: Date.now(),
      games: subGames.map(g => ({
        name: g.name.trim(),
        hours: g.hours !== '' ? Number(g.hours) : undefined,
        sectionKey: g.sectionKey,
        cover: g.cover || bundleGame.cover || ''
      }))
    }

    onSaveSplit(bundleGame.name, mapping)
    onClose()
  }

  if (!isOpen || !bundleGame) return null

  return (
    <div className="modal-overlay" {...overlayProps}>
      <div className="modal modal--split-game">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              <span className="split-icon" aria-hidden="true">✂️</span> Divide Collection
            </h2>
            <p className="modal-subtitle">
              Divide <strong>"{bundleGame.name}"</strong> into games already in your library.
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Total Playtime Callout */}
        <div className="split-hours-banner">
          <div className="split-hours-stat">
            <span className="split-hours-label">Total Recorded on PSN:</span>
            <span className="split-hours-val">{bundleGame.hoursPlayed || 0}h</span>
          </div>
          {bundleGame.hoursPlayed > 0 && subGames.length > 0 && (
            <button
              type="button"
              className="btn btn-tiny btn-ghost"
              onClick={handleSplitEvenly}
              title="Evenly divide the total hours across all sub-games"
            >
              Divide Hours Evenly
            </button>
          )}
        </div>

        {existingLibraryGames.length === 0 ? (
          <div className="game-picker-empty" style={{ padding: '2rem 1rem' }}>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>
              No games in your library yet
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Add individual games to your library first, then you can divide collections into them.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="split-games-list">
              {subGames.map((game, idx) => (
                <div key={idx} className={`split-game-row ${openDropdownIdx === idx ? 'split-game-row--open' : ''}`}>
                  <span className="split-row-num">{idx + 1}</span>

                  {/* Existing Game Dropdown with Image */}
                  <div className="split-col-title">
                    <GamePickerDropdown
                      selectedName={game.name}
                      libraryGames={existingLibraryGames}
                      onSelect={(libGame) => handleSelectGame(idx, libGame)}
                      error={errors[`name_${idx}`]}
                      onOpenChange={(open) => setOpenDropdownIdx(open ? idx : null)}
                    />
                    {errors[`name_${idx}`] && (
                      <span className="form-error">{errors[`name_${idx}`]}</span>
                    )}
                  </div>

                  {/* Hours Input */}
                  <div className="split-col-hours">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Hours"
                      value={game.hours}
                      onChange={e => handleFieldChange(idx, 'hours', e.target.value)}
                      className="split-input split-input--hours"
                      title="Playtime hours for this title"
                    />
                    <span className="split-hours-unit">h</span>
                  </div>

                  {/* Section Selector */}
                  <div className="split-col-section">
                    <select
                      value={game.sectionKey}
                      onChange={e => handleFieldChange(idx, 'sectionKey', e.target.value)}
                      className="split-select"
                      title="Library Section"
                    >
                      {availableSections.map(sec => (
                        <option key={sec.key} value={sec.key}>
                          {sec.icon} {sec.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    className="split-del-btn"
                    onClick={() => handleRemoveRow(idx)}
                    disabled={subGames.length <= 2}
                    title="Remove game"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="split-add-btn-wrap">
              <button
                type="button"
                className="btn btn-tiny btn-ghost"
                onClick={handleAddRow}
              >
                + Add Another Game to Split
              </button>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Split & Map ({subGames.length} Games)
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
