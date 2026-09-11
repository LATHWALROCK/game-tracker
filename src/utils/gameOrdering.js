export const SORT_MODES = [
  { value: 'manual', label: 'Manual' },
  { value: 'hours',  label: 'Hours Played' },
]

export function sortGames(games, mode) {
  if (mode === 'manual') return games
  const sorted = [...games]
  if (mode === 'hours') {
    sorted.sort((a, b) => (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0))
  }
  return sorted
}

export function arrayMove(arr, from, to) {
  const copy = [...arr]
  const [moved] = copy.splice(from, 1)
  copy.splice(to, 0, moved)
  return copy
}
