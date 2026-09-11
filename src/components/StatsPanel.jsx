import React from 'react'
import { THEMES, FALLBACK_THEME } from '../constants'
import { computeStats } from '../utils/gameStats'

export default function StatsPanel({ data }) {
  const stats = computeStats(data)
  const themeOf = key => THEMES[key] || FALLBACK_THEME

  // A zero-count section would render as a stray sliver between the 2px gaps.
  const segments = stats.sections.filter(s => s.count > 0)

  return (
    <div className="stats-panel">

      {/* Two headline numbers lead — they're the whole-library totals */}
      <div className="stats-headline">
        <div className="stat-lead">
          <span className="stat-lead-label">Total games</span>
          <span className="stat-lead-value">{stats.totalGames}</span>
        </div>
        <div className="stat-lead">
          <span className="stat-lead-label">Hours played</span>
          <span className="stat-lead-value">
            {stats.totalHours.toLocaleString()}<span className="stat-lead-unit">h</span>
          </span>
        </div>
      </div>

      {/* Part-to-whole: how the library splits across sections */}
      {stats.totalGames > 0 && (
        <div className="stats-split">
          <span className="stats-split-label">Library split</span>

          <div className="split-bar" role="img"
               aria-label={segments.map(s => `${s.label}: ${s.count}`).join(', ')}>
            {segments.map(s => (
              <div
                key={s.key}
                className="split-seg"
                style={{ flexGrow: s.count, background: themeOf(s.key).color }}
              />
            ))}
          </div>

          {/* Legend carries identity and every value, so nothing is colour-only
              or hidden behind a hover */}
          <ul className="split-legend">
            {stats.sections.map(s => (
              <li key={s.key} className="split-legend-item">
                <span
                  className="split-legend-dot"
                  style={{ background: themeOf(s.key).color }}
                  aria-hidden="true"
                />
                <span className="split-legend-icon" aria-hidden="true">{s.icon}</span>
                <span className="split-legend-name">{s.label}</span>
                <span className="split-legend-count">{s.count}</span>
                <span className="split-legend-pct">{Math.round(s.percent)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
