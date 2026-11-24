import React, { useState, useEffect, useMemo } from 'react'
import { useOverlayClose } from '../hooks/useOverlayClose'

export default function SplitGameModal({ isOpen, bundleGame, library, onClose, onSaveSplit }) {
  const [subGames, setSubGames] = useState([
    { name: '', hours: '', sectionKey: 'played' },
    { name: '', hours: '', sectionKey: 'played' }
  ])
  const [errors, setErrors] = useState({})
  const overlayProps = useOverlayClose(onClose)

  const availableSections = useMemo(() => {
    if (!library) return []
    return Object.entries(library)
      .filter(([k, sec]) => !k.startsWith('_') && sec?.games)
      .map(([key, sec]) => ({ key, label: sec.label, icon: sec.icon }))
  }, [library])

  const existingLibraryGameNames = useMemo(() => {
    if (!library) return []
    const names = []
    for (const [k, sec] of Object.entries(library)) {
      if (k.startsWith('_') || !sec?.games) continue
      for (const g of sec.games) {
        if (g.name) names.push(g.name)
      }
    }
    return [...new Set(names)].sort()
  }, [library])

  const defaultSectionKey = availableSections.length > 0 ? availableSections[0].key : 'played'

  useEffect(() => {
    if (isOpen && bundleGame) {
      const initialHours = bundleGame.hoursPlayed || 0
      const halfHours = initialHours > 0 ? Math.round((initialHours / 2) * 10) / 10 : ''

      setSubGames([
        { name: '', hours: halfHours !== '' ? String(halfHours) : '', sectionKey: defaultSectionKey },
        { name: '', hours: halfHours !== '' ? String(halfHours) : '', sectionKey: defaultSectionKey }
      ])
      setErrors({})
    }
  }, [isOpen, bundleGame, defaultSectionKey])

  const handleAddRow = () => {
    setSubGames(prev => [...prev, { name: '', hours: '', sectionKey: defaultSectionKey }])
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
        errs[`name_${i}`] = 'Game title required'
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
        cover: bundleGame.cover || ''
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
              Divide <strong>"{bundleGame.name}"</strong> into individual titles. This collection bundle will never show again in PSN sync.
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

        {/* Datalist for autocomplete linking with existing games */}
        <datalist id="existing-games-datalist">
          {existingLibraryGameNames.map(name => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <form onSubmit={handleSubmit}>
          <div className="split-games-list">
            {subGames.map((game, idx) => (
              <div key={idx} className="split-game-row">
                <span className="split-row-num">{idx + 1}</span>

                {/* Game Title Input */}
                <div className="split-col-title">
                  <input
                    type="text"
                    list="existing-games-datalist"
                    placeholder="e.g. Uncharted: Drake's Fortune (type or pick from library)"
                    value={game.name}
                    onChange={e => handleFieldChange(idx, 'name', e.target.value)}
                    className="split-input"
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
                    step="0.5"
                    placeholder="Hours"
                    value={game.hours}
                    onChange={e => handleFieldChange(idx, 'hours', e.target.value)}
                    className="split-input split-input--hours"
                    title="Hours played"
                  />
                  <span className="split-hours-unit">h</span>
                </div>

                {/* Section Selector */}
                <div className="split-col-section">
                  <select
                    value={game.sectionKey}
                    onChange={e => handleFieldChange(idx, 'sectionKey', e.target.value)}
                    className="split-select"
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
      </div>
    </div>
  )
}
