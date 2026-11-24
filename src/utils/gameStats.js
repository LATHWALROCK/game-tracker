export function computeStats(data) {
  let totalGames = 0
  let totalHours = 0
  const sections = []

  for (const [key, section] of Object.entries(data)) {
    if (key.startsWith('_') || !section?.games) continue
    const games = section.games || []
    totalGames += games.length
    totalHours += games.reduce((sum, g) => sum + (g.hoursPlayed || 0), 0)
    sections.push({ key, label: section.label, icon: section.icon, count: games.length })
  }

  // Share of the library, for the split bar
  for (const s of sections) {
    s.percent = totalGames > 0 ? (s.count / totalGames) * 100 : 0
  }

  return { totalGames, totalHours, sections }
}
