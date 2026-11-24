import fs from 'fs'
import path from 'path'
import {
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  exchangeRefreshTokenForAuthTokens,
  getUserPlayedGames,
  getUserTrophyProfileSummary
} from 'psn-api'

const GIST_ID = process.env.GIST_ID
const GH_TOKEN = process.env.GH_TOKEN
const PSN_GIST_FILE = 'psn_session.json'
const LOCAL_SESSION_FILE = path.join(process.cwd(), '.psn-session.json')
const TMP_SESSION_FILE = '/tmp/.psn-session.json'

let memorySession = null

async function loadSession() {
  if (memorySession?.refreshToken) {
    return memorySession
  }

  // 1. Try loading from GitHub Gist if configured (e.g. on Vercel production)
  if (GIST_ID && GH_TOKEN) {
    try {
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: {
          'Authorization': `Bearer ${GH_TOKEN}`,
          'Accept': 'application/vnd.github+json'
        }
      })
      if (res.ok) {
        const json = await res.json()
        const raw = json.files?.[PSN_GIST_FILE]?.content
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && parsed.refreshToken) {
            memorySession = parsed
            return parsed
          }
        }
      }
    } catch (e) {
      console.warn('[PSN Gist Load Warning]', e.message)
    }
  }

  // 2. Try loading from local file system (local dev or lambda /tmp)
  for (const file of [LOCAL_SESSION_FILE, TMP_SESSION_FILE]) {
    try {
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'))
        if (data && data.refreshToken) {
          memorySession = data
          return data
        }
      }
    } catch (_) {}
  }

  return null
}

async function saveSession(data) {
  memorySession = data

  // 1. Save to GitHub Gist if configured (persists permanently across Vercel deployments & cold starts)
  if (GIST_ID && GH_TOKEN) {
    try {
      await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${GH_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [PSN_GIST_FILE]: {
              content: JSON.stringify(data, null, 2)
            }
          }
        })
      })
    } catch (e) {
      console.error('[PSN Gist Save Error]', e.message)
    }
  }

  // 2. Save locally if filesystem allows
  try {
    fs.writeFileSync(LOCAL_SESSION_FILE, JSON.stringify(data, null, 2), 'utf8')
  } catch (_) {
    try {
      fs.writeFileSync(TMP_SESSION_FILE, JSON.stringify(data, null, 2), 'utf8')
    } catch (_) {}
  }
}

async function clearSession() {
  memorySession = null

  // 1. Delete from GitHub Gist if configured
  if (GIST_ID && GH_TOKEN) {
    try {
      await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${GH_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          files: {
            [PSN_GIST_FILE]: null
          }
        })
      })
    } catch (e) {
      console.error('[PSN Gist Clear Error]', e.message)
    }
  }

  // 2. Clear local files
  try { if (fs.existsSync(LOCAL_SESSION_FILE)) fs.unlinkSync(LOCAL_SESSION_FILE) } catch (_) {}
  try { if (fs.existsSync(TMP_SESSION_FILE)) fs.unlinkSync(TMP_SESSION_FILE) } catch (_) {}
}

function parsePlayDuration(duration) {
  if (!duration) return 0
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  return Math.round((hours + minutes / 60) * 10) / 10
}

async function getAuthorization(npssoInput) {
  let session = await loadSession()

  // 1. Try to refresh existing token if present
  if (session?.refreshToken) {
    try {
      const auth = await exchangeRefreshTokenForAuthTokens(session.refreshToken)
      session = {
        ...session,
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        expiresAt: Date.now() + (auth.expiresIn * 1000),
        lastRefreshedAt: new Date().toISOString()
      }
      await saveSession(session)
      return { authorization: { accessToken: auth.accessToken }, session }
    } catch (refreshErr) {
      console.warn('[PSN] Refresh token renewal failed:', refreshErr.message)
    }
  }

  // 2. Otherwise authenticate via NPSSO token
  const npsso = npssoInput || process.env.PSN_NPSSO
  if (!npsso) return null

  const accessCode = await exchangeNpssoForAccessCode(npsso)
  const auth = await exchangeAccessCodeForAuthTokens(accessCode)

  let onlineId = 'PlayStation Gamer'
  try {
    const trophySummary = await getUserTrophyProfileSummary({ accessToken: auth.accessToken }, 'me')
    if (trophySummary?.onlineId) onlineId = trophySummary.onlineId
  } catch (e) {
    if (auth.idToken) {
      try {
        const payload = JSON.parse(Buffer.from(auth.idToken.split('.')[1], 'base64').toString())
        if (payload?.online_id) onlineId = payload.online_id
      } catch (_) {}
    }
  }

  session = {
    onlineId,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    expiresAt: Date.now() + (auth.expiresIn * 1000),
    savedAt: new Date().toISOString()
  }
  await saveSession(session)

  return { authorization: { accessToken: auth.accessToken }, session }
}

