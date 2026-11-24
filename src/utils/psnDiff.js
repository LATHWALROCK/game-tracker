/**
 * Normalizes title string for fuzzy comparison across platforms.
 * Strips accents, trademarks, platform suffixes, and converts roman numerals in parts.
 */
export function normalizeTitle(title) {
  if (!title) return ''
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®©:]/g, '')
    .replace(/\b(ps4|ps5|playstation\s*5|playstation\s*4|edition|remastered|director'?s cut)\b/gi, '')
    .replace(/part\s+([0-9]+)/gi, (_, n) => `part ${n}`)
    .replace(/part\s+(i+)/gi, (_, r) => `part ${r.length}`)
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

/**
 * Searches the user's library for an existing game matching the PSN title.
 */
export function findMatchingGame(library, psnTitle) {
  if (!library || typeof library !== 'object') return null
  const normPSN = normalizeTitle(psnTitle)
  if (!normPSN) return null

  for (const [sectionKey, section] of Object.entries(library)) {
    if (sectionKey.startsWith('_') || !section?.games) continue
    const games = section.games || []
    for (let idx = 0; idx < games.length; idx++) {
      const game = games[idx]
      const normLib = normalizeTitle(game.name)
      if (!normLib) continue

      if (
        normLib === normPSN ||
        (normPSN.length >= 6 && normLib.includes(normPSN)) ||
        (normLib.length >= 6 && normPSN.includes(normLib))
      ) {
        return { sectionKey, idx, game }
      }
    }
  }
  return null
}

/**
 * Compares incoming PSN games against the local library to generate a staging diff.
 * Respects custom mappings:
 *   - 'ignore': skips the title completely so it never shows again
 *   - 'split': expands a collection into individual mapped games
 */
export function generatePsnDiff(library, psnGames) {
  const changes = []
  let upToDateCount = 0
  let ignoredCount = 0

  if (!library || typeof library !== 'object') {
    return { changes, upToDateCount, ignoredCount }
  }

  const mappings = library._psn_mappings || {}
  const availableSections = Object.keys(library).filter(k => !k.startsWith('_'))
  if (availableSections.length === 0) {
    return { changes, upToDateCount, ignoredCount }
  }

  const defaultPlayedSection = availableSections.includes('played') ? 'played' : availableSections[0]

  // Group raw PSN entries by target game to prevent duplicates & conflicts across platforms
  const grouped = new Map()

  for (const psnGame of (psnGames || [])) {
    const normPSN = normalizeTitle(psnGame.name)
    const mapping = mappings[normPSN] || mappings[psnGame.name]

    // 1. Check if title is mapped as IGNORE
    if (mapping?.type === 'ignore') {
      ignoredCount++
      continue
    }

    // 2. Check if title is mapped as SPLIT (collection divided into multiple games)
    if (mapping?.type === 'split' && Array.isArray(mapping.games)) {
      for (const sub of mapping.games) {
        const subMatch = findMatchingGame(library, sub.name)
        const targetHours = sub.hours != null ? Number(sub.hours) : 0
        const key = subMatch
          ? `match:${subMatch.sectionKey}:${subMatch.idx}`
          : `split-new:${normalizeTitle(sub.name)}`

        if (!grouped.has(key)) {
          grouped.set(key, {
            key,
            isSplit: true,
            fromBundle: psnGame.name,
            match: subMatch,
            name: sub.name,
            cover: sub.cover || psnGame.cover || '',
            targetSection: sub.sectionKey || defaultPlayedSection,
            hoursList: [targetHours],
            versions: [{ name: sub.name, hours: targetHours }],
            originalPsnGame: psnGame
          })
        }
      }
      continue
    }

    // 3. Match against library
    const match = findMatchingGame(library, psnGame.name)
    const key = match
      ? `match:${match.sectionKey}:${match.idx}`
      : `new:${normPSN || psnGame.name.toLowerCase()}`

    const hours = psnGame.hoursPlayed || 0

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        match,
        name: match ? match.game.name : psnGame.name,
        cover: match?.game.cover || psnGame.cover || '',
        targetSection: defaultPlayedSection,
        hoursList: [hours],
        versions: [
          {
            name: psnGame.name,
            category: psnGame.category,
            hours,
            titleId: psnGame.titleId,
            lastPlayed: psnGame.lastPlayedDateTime
          }
        ],
        originalPsnGame: psnGame
      })
    } else {
      const existing = grouped.get(key)
      existing.hoursList.push(hours)
      existing.versions.push({
        name: psnGame.name,
        category: psnGame.category,
        hours,
        titleId: psnGame.titleId,
        lastPlayed: psnGame.lastPlayedDateTime
      })
      if (!existing.cover && psnGame.cover) {
        existing.cover = psnGame.cover
      }
    }
  }

  // Process each consolidated group into a single clean diff entry
  for (const item of grouped.values()) {
    const maxHours = Math.max(...item.hoursList)
    const sumHours = Math.round(item.hoursList.reduce((a, b) => a + b, 0) * 10) / 10
    const hasMultipleVersions = item.versions.length > 1

    if (item.match) {
      const currentHours = item.match.game.hoursPlayed || 0
      const psnHours = maxHours
      const hoursChanged = psnHours > currentHours && (psnHours - currentHours) >= 0.1
      const coverMissing = !item.match.game.cover && !!item.cover

      if (hoursChanged || coverMissing) {
        changes.push({
          id: `update-${item.match.sectionKey}-${item.match.game.name}`,
          type: 'UPDATE_HOURS',
          sectionKey: item.match.sectionKey,
          idx: item.match.idx,
          gameName: item.match.game.name,
          cover: item.match.game.cover || item.cover,
          currentHours,
          newHours: psnHours,
          diffHours: Math.round((psnHours - currentHours) * 10) / 10,
          sumHours: sumHours > psnHours ? sumHours : null,
          versions: item.versions,
          hasMultipleVersions,
          fromBundle: item.fromBundle || null,
          updateCover: coverMissing ? item.cover : null,
          selected: true,
          originalPsnGame: item.originalPsnGame
        })
      } else {
        upToDateCount++
        changes.push({
          id: `uptodate-${item.match.sectionKey}-${item.match.game.name}`,
          type: 'UP_TO_DATE',
          sectionKey: item.match.sectionKey,
          sectionLabel: library[item.match.sectionKey]?.label || item.match.sectionKey,
          sectionIcon: library[item.match.sectionKey]?.icon || '🎮',
          idx: item.match.idx,
          gameName: item.match.game.name,
          cover: item.match.game.cover || item.cover,
          currentHours,
          newHours: currentHours,
          hoursPlayed: currentHours,
          versions: item.versions,
          hasMultipleVersions,
          fromBundle: item.fromBundle || null,
          selected: false,
          originalPsnGame: item.originalPsnGame
        })
      }
    } else {
      // New game not found in library
      changes.push({
        id: `add-${item.originalPsnGame?.titleId || normalizeTitle(item.name)}`,
        type: 'ADD_GAME',
        name: item.name,
        cover: item.cover || '',
        hoursPlayed: maxHours,
        sumHours: sumHours > maxHours ? sumHours : null,
        targetSection: item.targetSection || defaultPlayedSection,
        versions: item.versions,
        hasMultipleVersions,
        fromBundle: item.fromBundle || null,
        selected: true,
        originalPsnGame: item.originalPsnGame
      })
    }
  }

  return { changes, upToDateCount, ignoredCount }
}

