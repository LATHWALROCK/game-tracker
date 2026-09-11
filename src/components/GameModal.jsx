import React, { useState, useEffect } from 'react'
import { HOURS_SECTIONS } from '../constants'
import Select from './Select'
import Cover from './Cover'
import { useOverlayClose } from '../hooks/useOverlayClose'

export default function GameModal({ isOpen, mode, sections, editData, presetSection, onClose, onSubmit }) {
  const [section, setSection]   = useState('')
  const [name, setName]         = useState('')
  const [cover, setCover]       = useState('')
  const [hoursPlayed, setHours] = useState('')
  const [errors, setErrors]     = useState({})
  const overlayProps = useOverlayClose(onClose)

  useEffect(() => {
    if (!isOpen) return
    if (mode === 'edit' && editData) {
      setSection(editData.sectionKey || '')
      setName(editData.game.name || '')
      setCover(editData.game.cover || '')
      setHours(editData.game.hoursPlayed != null ? String(editData.game.hoursPlayed) : '')
    } else {
      // Launching from an empty section's panel pre-selects that section.
      setSection(presetSection || (sections ? Object.keys(sections)[0] : ''))
      setName(''); setCover(''); setHours('')
    }
    setErrors({})
  }, [isOpen, mode, editData, sections, presetSection])

  if (!isOpen) return null

  const showHours = HOURS_SECTIONS.includes(section)
  const sectionOptions = sections
    ? Object.entries(sections).map(([key, sec]) => ({ value: key, label: `${sec.icon} ${sec.label}` }))
    : []

  // Cover is optional — the placeholder renders properly now.
  const validate = () => {
    const e = {}
    if (!name.trim()) e.name = 'Game name is required'
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
    <div className="modal-overlay" {...overlayProps}>
      <div className="modal modal--form">
        <div className="modal-header">
          <h2 className="modal-title">{mode === 'edit' ? 'Edit Game' : 'Add Game'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <span className="form-label">Section</span>
            <Select
              value={section}
              options={sectionOptions}
              onChange={setSection}
              label="Section"
              align="left"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gm-name">Game Name</label>
            <input id="gm-name" type="text" value={name} onChange={e => setName(e.target.value)}
                   placeholder="e.g. The Witcher 3" />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          {/* Preview sits beside the field so a bad paste is obvious before saving */}
          <div className="form-group">
            <label htmlFor="gm-cover">Cover URL <span className="form-optional">optional</span></label>
            <div className="cover-field">
              <div className="cover-preview">
                <Cover
                  src={cover.trim()}
                  alt=""
                  className="cover-preview-img"
                  placeholderClassName="cover-preview-placeholder"
                />
              </div>
              <input id="gm-cover" type="url" value={cover} onChange={e => setCover(e.target.value)}
                     placeholder="https://..." />
            </div>
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
            <button type="submit" className="btn btn-primary">
              {mode === 'edit' ? 'Save Changes' : 'Add Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
