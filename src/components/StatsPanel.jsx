import React from 'react'
import { THEMES, FALLBACK_THEME } from '../constants'
import { computeStats } from '../utils/gameStats'

export default function StatsPanel({ data }) {
  const stats = computeStats(data)

  return (
    <div className="stats-panel">
      <div className="stat-tile">
        <span className="stat-value">{stats.totalGames}</span>
        <span className="stat-label">Total Games</span>
      </div>
      <div className="stat-tile">
        <span className="stat-value">{stats.totalHours}h</span>
        <span className="stat-label">Hours Played</span>
      </div>
      {stats.sections.map(s => {
        const theme = THEMES[s.key] || FALLBACK_THEME
        return (
          <div
            key={s.key}
            className="stat-tile stat-tile--section"
            style={{ borderLeftColor: theme.color }}
          >
            <span className="stat-value">{s.icon} {s.count}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        )
      })}
    </div>
  )
}
