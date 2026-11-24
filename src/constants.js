// Section colours double as the categorical palette for the library-split bar,
// so they're stepped to pass the dark-surface checks: all four inside the
// OKLCH lightness band 0.48–0.67 (the old green/yellow sat at 0.72/0.80 and
// glared), chroma floor, >=3:1 against the surface, and no colour-blind
// collision (the old blue and purple were ΔE 0.9 apart under deuteranopia).
// Colour only — section names always come from the gist (`section.label`), so a
// hardcoded label here can't drift from what the section heading shows.
export const THEMES = {
  played:      { color: '#16a34a', border: 'rgba(22,163,74,0.2)'  },
  wishlist:    { color: '#d97706', border: 'rgba(217,119,6,0.2)'  },
  bought:      { color: '#0891b2', border: 'rgba(8,145,178,0.2)'  },
  multiplayer: { color: '#a855f7', border: 'rgba(168,85,247,0.2)' },
}

export const FALLBACK_THEME = { color: '#7c3aed', border: 'rgba(124,58,237,0.2)' }

// All games across all sections support tracking hours played
export const allowsHours = () => true

// Legacy array for backward compatibility
export const HOURS_SECTIONS = ['played', 'wishlist', 'bought', 'multiplayer', 'abandoned', 'backlog']

// Only games in these sections can be marked as "currently playing"
export const NOW_PLAYING_SECTIONS = ['wishlist', 'bought', 'backlog']

export const canBeNowPlaying = (sectionKey) => NOW_PLAYING_SECTIONS.includes(sectionKey)

// Any section can be sorted by hours or manual order
export const isSortable = () => true
