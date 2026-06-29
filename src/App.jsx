import React, { useEffect, useState, useCallback } from 'react'
import { useGames } from './hooks/useGames'
import { useToast } from './hooks/useToast'
import Navbar from './components/Navbar'
import GameSection from './components/GameSection'
import GameModal from './components/GameModal'
import DetailModal from './components/DetailModal'
import Toast from './components/Toast'

export default function App() {
  const { data, loading, error, loadGames, saveGames } = useGames()
  const { toast, showToast } = useToast()

  // Game modal state
  const [gameModal, setGameModal] = useState({ open: false, mode: 'add', editData: null })
  // Detail modal state
  const [detailModal, setDetailModal] = useState({ open: false, game: null, sectionKey: null, idx: null })

  useEffect(() => { loadGames() }, [loadGames])

  // ADD GAME
  const handleAddSubmit = useCallback(async ({ section, name, cover, hoursPlayed }) => {
    const newData = structuredClone(data)
    const game = { name, cover }
    if (hoursPlayed !== undefined) game.hoursPlayed = hoursPlayed
    newData[section].games.push(game)
    try {
      await saveGames(newData)
      setGameModal({ open: false, mode: 'add', editData: null })
      showToast('Game added!', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }, [data, saveGames, showToast])

  // EDIT GAME
  const handleEditSubmit = useCallback(async ({ section, name, cover, hoursPlayed }) => {
    const { editData } = gameModal
    const newData = structuredClone(data)
    // Remove from old section
    newData[editData.sectionKey].games.splice(editData.idx, 1)
    // Add to (possibly new) section
    const game = { name, cover }
    if (hoursPlayed !== undefined) game.hoursPlayed = hoursPlayed
    newData[section].games.push(game)
    try {
      await saveGames(newData)
      setGameModal({ open: false, mode: 'add', editData: null })
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

  return (
    <>
      <Navbar onAddGame={() => setGameModal({ open: true, mode: 'add', editData: null })} />

      <main className="main-content">
        {loading && <div className="loader">⏳ Loading games…</div>}
        {error   && <div className="loader error-text">❌ {error}</div>}
        {!loading && !error && data && Object.entries(data).map(([key, section]) => (
          <GameSection
            key={key}
            sectionKey={key}
            section={section}
            onEdit={(sectionKey, idx, game) =>
              setGameModal({ open: true, mode: 'edit', editData: { sectionKey, idx, game } })}
            onDelete={(sectionKey, idx) => handleDelete(sectionKey, idx)}
            onDetail={(game, sectionKey, idx) =>
              setDetailModal({ open: true, game, sectionKey, idx })}
          />
        ))}
      </main>

      <GameModal
        isOpen={gameModal.open}
        mode={gameModal.mode}
        sections={data}
        editData={gameModal.editData}
        onClose={() => setGameModal({ open: false, mode: 'add', editData: null })}
        onSubmit={gameModal.mode === 'edit' ? handleEditSubmit : handleAddSubmit}
      />

      <DetailModal
        isOpen={detailModal.open}
        game={detailModal.game}
        sectionKey={detailModal.sectionKey}
        onClose={() => setDetailModal({ open: false, game: null, sectionKey: null, idx: null })}
        onEdit={() => {
          setDetailModal(prev => ({ ...prev, open: false }))
          setGameModal({ open: true, mode: 'edit', editData: {
            sectionKey: detailModal.sectionKey,
            idx: detailModal.idx,
            game: detailModal.game,
          }})
        }}
        onDelete={() => handleDelete(detailModal.sectionKey, detailModal.idx)}
      />

      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </>
  )
}
