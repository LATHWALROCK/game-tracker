import React, { useState, useEffect } from 'react'
import { HOURS_SECTIONS } from '../constants'
export default function GameModal({ isOpen, mode, sections, editData, onClose, onSubmit }) {
  const [section, setSection]   = useState('')
  const [name, setName]         = useState('')
  const [cover, setCover]       = useState('')
  const [hoursPlayed, setHours] = useState('')
  const [errors, setErrors]     = useState({})
  useEffect(() => {
    if (!isOpen) return
    if (mode === 'edit' && editData) {
      setSection(editData.sectionKey || '')
      setName(editData.game.name || '')
      setCover(editData.game.cover || '')
      setHours(editData.game.hoursPlayed != null ? String(editData.game.hoursPlayed) : '')
    } else {
      setSection(sections ? Object.keys(sections)[0] : '')
      setName(''); setCover(''); setHours('')
    }
    setErrors({})
  }, [isOpen, mode, editData, sections])
  if (!isOpen) return null
  const showHours = HOURS_SECTIONS.includes(section)
  const validate = () => {
    const e = {}
    if (!name.trim())  e.name  = 'Game name is required'
    if (!cover.trim()) e.cover = 'Cover URL is required'
    return e
  }
  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSubmit({ section, name: name.trim(), cover: cover.trim(),
      hoursPlayed: showHours && hoursPlayed !== '' ? Number(hoursPlayed) : undefined })
  }
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{mode === 'edit' ? 'Edit Game' : 'Add Game'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="gm-section">Section</label>
            <select id="gm-section" value={section} onChange={e => setSection(e.target.value)}>
              {sections && Object.entries(sections).map(([key, sec]) => (
                <option key={key} value={key}>{sec.icon} {sec.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="gm-name">Game Name</label>
            <input id="gm-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The Witcher 3" />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="gm-cover">Cover URL</label>
            <input id="gm-cover" type="url" value={cover} onChange={e => setCover(e.target.value)} placeholder="https://..." />
            {errors.cover && <span className="form-error">{errors.cover}</span>}
          </div>
          {showHours && (
            <div className="form-group">
              <label htmlFor="gm-hours">Hours Played</label>
              <input id="gm-hours" type="number" min="0" step="0.5" value={hoursPlayed}
                onChange={e => setHours(e.target.value)} placeholder="e.g. 42" />
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{mode === 'edit' ? 'Save Changes' : 'Add Game'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
