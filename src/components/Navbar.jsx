import React from 'react'
export default function Navbar({ onAddGame }) {
  return (
    <nav className="navbar">
      <span className="brand">🎮 Game Tracker</span>
      <div className="nav-actions">
        <button className="btn btn-primary" onClick={onAddGame}>+ Add Game</button>
      </div>
    </nav>
  )
}
