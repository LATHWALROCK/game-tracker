export const THEMES = {
  played:             { color: '#22c55e', border: 'rgba(34,197,94,0.2)',   label: 'Played'           },
  wishlist:           { color: '#eab308', border: 'rgba(234,179,8,0.2)',   label: 'Wishlist'         },
  bought:             { color: '#3b82f6', border: 'rgba(59,130,246,0.2)',  label: 'Bought'           },
  multiplayer:        { color: '#a855f7', border: 'rgba(168,85,247,0.2)',  label: 'Multiplayer'      },
}

export const FALLBACK_THEME = { color: '#7c3aed', border: 'rgba(124,58,237,0.2)', label: 'Game' }

export const HOURS_SECTIONS = ['played', 'multiplayer', 'abandoned']

// Only games in these sections can be marked as "currently playing" — the
// Now Playing row is meant for what you're working through off the wishlist,
// not for games already played or ongoing multiplayer titles.
export const NOW_PLAYING_SECTIONS = ['wishlist']

export const canBeNowPlaying = (sectionKey) => NOW_PLAYING_SECTIONS.includes(sectionKey)
