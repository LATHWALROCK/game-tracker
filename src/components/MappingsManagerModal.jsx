import React from 'react'
import { useOverlayClose } from '../hooks/useOverlayClose'

export default function MappingsManagerModal({ isOpen, mappings, onClose, onRemoveMapping }) {
  const overlayProps = useOverlayClose(onClose)

  if (!isOpen) return null

  const entries = Object.entries(mappings || {})

  return (
    <div className="modal-overlay" {...overlayProps}>
      <div className="modal modal--mappings-manager">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">⚙️ PlayStation Mappings & Rules</h2>
            <p className="modal-subtitle">
              Manage your saved game splits and ignored titles. Deleted mappings will reappear in future syncs.
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {entries.length === 0 ? (
          <div className="psn-empty-state" style={{ padding: '2rem 1rem' }}>
            <span className="psn-empty-icon" aria-hidden="true">📋</span>
            <p className="psn-empty-title">No Custom Mappings Yet</p>
            <p className="psn-empty-text">
              When syncing, click "✂️ Split" on any collection or "🚫 Ignore" to save persistent rules here.
            </p>
          </div>
        ) : (
          <div className="mappings-list">
            {entries.map(([key, item]) => {
              const isSplit = item.type === 'split'
              return (
                <div key={key} className="mapping-card">
                  <div className="mapping-card-main">
                    <div className="mapping-card-header">
                      <span className={`mapping-badge ${isSplit ? 'mapping-badge--split' : 'mapping-badge--ignore'}`}>
                        {isSplit ? '✂️ Split Collection' : '🚫 Ignored Title'}
                      </span>
                      <span className="mapping-title">{item.originalTitle || key}</span>
                    </div>

                    {isSplit && Array.isArray(item.games) && (
                      <div className="mapping-subgames">
                        <span className="mapping-sub-label">Divided into:</span>
                        <div className="mapping-tags">
                          {item.games.map((g, i) => (
                            <span key={i} className="mapping-sub-tag">
                              {g.name} {g.hours != null ? `(${g.hours}h)` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-tiny btn-danger"
                    onClick={() => onRemoveMapping(key)}
                    title="Remove this rule so the title is treated normally again"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
