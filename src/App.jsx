import React, { useEffect, useState, useCallback } from 'react'
import { canBeNowPlaying } from './constants'
import { useGames } from './hooks/useGames'
import { useToast } from './hooks/useToast'
import Navbar from './components/Navbar'
import NowPlaying from './components/NowPlaying'
import StatsPanel from './components/StatsPanel'
import GameSection from './components/GameSection'
import GameModal from './components/GameModal'
import DetailModal from './components/DetailModal'
import Skeleton from './components/Skeleton'
import Toast from './components/Toast'

export default function App() {
  const { data, loading, error, saving, loadGames, saveGames } = useGames()
  const { toast, showToast } = useToast()

  // Game modal state. `presetSection` pre-selects a section when the add flow is
  // launched from an empty section panel.
  const [gameModal, setGameModal] = useState({ open: false, mode: 'add', editData: null, presetSection: null })
  // Detail modal state
  const [detailModal, setDetailModal] = useState({ open: false, game: null, sectionKey: null, idx: null })

  useEffect(() => { loadGames() }, [loadGames])

  // ADD GAME
  const handleAddSubmit = useCallback(async ({ section, name, cover, hoursPlayed }) => {
    const newData = structuredClone(data)
    const game = { name, cover, addedAt: Date.now() }
    if (hoursPlayed !== undefined) game.hoursPlayed = hoursPlayed
    newData[section].games.push(game)
    try {
      await saveGames(newData)
      setGameModal({ open: false, mode: 'add', editData: null, presetSection: null })
      showToast('Game added!', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }, [data, saveGames, showToast])

  // EDIT GAME
  const handleEditSubmit = useCallback(async ({ section, name, cover, hoursPlayed }) => {
    const { editData } = gameModal
    const newData = structuredClone(data)
    const { sectionKey: from, idx } = editData

    // Spread the original so fields this function doesn't know about survive.
    const updated = { ...newData[from].games[idx], name, cover }
    // Clearing the hours input must still remove the key.
    if (hoursPlayed === undefined) delete updated.hoursPlayed
    else updated.hoursPlayed = hoursPlayed
    // Moving a game into a section that can't be "now playing" drops the flag.
    if (!canBeNowPlaying(section)) delete updated.currentlyPlaying

    if (section === from) {
      newData[section].games[idx] = updated      // in place — manual order preserved
    } else {
      newData[from].games.splice(idx, 1)
      newData[section].games.push(updated)
    }

    try {
      await saveGames(newData)
      setGameModal({ open: false, mode: 'add', editData: null, presetSection: null })
      setDetailModal({ open: false, game: null, sectionKey: null, idx: null })
      showToast('Game updated!', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }, [data, gameModal, saveGames, showToast])

  // DELETE GAME
  const handleDelete = useCallback(async (sectionKey, idx) => {
    const newData = structuredClone(data)
    newData[sectionKey].games.splice(idx, 1)
    try {
      await saveGames(newData)
      setDetailModal({ open: false, game: null, sectionKey: null, idx: null })
      showToast('Game deleted.', 'info')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }, [data, saveGames, showToast])

  // REORDER GAMES WITHIN A SECTION (drag-and-drop)
  // Debounced: a burst of drags paints instantly but sends one PATCH.
  const handleReorder = useCallback(async (sectionKey, newGames) => {
    const newData = structuredClone(data)
    newData[sectionKey].games = newGames
    try {
      await saveGames(newData, { delay: 800 })
    } catch (e) {
      showToast(e.message, 'error')
    }
  }, [data, saveGames, showToast])

  // TOGGLE "CURRENTLY PLAYING"
  const handleTogglePlaying = useCallback(async (sectionKey, idx) => {
    if (!canBeNowPlaying(sectionKey)) return
    const newData = structuredClone(data)
    const game = newData[sectionKey].games[idx]
    game.currentlyPlaying = !game.currentlyPlaying
    try {
      await saveGames(newData)
      setDetailModal(prev => (prev.open ? { ...prev, game } : prev))
      showToast(game.currentlyPlaying ? 'Marked as currently playing.' : 'Removed from Now Playing.', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }, [data, saveGames, showToast])

  return (
    <>
      <Navbar
        saving={saving}
        onAddGame={() => setGameModal({ open: true, mode: 'add', editData: null, presetSection: null })}
      />

      <main className="main-content">
        {loading && <Skeleton />}

        {error && !loading && (
          <div className="state-panel state-panel--error">
            <span className="state-panel-icon" aria-hidden="true">⚠️</span>
            <p className="state-panel-title">Couldn’t load your library</p>
            <p className="state-panel-text">{error}</p>
            <button className="btn btn-primary" onClick={loadGames}>Try again</button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <NowPlaying
              data={data}
              onDetail={(game, sectionKey, idx) => setDetailModal({ open: true, game, sectionKey, idx })}
            />
            <StatsPanel data={data} />
            {Object.entries(data).map(([key, section]) => (
              <GameSection
                key={key}
                sectionKey={key}
                section={section}
                onDelete={(sectionKey, idx) => handleDelete(sectionKey, idx)}
                onDetail={(game, sectionKey, idx) =>
                  setDetailModal({ open: true, game, sectionKey, idx })}
                onReorder={handleReorder}
                onAddToSection={() =>
                  setGameModal({ open: true, mode: 'add', editData: null, presetSection: key })}
              />
            ))}
          </>
        )}
      </main>

      <GameModal
        isOpen={gameModal.open}
        mode={gameModal.mode}
        sections={data}
        editData={gameModal.editData}
        presetSection={gameModal.presetSection}
        onClose={() => setGameModal({ open: false, mode: 'add', editData: null, presetSection: null })}
        onSubmit={gameModal.mode === 'edit' ? handleEditSubmit : handleAddSubmit}
      />

      <DetailModal
        isOpen={detailModal.open}
        game={detailModal.game}
        sectionKey={detailModal.sectionKey}
        sectionLabel={detailModal.sectionKey ? data?.[detailModal.sectionKey]?.label : null}
        onClose={() => setDetailModal({ open: false, game: null, sectionKey: null, idx: null })}
        onEdit={() => {
          setDetailModal(prev => ({ ...prev, open: false }))
          setGameModal({ open: true, mode: 'edit', presetSection: null, editData: {
            sectionKey: detailModal.sectionKey,
            idx: detailModal.idx,
            game: detailModal.game,
          }})
        }}
        onDelete={() => handleDelete(detailModal.sectionKey, detailModal.idx)}
        onTogglePlaying={() => handleTogglePlaying(detailModal.sectionKey, detailModal.idx)}
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </>
  )
}
