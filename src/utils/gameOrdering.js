export const SORT_MODES = [
  { value: 'manual',    label: 'Manual' },
  { value: 'name',      label: 'Name (A-Z)' },
  { value: 'hours',     label: 'Hours Played' },
  { value: 'dateAdded', label: 'Date Added' },
]

export function sortGames(games, mode) {
  if (mode === 'manual') return games
  const sorted = [...games]
  if (mode === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name))
  } else if (mode === 'hours') {
    sorted.sort((a, b) => (b.hoursPlayed ?? 0) - (a.hoursPlayed ?? 0))
  } else if (mode === 'dateAdded') {
    sorted.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0))
  }
  return sorted
}

export function arrayMove(arr, from, to) {
  const copy = [...arr]
  const [moved] = copy.splice(from, 1)
  copy.splice(to, 0, moved)
  return copy
}