/**
 * Applies only the approved/selected changes to produce a new library state.
 */
export function applyApprovedChanges(library, approvedChanges, updatedMappings) {
  if (!library || typeof library !== 'object') return library
  const next = structuredClone(library)

  if (updatedMappings) {
    next._psn_mappings = { ...updatedMappings }
  }

  for (const change of approvedChanges) {
    if (!change.selected) continue

    if (change.type === 'UPDATE_HOURS') {
      const section = next[change.sectionKey]
      if (section && section.games) {
        let game = section.games[change.idx]
        if (!game || normalizeTitle(game.name) !== normalizeTitle(change.gameName)) {
          game = section.games.find(g => normalizeTitle(g.name) === normalizeTitle(change.gameName))
        }

        if (game) {
          game.hoursPlayed = change.newHours
          if (change.updateCover && !game.cover) {
            game.cover = change.updateCover
          }
        }
      }
    } else if (change.type === 'ADD_GAME') {
      const targetSecKey = change.targetSection || Object.keys(next).find(k => !k.startsWith('_'))
      const targetSec = next[targetSecKey]
      if (targetSec && targetSec.games) {
        const newGame = {
          name: change.name,
          cover: change.cover || '',
          addedAt: Date.now()
        }
        if (change.hoursPlayed > 0) {
          newGame.hoursPlayed = change.hoursPlayed
        }
        targetSec.games.push(newGame)
      }
    }
  }

  return next
}
