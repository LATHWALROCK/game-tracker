import { HOURS_SECTIONS } from '../constants'

export function computeStats(data) {
  let totalGames = 0
  let totalHours = 0
  const sections = []

  for (const [key, section] of Object.entries(data)) {
    const games = section.games || []
    totalGames += games.length
    if (HOURS_SECTIONS.includes(key)) {
      totalHours += games.reduce((sum, g) => sum + (g.hoursPlayed || 0), 0)
    }
    sections.push({ key, label: section.label, icon: section.icon, count: games.length })
  }

  return { totalGames, totalHours, sections }
}
