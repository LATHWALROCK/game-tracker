import fs from 'fs'
import path from 'path'
import {
  exchangeNpssoForAccessCode,
  exchangeAccessCodeForAuthTokens,
  exchangeRefreshTokenForAuthTokens,
  getUserPlayedGames,
  getUserTrophyProfileSummary
} from 'psn-api'

const SESSION_FILE = path.join(process.cwd(), '.psn-session.json')

function loadSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
      if (data && data.refreshToken) return data
    }
  } catch (e) {
    console.error('[PSN Session Load Error]', e.message)
  }
  return null
}

function saveSession(data) {
  try {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2), 'utf8')
  } catch (e) {
    console.error('[PSN Session Save Error]', e.message)
  }
}

function clearSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE)
    }
  } catch (e) {
    console.error('[PSN Session Clear Error]', e.message)
  }
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
  let session = loadSession()

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
      saveSession(session)
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
  saveSession(session)

  return { authorization: { accessToken: auth.accessToken }, session }
}

export default async function handler(req, res) {
  // GET: Return current session status
  if (req.method === 'GET') {
    const session = loadSession()
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
    clearSession()
    return res.status(200).json({ loggedIn: false, message: 'Logged out successfully' })
  }

  // Action: STATUS
  if (action === 'status') {
    const session = loadSession()
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
    const limit = Number(body.limit) || 50

    const response = await getUserPlayedGames(authorization, 'me', {
      limit: Math.min(limit, 100),
      categories: 'ps4_game,ps5_native_game,pspc_game'
    })

    const titles = response?.titles || []
    const games = titles.map(t => ({
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
      clearSession()
    }

    return res.status(isAuth ? 401 : 500).json({
      loggedIn: !isAuth,
      error: isAuth
        ? 'Your PlayStation session expired. Please sign in again with a fresh token.'
        : message
    })
  }
}
