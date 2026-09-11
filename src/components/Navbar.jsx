import React from 'react'
export default function Navbar({ onAddGame, saving }) {
  return (
    <nav className="navbar">
      <h1 className="brand">🎮 Game Tracker</h1>
      <div className="nav-actions">
        {/* Optimistic updates mean the grid no longer proves a save happened. */}
        {saving && (
          <span className="save-status" role="status">
            <span className="save-dot" aria-hidden="true" />
            Saving…
          </span>
        )}
        <button className="btn btn-primary" onClick={onAddGame}>+ Add Game</button>
      </div>
    </nav>
  )
}
