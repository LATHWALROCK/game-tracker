import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Cover from './Cover'
import PlayStationLogo from './PlayStationLogo'
import SplitGameModal from './SplitGameModal'
import MappingsManagerModal from './MappingsManagerModal'
import { generatePsnDiff, normalizeTitle } from '../utils/psnDiff'
import { useOverlayClose } from '../hooks/useOverlayClose'

export default function PsnSyncModal({ isOpen, library, onClose, onApprove }) {
  const [step, setStep] = useState('input') // 'input' | 'loading' | 'review'
  const [session, setSession] = useState({ checking: true, loggedIn: false, onlineId: null })
  const [npsso, setNpsso] = useState('')
  const [error, setError] = useState(null)
  const [changes, setChanges] = useState([])
  const [rawPsnGames, setRawPsnGames] = useState([])
  const [localMappings, setLocalMappings] = useState({})

  // Sub-modals for splitting and managing rules
  const [splitModal, setSplitModal] = useState({ open: false, bundleGame: null })
  const [mappingsModalOpen, setMappingsModalOpen] = useState(false)

  // Review Filters & Tabs
  const [activeTab, setActiveTab] = useState('changes') // 'changes' | 'new' | 'update' | 'uptodate' | 'all'
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyHours, setOnlyHours] = useState(false)
  const [onlySelected, setOnlySelected] = useState(false)

  const overlayProps = useOverlayClose(onClose)

  // Check persistent session on modal open & sync mappings
  const checkSession = useCallback(async () => {
    try {
      setSession(prev => ({ ...prev, checking: true }))
      const res = await fetch('/api/psn')
      const data = await res.json()
      if (data.loggedIn) {
        setSession({ checking: false, loggedIn: true, onlineId: data.onlineId })
      } else {
        setSession({ checking: false, loggedIn: false, onlineId: null })
      }
    } catch (_) {
      setSession({ checking: false, loggedIn: false, onlineId: null })
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setStep('input')
      setActiveTab('changes')
      setSearchQuery('')
      setOnlyHours(false)
      setOnlySelected(false)
      setLocalMappings(library?._psn_mappings || {})
      checkSession()
    }
  }, [isOpen, library, checkSession])

  const handleFetch = async () => {
    setError(null)
    setStep('loading')

    try {
      const res = await fetch('/api/psn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync',
          npsso: npsso.trim() ? npsso.trim() : undefined
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}: Failed to sync with PlayStation`)
      }

      const games = data.games || []
      setRawPsnGames(games)

      const diff = generatePsnDiff({ ...library, _psn_mappings: localMappings }, games)
      setChanges(diff.changes)
      if (data.onlineId) {
        setSession(prev => ({ ...prev, loggedIn: true, onlineId: data.onlineId }))
      }
      setStep('review')
    } catch (err) {
      setError(err.message)
      setStep('input')
    }
  }

  // Handle explicit login
  const handleLogin = async (e) => {
    if (e) e.preventDefault()
    if (!npsso.trim()) {
      setError('Please paste your 64-character NPSSO token to sign in.')
      return
    }

    setError(null)
    setStep('loading')

    try {
      const res = await fetch('/api/psn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          npsso: npsso.trim()
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in to PlayStation Network.')
      }

      setSession({ checking: false, loggedIn: true, onlineId: data.onlineId })
      setNpsso('')
      await handleFetch()
    } catch (err) {
      setError(err.message)
      setStep('input')
    }
  }

  // Handle explicit logout
  const handleLogout = async () => {
    try {
      await fetch('/api/psn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      })
      setSession({ checking: false, loggedIn: false, onlineId: null })
      setChanges([])
      setError(null)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  // Handle saving a split collection
  const handleSaveSplit = (bundleTitle, splitMapping) => {
    const norm = normalizeTitle(bundleTitle)
    const nextMappings = { ...localMappings, [norm]: splitMapping }
    setLocalMappings(nextMappings)

    // Recompute diff immediately with raw games
    if (rawPsnGames.length > 0) {
      const diff = generatePsnDiff({ ...library, _psn_mappings: nextMappings }, rawPsnGames)
      setChanges(diff.changes)
    }
  }

  // Handle ignoring a game so it never shows again
  const handleIgnoreGame = (title) => {
    const norm = normalizeTitle(title)
    const nextMappings = {
      ...localMappings,
      [norm]: { type: 'ignore', originalTitle: title, createdAt: Date.now() }
    }
    setLocalMappings(nextMappings)

    // Recompute diff immediately so it disappears from review list
    if (rawPsnGames.length > 0) {
      const diff = generatePsnDiff({ ...library, _psn_mappings: nextMappings }, rawPsnGames)
      setChanges(diff.changes)
    }
  }

  // Handle deleting a mapping / restoring a game
  const handleRemoveMapping = (key) => {
    const nextMappings = { ...localMappings }
    delete nextMappings[key]
    setLocalMappings(nextMappings)

    if (rawPsnGames.length > 0) {
      const diff = generatePsnDiff({ ...library, _psn_mappings: nextMappings }, rawPsnGames)
      setChanges(diff.changes)
    }
  }

  const toggleChange = (id) => {
    setChanges(prev =>
      prev.map(c => {
        if (c.id === id) {
          if (c.type === 'UP_TO_DATE') return c
          return { ...c, selected: !c.selected }
        }
        return c
      })
    )
  }

  const handleSectionChange = (id, newSection) => {
    setChanges(prev =>
      prev.map(c => (c.id === id ? { ...c, targetSection: newSection } : c))
    )
  }

  const handleBatchSetSection = (newSection) => {
    setChanges(prev =>
      prev.map(c => (c.type === 'ADD_GAME' ? { ...c, targetSection: newSection } : c))
    )
  }

  const selectVisible = (selected) => {
    const visibleIds = new Set(
      filteredChanges.filter(c => c.type !== 'UP_TO_DATE').map(c => c.id)
    )
    setChanges(prev =>
      prev.map(c => (visibleIds.has(c.id) ? { ...c, selected } : c))
    )
  }

  const selectOnlyWithHours = () => {
    setChanges(prev =>
      prev.map(c => {
        if (c.type === 'UP_TO_DATE') return c
        const hours = c.type === 'ADD_GAME' ? (c.hoursPlayed || 0) : (c.newHours || 0)
        return { ...c, selected: hours > 0 }
      })
    )
  }

  // Reactive counts
  const newCount = useMemo(() => changes.filter(c => c.type === 'ADD_GAME').length, [changes])
  const updateCount = useMemo(() => changes.filter(c => c.type === 'UPDATE_HOURS').length, [changes])
  const upToDateCount = useMemo(() => changes.filter(c => c.type === 'UP_TO_DATE').length, [changes])
  const changesCount = newCount + updateCount
  const allCount = changes.length
  const selectedCount = useMemo(() => changes.filter(c => c.selected && c.type !== 'UP_TO_DATE').length, [changes])
  const mappingsCount = Object.keys(localMappings).length

  // Filtered list
  const filteredChanges = useMemo(() => {
    return changes.filter(item => {
      // 1. Tab filter
      if (activeTab === 'changes' && item.type === 'UP_TO_DATE') return false
      if (activeTab === 'new' && item.type !== 'ADD_GAME') return false
      if (activeTab === 'update' && item.type !== 'UPDATE_HOURS') return false
      if (activeTab === 'uptodate' && item.type !== 'UP_TO_DATE') return false

      // 2. Search query filter
      const name = (item.name || item.gameName || '').toLowerCase()
      if (searchQuery.trim() && !name.includes(searchQuery.toLowerCase().trim())) {
        return false
      }

      // 3. Playtime filter chip
      const hours = item.type === 'ADD_GAME'
        ? (item.hoursPlayed || 0)
        : (item.newHours != null ? item.newHours : (item.hoursPlayed || 0))
      if (onlyHours && hours <= 0) return false

      // 4. Selection filter chip
      if (onlySelected && !item.selected) return false

      return true
    })
  }, [changes, activeTab, searchQuery, onlyHours, onlySelected])

  const sectionsList = library
    ? Object.entries(library)
        .filter(([key, sec]) => !key.startsWith('_') && sec?.games)
        .map(([key, sec]) => ({ key, label: sec.label, icon: sec.icon }))
    : []

  const handleCommit = (e) => {
    if (e) e.preventDefault()
    const approved = changes.filter(c => c.selected && c.type !== 'UP_TO_DATE')
    onApprove(approved, localMappings)
    onClose()
  }

  // Hook rules: unconditional return is at the bottom
  if (!isOpen) return null

  return (
    <div className="modal-overlay" {...overlayProps}>
      <div className={`modal modal--psn-sync ${step === 'review' ? 'modal--psn-sync-wide' : ''}`}>
        {/* Header */}
        <div className="modal-header">
          <div className="psn-header-titles">
            <h2 className="modal-title">
              <PlayStationLogo size={22} className="psn-badge-icon" color="#0070d1" />
              PlayStation Network
            </h2>
            <p className="modal-subtitle">
              {step === 'review'
                ? 'Review detected games and playtime. Nothing is saved until you approve.'
                : session.loggedIn
                ? `Connected as ${session.onlineId}. Session is persistent and auto-refreshed.`
                : 'Sign in to PlayStation to enable 1-click persistent library sync.'}
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* STEP 1: INPUT / CONNECTED ACCOUNT VIEW */}
        {step === 'input' && (
          <div className="psn-step-input">
            {error && (
              <div className="psn-error-banner">
                <span>⚠️</span>
                <div>{error}</div>
              </div>
            )}

            {/* IF USER IS ALREADY CONNECTED (PERSISTENT LOGIN) */}
            {session.loggedIn && !session.checking ? (
              <div className="psn-connected-card">
                <div className="psn-connected-badge">
                  <span className="psn-connected-dot" aria-hidden="true" />
                  <span>Session Active</span>
                </div>

                <div className="psn-user-row">
                  <div className="psn-avatar-circle" aria-hidden="true">
                    🎮
                  </div>
                  <div className="psn-user-details">
                    <span className="psn-user-name">{session.onlineId}</span>
                    <span className="psn-user-sub">PlayStation Network Account</span>
                  </div>
                </div>

                <p className="psn-connected-desc">
                  Your PlayStation credentials are saved. You can fetch your latest played games and hours in 1 click anytime.
                </p>

                <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleLogout}
                    title="Disconnect this PlayStation account"
                  >
                    Disconnect Account
                  </button>
                  <button
                    type="button"
                    className="btn btn-psn"
                    onClick={() => handleFetch()}
                  >
                    <PlayStationLogo size={16} />
                    <span>Sync PlayStation Games →</span>
                  </button>
                </div>
              </div>
            ) : (
              /* IF USER NEEDS TO SIGN IN */
              <div className="psn-login-flow">
                <div className="psn-login-intro">
                  <p>
                    Connect your PlayStation account to sync recent titles and hours. Sign in once and your session will stay active like on PlayStation.com.
                  </p>
                </div>

                {/* Step 1 & 2 helper links */}
                <div className="psn-login-steps">
                  <div className="psn-step-item">
                    <span className="psn-step-num">1</span>
                    <div className="psn-step-desc">
                      <span>Sign in to Sony's official portal</span>
                      <a
                        href="https://www.playstation.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-tiny btn-ghost"
                        style={{ marginTop: '0.35rem', alignSelf: 'flex-start' }}
                      >
                        Open PlayStation.com ↗
                      </a>
                    </div>
                  </div>

                  <div className="psn-step-item">
                    <span className="psn-step-num">2</span>
                    <div className="psn-step-desc">
                      <span>Copy your 64-character session token</span>
                      <a
                        href="https://ca.account.sony.com/api/v1/ssocookie"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-tiny btn-ghost"
                        style={{ marginTop: '0.35rem', alignSelf: 'flex-start' }}
                      >
                        Get Token from Sony ↗
                      </a>
                    </div>
                  </div>
                </div>

                {/* Step 3: Paste and persist */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label htmlFor="psn-token">PlayStation Token (NPSSO)</label>
                  <input
                    id="psn-token"
                    type="password"
                    value={npsso}
                    onChange={e => setNpsso(e.target.value)}
                    placeholder="Paste your 64-character token here…"
                    autoFocus
                  />
                  <span className="form-help">
                    Your token is exchanged for a rolling session that automatically renews.
                  </span>
                </div>

                <div className="modal-footer" style={{ marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-psn"
                    onClick={handleLogin}
                    disabled={!npsso.trim()}
                  >
                    <PlayStationLogo size={16} />
                    <span>Sign In & Connect</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: LOADING */}
        {step === 'loading' && (
          <div className="psn-step-loading">
            <div className="psn-spinner" aria-hidden="true" />
            <p className="psn-loading-title">Connecting to PlayStation Network…</p>
            <p className="psn-loading-sub">Fetching your played games and recorded hours</p>
          </div>
        )}

        {/* STEP 3: REVIEW / STAGING */}
        {step === 'review' && (
          <div className="psn-step-review">
            {/* Top Toolbar: Search + Filter Tabs */}
            <div className="psn-toolbar">
              {/* Search box */}
              <div className="psn-search-box">
                <span className="psn-search-icon" aria-hidden="true">🔍</span>
                <input
                  type="text"
                  placeholder="Search detected games…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="psn-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="psn-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Segmented Filter Tabs */}
              <div className="psn-filter-tabs" role="tablist">
                <button
                  type="button"
                  className={`psn-tab ${activeTab === 'changes' ? 'psn-tab--active' : ''}`}
                  onClick={() => setActiveTab('changes')}
                  role="tab"
                  aria-selected={activeTab === 'changes'}
                >
                  <span>Changes</span>
                  <span className="psn-tab-badge psn-tab-badge--changes">{changesCount}</span>
                </button>

                <button
                  type="button"
                  className={`psn-tab ${activeTab === 'new' ? 'psn-tab--active' : ''}`}
                  onClick={() => setActiveTab('new')}
                  role="tab"
                  aria-selected={activeTab === 'new'}
                >
                  <span>+ New</span>
                  <span className="psn-tab-badge psn-tab-badge--new">{newCount}</span>
                </button>

                <button
                  type="button"
                  className={`psn-tab ${activeTab === 'update' ? 'psn-tab--active' : ''}`}
                  onClick={() => setActiveTab('update')}
                  role="tab"
                  aria-selected={activeTab === 'update'}
                >
                  <span>⏱ Updates</span>
                  <span className="psn-tab-badge psn-tab-badge--update">{updateCount}</span>
                </button>

                <button
                  type="button"
                  className={`psn-tab ${activeTab === 'uptodate' ? 'psn-tab--active' : ''}`}
                  onClick={() => setActiveTab('uptodate')}
                  role="tab"
                  aria-selected={activeTab === 'uptodate'}
                >
                  <span>✓ Up to date</span>
                  <span className="psn-tab-badge psn-tab-badge--uptodate">{upToDateCount}</span>
                </button>

                <button
                  type="button"
                  className={`psn-tab ${activeTab === 'all' ? 'psn-tab--active' : ''}`}
                  onClick={() => setActiveTab('all')}
                  role="tab"
                  aria-selected={activeTab === 'all'}
                >
                  <span>All</span>
                  <span className="psn-tab-badge">{allCount}</span>
                </button>
              </div>
            </div>

            {/* Sub-bar: Action Controls & Status */}
            <div className="psn-sub-bar">
              <div className="psn-sub-info">
                {activeTab === 'uptodate' ? (
                  <span className="psn-sub-count">
                    Showing <strong>{filteredChanges.length}</strong> of {upToDateCount} up-to-date {upToDateCount === 1 ? 'game' : 'games'}
                  </span>
                ) : (
                  <span className="psn-sub-count">
                    Showing <strong>{filteredChanges.length}</strong> {filteredChanges.length === 1 ? 'game' : 'games'}
                    {selectedCount > 0 && (
                      <span className="psn-selected-pill">
                        • <strong>{selectedCount}</strong> selected to save
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="psn-action-controls">
                {/* Selection controls (only when viewing actionable items) */}
                {activeTab !== 'uptodate' && (
                  <div className="psn-btn-group">
                    <button
                      type="button"
                      className="btn btn-tiny btn-ghost"
                      onClick={() => selectVisible(true)}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn btn-tiny btn-ghost"
                      onClick={() => selectVisible(false)}
                    >
                      Deselect
                    </button>
                  </div>
                )}

                {/* Quick Toggle Chips */}
                <div className="psn-chip-group">
                  <button
                    type="button"
                    className={`psn-toggle-chip ${onlyHours ? 'psn-toggle-chip--active' : ''}`}
                    onClick={() => setOnlyHours(prev => !prev)}
                    title="Filter only games with playtime > 0 hours"
                  >
                    ⏱ &gt;0h Only
                  </button>

                  {activeTab !== 'uptodate' && (
                    <button
                      type="button"
                      className={`psn-toggle-chip ${onlySelected ? 'psn-toggle-chip--active' : ''}`}
                      onClick={() => setOnlySelected(prev => !prev)}
                      title="Filter only selected changes"
                    >
                      ☑ Selected Only
                    </button>
                  )}
                </div>

                {/* Batch section setter for new games */}
                {newCount > 0 && activeTab !== 'update' && activeTab !== 'uptodate' && (
                  <div className="psn-batch-section-wrap">
                    <span className="psn-batch-label">Add new to:</span>
                    <select
                      className="psn-select psn-select--batch"
                      onChange={e => {
                        if (e.target.value) handleBatchSetSection(e.target.value)
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Choose section…</option>
                      {sectionsList.map(sec => (
                        <option key={sec.key} value={sec.key}>
                          {sec.icon} {sec.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Mappings / Rules button */}
                <button
                  type="button"
                  className="btn btn-tiny btn-ghost psn-rules-btn"
                  onClick={() => setMappingsModalOpen(true)}
                  title="View and manage split collections and ignored titles"
                >
                  ⚙️ Mappings ({mappingsCount})
                </button>
              </div>
            </div>

            {/* List of Changes */}
            {filteredChanges.length === 0 ? (
              <div className="psn-empty-state">
                <span className="psn-empty-icon" aria-hidden="true">
                  {activeTab === 'uptodate' ? '🎮' : changesCount === 0 ? '🎉' : '🔍'}
                </span>
                <p className="psn-empty-title">
                  {activeTab === 'uptodate'
                    ? 'No Up-to-Date Games'
                    : changesCount === 0
                    ? 'All Caught Up!'
                    : 'No matching games found'}
                </p>
                <p className="psn-empty-text">
                  {activeTab === 'uptodate'
                    ? 'All detected games have playtime updates or need to be added to your library.'
                    : changesCount === 0
                    ? 'Your tracked library already matches your recent PlayStation playtime.'
                    : 'Try adjusting your search or toggle chips.'}
                </p>
                {(searchQuery || onlyHours || onlySelected || activeTab !== 'changes') && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-tiny"
                    style={{ marginTop: '0.75rem' }}
                    onClick={() => {
                      setSearchQuery('')
                      setOnlyHours(false)
                      setOnlySelected(false)
                      setActiveTab('changes')
                    }}
                  >
                    Reset to All Changes
                  </button>
                )}
              </div>
            ) : (
              <div className="psn-changes-list">
                {filteredChanges.map((item) => {
                  const isUpToDate = item.type === 'UP_TO_DATE'
                  const isNew = item.type === 'ADD_GAME'
                  const titleName = item.name || item.gameName
                  const hoursNum = isNew
                    ? (item.hoursPlayed || 0)
                    : (item.newHours != null ? item.newHours : (item.hoursPlayed || 0))

                  return (
                    <div
                      key={item.id}
                      className={`psn-change-card ${
                        isUpToDate
                          ? 'psn-change-card--uptodate'
                          : item.selected
                          ? 'psn-change-card--selected'
                          : ''
                      }`}
                      onClick={() => {
                        if (!isUpToDate) toggleChange(item.id)
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (!isUpToDate && (e.key === ' ' || e.key === 'Enter')) {
                          e.preventDefault()
                          toggleChange(item.id)
                        }
                      }}
                    >
                      {/* Checkbox or Up-to-date indicator */}
                      {isUpToDate ? (
                        <div className="psn-card-check psn-card-check--uptodate" title="In library • Up to date">
                          <span className="psn-check-icon">✓</span>
                        </div>
                      ) : (
                        <label
                          className="psn-card-check"
                          onClick={e => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleChange(item.id)}
                          />
                        </label>
                      )}

                      <div className="psn-card-cover">
                        <Cover
                          src={item.cover}
                          alt={titleName}
                          className="psn-thumb"
                          placeholderClassName="psn-thumb-placeholder"
                        />
                      </div>

                      <div className="psn-card-info">
                        <div className="psn-card-top">
                          <span className="psn-card-title" title={titleName}>
                            {titleName}
                          </span>
                          <span
                            className={`psn-type-badge ${
                              isUpToDate
                                ? 'psn-type-badge--uptodate'
                                : isNew
                                ? 'psn-type-badge--new'
                                : 'psn-type-badge--hours'
                            }`}
                          >
                            {isUpToDate ? '✓ In Sync' : isNew ? '+ New Game' : '⏱ Playtime'}
                          </span>
                        </div>

                        {/* From bundle indicator if mapped */}
                        {item.fromBundle && (
                          <span className="psn-from-bundle-tag">
                            From bundle: {item.fromBundle}
                          </span>
                        )}

                        {/* Details row */}
                        <div className="psn-card-diff">
                          {isUpToDate ? (
                            <div className="psn-diff-row psn-diff-row--uptodate">
                              <span className="psn-hours-synced">
                                ⏱ {item.hoursPlayed || 0} hrs
                              </span>
                              <span className="psn-section-tag">
                                {item.sectionIcon} {item.sectionLabel || item.sectionKey}
                              </span>
                              <span className="psn-uptodate-text">Matches library</span>
                            </div>
                          ) : isNew ? (
                            <div className="psn-diff-row">
                              <span className="psn-diff-hours">
                                {item.hoursPlayed > 0 ? `${item.hoursPlayed}h on PSN` : '0h (unplayed)'}
                              </span>
                              <div className="psn-section-picker">
                                <span className="psn-picker-label">Target:</span>
                                <select
                                  value={item.targetSection}
                                  onClick={e => e.stopPropagation()}
                                  onChange={e => handleSectionChange(item.id, e.target.value)}
                                  className="psn-select"
                                >
                                  {sectionsList.map(sec => (
                                    <option key={sec.key} value={sec.key}>
                                      {sec.icon} {sec.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div className="psn-diff-row">
                              <span className="psn-hours-old">{item.currentHours}h</span>
                              <span className="psn-arrow" aria-hidden="true">→</span>
                              <span className="psn-hours-new">{item.newHours}h</span>
                              {item.diffHours > 0 && (
                                <span className="psn-diff-delta">+{item.diffHours}h</span>
                              )}
                              {item.diffHours < 0 && (
                                <span className="psn-diff-delta psn-diff-delta--negative">{item.diffHours}h</span>
                              )}
                              {item.updateCover && (
                                <span className="psn-cover-updated-tag">Art found</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Multi-version detected banner if game has PS4/PS5 or multiple entries */}
                        {item.hasMultipleVersions && item.versions && item.versions.length > 1 && (
                          <div className="psn-versions-detected">
                            <span className="psn-version-label">
                              🎮 Multi-version: {item.versions.map(v => {
                                const cat = v.category ? (v.category.includes('ps5') ? 'PS5' : v.category.includes('ps4') ? 'PS4' : 'PS') : 'PS'
                                return `${cat}: ${v.hours}h`
                              }).join(' • ')}
                            </span>
                            {item.sumHours && item.type === 'UPDATE_HOURS' && (
                              <button
                                type="button"
                                className="psn-combine-toggle"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const isCombined = item.newHours === item.sumHours
                                  const target = isCombined
                                    ? Math.max(...item.versions.map(v => v.hours))
                                    : item.sumHours
                                  setChanges(prev =>
                                    prev.map(c =>
                                      c.id === item.id
                                        ? {
                                            ...c,
                                            newHours: target,
                                            diffHours: Math.round((target - c.currentHours) * 10) / 10
                                          }
                                        : c
                                    )
                                  )
                                }}
                                title="Toggle between single highest version and combined sum"
                              >
                                {item.newHours === item.sumHours
                                  ? `↺ Use highest (${Math.max(...item.versions.map(v => v.hours))}h)`
                                  : `➕ Combine (${item.sumHours}h)`}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Actions for Collections / Individual Games: Split & Ignore */}
                        <div className="psn-card-actions-bar" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn btn-tiny btn-ghost psn-action-btn"
                            onClick={() => {
                              setSplitModal({
                                open: true,
                                bundleGame: item.originalPsnGame || {
                                  name: item.fromBundle || titleName,
                                  hoursPlayed: item.originalPsnGame?.hoursPlayed || hoursNum,
                                  cover: item.cover || ''
                                }
                              })
                            }}
                            title={item.fromBundle ? `Edit collection split for "${item.fromBundle}"` : 'Divide this collection into multiple separate games'}
                          >
                            ✂️ {item.fromBundle ? `Edit Split (${item.fromBundle})` : 'Split Collection'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-tiny btn-ghost psn-action-btn psn-action-btn--ignore"
                            onClick={() => handleIgnoreGame(titleName)}
                            title="Never show this game again in future syncs"
                          >
                            🚫 Ignore
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Actions */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep('input')}
              >
                ← Back
              </button>
              <div className="psn-footer-right">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onClose}
                >
                  Discard
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={selectedCount === 0}
                  onClick={handleCommit}
                >
                  Approve & Save ({selectedCount})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Split Game Collection Sub-Modal */}
      <SplitGameModal
        isOpen={splitModal.open}
        bundleGame={splitModal.bundleGame}
        library={library}
        onClose={() => setSplitModal({ open: false, bundleGame: null })}
        onSaveSplit={handleSaveSplit}
      />

      {/* Mappings & Rules Manager Sub-Modal */}
      <MappingsManagerModal
        isOpen={mappingsModalOpen}
        mappings={localMappings}
        onClose={() => setMappingsModalOpen(false)}
        onRemoveMapping={handleRemoveMapping}
      />
    </div>
  )
}
