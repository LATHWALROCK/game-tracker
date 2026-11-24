import React from 'react'
import PlayStationLogo from './PlayStationLogo'

export default function Navbar({ onAddGame, onSyncPsn, saving }) {
  return (
    <nav className="navbar">
      <h1 className="brand">🎮 Game Tracker</h1>
      <div className="nav-actions">
        {/* Optimistic updates indicator */}
        {saving && (
          <span className="save-status" role="status">
            <span className="save-dot" aria-hidden="true" />
            Saving…
          </span>
        )}

        {/* Sync PlayStation Button with exact official PS emblem */}
        <button
          type="button"
          className="btn btn-psn"
          onClick={onSyncPsn}
          title="Sync with PlayStation Network"
          aria-label="Sync with PlayStation Network"
        >
          <PlayStationLogo size={19} className="ps-logo" />
          <span>Sync PSN</span>
        </button>

        {/* Add Game Button */}
        <button
          type="button"
          className="btn btn-primary"
          onClick={onAddGame}
        >
          + Add Game
        </button>
      </div>
    </nav>
  )
}