export default async function handler(req, res) {
  // GET: Return current session status
  if (req.method === 'GET') {
    let session = await loadSession()
    if (!session && process.env.PSN_NPSSO) {
      try {
        const authResult = await getAuthorization()
        session = authResult?.session
      } catch (_) {}
    }

    if (session?.refreshToken) {
      return res.status(200).json({
        loggedIn: true,
        onlineId: session.onlineId || 'PlayStation Gamer',
        savedAt: session.savedAt
      })
    }
    return res.status(200).json({ loggedIn: false })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
  const action = body.action || 'sync'

  // Action: LOGOUT
  if (action === 'logout') {
    await clearSession()
    return res.status(200).json({ loggedIn: false, message: 'Logged out successfully' })
  }

  // Action: STATUS
  if (action === 'status') {
    const session = await loadSession()
    return res.status(200).json({
      loggedIn: !!session?.refreshToken,
      onlineId: session?.onlineId || null
    })
  }

  // Action: LOGIN (Save persistent session)
  if (action === 'login') {
    const npsso = body.npsso?.trim()
    if (!npsso) {
      return res.status(400).json({ error: 'Please enter your NPSSO token to sign in.' })
    }

    try {
      const result = await getAuthorization(npsso)
      if (!result?.session) {
        return res.status(401).json({ error: 'Failed to sign in. Please verify your NPSSO token.' })
      }

      return res.status(200).json({
        loggedIn: true,
        onlineId: result.session.onlineId,
        message: 'Signed in successfully! Session will stay active.'
      })
    } catch (err) {
      console.error('[PSN Login Error]', err)
      return res.status(401).json({
        error: 'Invalid or expired token. Sign in to playstation.com and grab your token from ca.account.sony.com/api/v1/ssocookie.'
      })
    }
  }

  // Action: SYNC (Default)
  try {
    const authResult = await getAuthorization(body.npsso?.trim())

    if (!authResult) {
      return res.status(401).json({
        loggedIn: false,
        error: 'Not signed in. Please sign in to PlayStation Network first.',
        helpUrl: 'https://ca.account.sony.com/api/v1/ssocookie'
      })
    }

    const { authorization, session } = authResult
    const targetLimit = Number(body.limit) || 800
    const pageSize = 100
    const allTitles = []
    let offset = 0
    let totalAvailable = null

    // Page through all available played games on PlayStation Network
    while (allTitles.length < targetLimit) {
      const fetchLimit = Math.min(pageSize, targetLimit - allTitles.length)
      const response = await getUserPlayedGames(authorization, 'me', {
        limit: fetchLimit,
        offset,
        categories: 'ps4_game,ps5_native_game,pspc_game,unknown'
      })

      const pageTitles = response?.titles || []
      if (pageTitles.length === 0) break

      allTitles.push(...pageTitles)

      if (typeof response.totalItemCount === 'number') {
        totalAvailable = response.totalItemCount
      }

      if (response.nextOffset != null && response.nextOffset > offset) {
        offset = response.nextOffset
      } else {
        offset += pageTitles.length
      }

      // Reached the end of the user's library
      if (
        (totalAvailable != null && allTitles.length >= totalAvailable) ||
        pageTitles.length < fetchLimit
      ) {
        break
      }
    }

    const games = allTitles.map(t => ({
      titleId: t.titleId,
      name: t.name,
      cover: t.imageUrl || '',
      hoursPlayed: parsePlayDuration(t.playDuration),
      category: t.category,
      playCount: t.playCount,
      firstPlayedDateTime: t.firstPlayedDateTime,
      lastPlayedDateTime: t.lastPlayedDateTime
    }))

    return res.status(200).json({
      games,
      total: games.length,
      onlineId: session?.onlineId || 'PlayStation Gamer'
    })
  } catch (err) {
    console.error('[PSN Sync Error]', err)
    const message = err.message || 'Failed to sync PlayStation games'
    const isAuth =
      message.toLowerCase().includes('npsso') ||
      message.toLowerCase().includes('token') ||
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('401')

    if (isAuth) {
      await clearSession()
    }

    return res.status(isAuth ? 401 : 500).json({
      loggedIn: !isAuth,
      error: isAuth
        ? 'Your PlayStation session expired. Please sign in again with a fresh token.'
        : message
    })
  }
}
