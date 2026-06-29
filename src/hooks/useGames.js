import { useState, useCallback } from 'react'

export function useGames() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const loadGames = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gist')
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Error ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveGames = useCallback(async (newData) => {
    const res = await fetch('/api/gist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newData),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || `Save failed: ${res.status}`)
    }
    setData(newData)
  }, [])

  return { data, loading, error, loadGames, saveGames }
}
