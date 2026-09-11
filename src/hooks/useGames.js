import { useState, useCallback, useEffect, useRef } from 'react'

// A Vercel 413/504 responds with HTML, so a bare res.json() throws
// "Unexpected token '<'" and buries the real status.
async function safeJson(res) {
  try { return await res.json() } catch { return { error: `HTTP ${res.status}` } }
}

export function useGames() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [saving, setSaving]   = useState(false)

  const dataRef    = useRef(null)               // newest local truth
  const chainRef   = useRef(Promise.resolve())  // serializes writes
  const timerRef   = useRef(null)               // pending debounced save
  const pendingRef = useRef(false)

  const apply = useCallback((next) => {
    dataRef.current = next
    setData(next)
  }, [])

  const loadGames = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gist')
      if (!res.ok) {
        const err = await safeJson(res)
        throw new Error(err.error || `Error ${res.status}`)
      }
      apply(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [apply])

  // Two overlapping PATCHes can reach GitHub out of order, letting the older
  // document win. Chaining them makes "last write" actually last.
  const enqueue = useCallback((fn) => {
    const run = chainRef.current.then(fn, fn)
    chainRef.current = run.catch(() => {})
    return run
  }, [])

  const commit = useCallback(({ keepalive = false } = {}) => enqueue(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/gist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Always the newest snapshot, never one captured when the save was queued —
        // this is what lets a burst of reorders collapse into a single request.
        body: JSON.stringify(dataRef.current),
        keepalive,
      })
      if (!res.ok) {
        const err = await safeJson(res)
        // Re-fetch rather than restoring a snapshot: with several mutations
        // queued, an old snapshot would resurrect already-deleted games.
        await loadGames()
        throw new Error(err.error || `Save failed: ${res.status}`)
      }
    } finally {
      setSaving(false)
    }
  }), [enqueue, loadGames])

  const flush = useCallback((opts) => {
    if (!pendingRef.current) return null
    clearTimeout(timerRef.current)
    pendingRef.current = false
    return commit(opts)
  }, [commit])

  // Paint immediately; persist now (delay 0) or after the burst settles.
  const saveGames = useCallback((next, { delay = 0 } = {}) => {
    apply(next)
    clearTimeout(timerRef.current)

    if (delay === 0) {
      pendingRef.current = false
      return commit()
    }

    pendingRef.current = true
    return new Promise((resolve, reject) => {
      timerRef.current = setTimeout(() => {
        pendingRef.current = false
        commit().then(resolve, reject)
      }, delay)
    })
  }, [apply, commit])

  // A debounced save would otherwise be lost if the tab closed mid-window —
  // a data-loss path that didn't exist before coalescing.
  useEffect(() => {
    const onLeave = () => { flush({ keepalive: true }) }
    const onHide  = () => { if (document.visibilityState === 'hidden') onLeave() }
    const onBeforeUnload = (e) => {
      if (!pendingRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('pagehide', onLeave)
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('pagehide', onLeave)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      clearTimeout(timerRef.current)
    }
  }, [flush])

  return { data, loading, error, saving, loadGames, saveGames }
}
