import React, { useEffect, useState, useCallback } from 'react'
import { useGames } from './hooks/useGames'
import { useToast } from './hooks/useToast'
import Navbar from './components/Navbar'
import GameSection from './components/GameSection'
import GameModal from './components/GameModal'
import DetailModal from './components/DetailModal'
import TokenModal from './components/TokenModal'
import Toast from './components/Toast'
import { HOURS_SECTIONS } from './constants'

export default function App() {
  const { data, loading, error, loadGames, saveGames, token, setToken, clearToken } = useGames()
  const { toast, showToast } = useToast()

  const [modalState, setModalState]   = useState({ open: false, mode: 'add', editData: null })
  const [detailState, setDetailState] = useState({ open: false, game: null, sectionKey: '' })
  const [tokenModalOpen, setTokenModalOpen] = useState(false)

  useEffect(() => {
    if (!token) {
      setTokenModalOpen(true)
    } else {
      loadGames()
    }
  }, [])

  const handleTokenSave = useCallback((tok) => {
    setToken(tok)
    setTokenModalOpen(false)
    loadGames()
  }, [setToken, loadGames])

  const handleChangeToken = useCallback(() => setTokenModalOpen(true), [])
  const handleOpenAdd     = useCallback(() => setModalState({ open: true, mode: 'add', editData: null }), [])

  const handleOpenEdit = useCallback((sectionKey, gameIndex, game) => {
    setDetailState({ open: false, game: null, sectionKey: '' })
    setModalState({ open: true, mode: 'edit', editData: { sectionKey, gameIndex, game } })
  }, [])

  const handleOpenDetail = useCallback((game, sectionKey) => {
    setDetailState({ open: true, game, sectionKey })
  }, [])

  const handleCloseModal  = useCallback(() => setModalState(prev => ({ ...prev, open: false })), [])
  const handleCloseDetail = useCallback(() => setDetailState({ open: false, game: null, sectionKey: '' }), [])

  const handleModalSubmit = useCallback(async ({ section, name, cover, hoursPlayed }) => {
    if (!data) return
    const newData = JSON.parse(JSON.stringify(data))
    const gameObj = { name, cover }
    if (HOURS_SECTIONS.includes(section) && hoursPlayed != null) gameObj.hoursPlayed = hoursPlayed

    if (modalState.mode === 'add') {
      if (!newData[section]) newData[section] = { icon: '🎮', label: section, theme: section, games: [] }
      newData[section].games.push(gameObj)
    } else {
      const { sectionKey: oldSection, gameIndex } = modalState.editData
      newData[oldSection].games.splice(gameIndex, 1)
      if (!newData[section]) newData[section] = { icon: '🎮', label: section, theme: section, games: [] }
      newData[section].games.push(gameObj)
    }

    try {
      await saveGames(newData)
      handleCloseModal()
      showToast(modalState.mode === 'add' ? `"${name}" added!` : `"${name}" updated!`, 'success')
    } catch (e) {
      showToast(`Save failed: ${e.message}`, 'error')
    }
  }, [data, modalState, saveGames, handleCloseModal, showToast])

  const handleDelete = useCallback(async (sectionKey, gameIndex) => {
    if (!data) return
    const game = data[sectionKey]?.games?.[gameIndex]
    if (!game) return
    if (!window.confirm(`Delete "${game.name}"?`)) return
    const newData = JSON.parse(JSON.stringify(data))
    newData[sectionKey].games.splice(gameIndex, 1)
    try {
      await saveGames(newData)
      handleCloseDetail()
      showToast(`"${game.name}" deleted.`, 'info')
    } catch (e) {
      showToast(`Delete failed: ${e.message}`, 'error')
    }
  }, [data, saveGames, handleCloseDetail, showToast])

  const handleDetailDelete = useCallback(() => {
    if (!detailState.game || !data) return
    const { game, sectionKey } = detailState
    const idx = data[sectionKey]?.games?.findIndex(g => g.name === game.name && g.cover === game.cover)
    if (idx == null || idx === -1) return
    handleDelete(sectionKey, idx)
  }, [detailState, data, handleDelete])

  const handleDetailEdit = useCallback(() => {
    if (!detailState.game || !data) return
    const { game, sectionKey } = detailState
    const idx = data[sectionKey]?.games?.findIndex(g => g.name === game.name && g.cover === game.cover)
    if (idx == null || idx === -1) return
    handleOpenEdit(sectionKey, idx, game)
  }, [detailState, data, handleOpenEdit])

  const renderContent = () => {
    if (loading) return (
      <div className="state-center">
        <div className="spinner" />
        <p>Loading your games…</p>
      </div>
    )
    if (error) return (
      <div className="state-center">
        <h3>Could not load games</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={loadGames}>Retry</button>
      </div>
    )
    if (!data) return (
      <div className="state-center">
        <p>Enter your GitHub token to get started.</p>
      </div>
    )
    const sections = Object.entries(data)
    if (sections.length === 0) return (
      <div className="state-center"><p>No sections found in your Gist data.</p></div>
    )
    return sections.map(([key, section]) => (
      <GameSection key={key} sectionKey={key} section={section}
        onEdit={handleOpenEdit} onDelete={handleDelete} onDetail={handleOpenDetail} />
    ))
  }

  return (
    <div className="app-layout">
      <Navbar onAddGame={handleOpenAdd} onChangeToken={handleChangeToken} />
      <main className="main-content">{renderContent()}</main>
      <GameModal isOpen={modalState.open} mode={modalState.mode} sections={data}
        editData={modalState.editData} onClose={handleCloseModal} onSubmit={handleModalSubmit} />
      <DetailModal isOpen={detailState.open} game={detailState.game} sectionKey={detailState.sectionKey}
        onClose={handleCloseDetail} onEdit={handleDetailEdit} onDelete={handleDetailDelete} />
      <TokenModal isOpen={tokenModalOpen} onSave={handleTokenSave} />
      <Toast message={toast.msg} type={toast.type} visible={toast.visible} />
    </div>
  )
}
