import React, { useEffect, useState } from 'react'
import { THEMES, FALLBACK_THEME, HOURS_SECTIONS, canBeNowPlaying } from '../constants'
import Cover from './Cover'
import { useOverlayClose } from '../hooks/useOverlayClose'

export default function DetailModal({ isOpen, game, sectionKey, sectionLabel, onClose, onEdit, onDelete, onTogglePlaying }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const overlayProps = useOverlayClose(onClose)

  useEffect(() => { setConfirmingDelete(false) }, [isOpen, game])

  if (!isOpen || !game) return null

  const theme = THEMES[sectionKey] || FALLBACK_THEME
  const showHours = HOURS_SECTIONS.includes(sectionKey) && game.hoursPlayed != null
  const showPlayingToggle = canBeNowPlaying(sectionKey)
  const isPlaying = showPlayingToggle && !!game.currentlyPlaying

  return (
    <div className="modal-overlay" {...overlayProps}>
      <div className="modal modal--detail">

        {/* Hero: the cover doubles as its own blurred backdrop */}
        <div className="detail-hero">
          {game.cover && (
            <img className="detail-backdrop" src={game.cover} alt="" aria-hidden="true"
                 referrerPolicy="no-referrer" />
          )}
          <div className="detail-scrim" aria-hidden="true" />

          <div className="detail-hero-body">
            <div className="detail-cover-wrap">
              <Cover
                src={game.cover}
                alt={game.name}
                className="detail-cover"
                placeholderClassName="detail-cover-placeholder"
              />
            </div>

            <h2 className="detail-title">{game.name}</h2>

            <div className="detail-meta">
              <span
                className="detail-badge"
                style={{
                  backgroundColor: theme.border,
                  color: theme.color,
                  borderColor: theme.color
                }}
              >
                {/* From the gist, so it can't drift from the section heading */}
                {sectionLabel || 'Game'}
              </span>

              {showHours && (
                <div className="detail-hours">
                  <span className="detail-hours-icon">⏱</span>
                  <span>{game.hoursPlayed}h played</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="detail-layout">
          <div className="detail-info">

            {/* Actions */}
            <div className="detail-actions">
              {showPlayingToggle && (
                <button
                  className={`btn detail-action-btn ${isPlaying ? 'btn-playing btn-playing--active' : 'btn-playing'}`}
                  onClick={onTogglePlaying}
                >
                  {isPlaying ? <><span>⏸</span> Stop Playing</> : <><span>▶</span> Mark as Currently Playing</>}
                </button>
              )}
              <button
                className="btn btn-primary detail-action-btn"
                onClick={onEdit}
              >
                <span>✏️</span> Edit Game
              </button>
              {confirmingDelete ? (
                <div className="detail-actions-row">
                  <button
                    className="btn btn-ghost detail-action-btn"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-danger btn-danger--armed detail-action-btn"
                    onClick={onDelete}
                  >
                    <span>⚠️</span> Confirm Delete?
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-danger detail-action-btn"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <span>🗑</span> Delete
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
