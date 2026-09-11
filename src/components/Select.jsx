import React, { useEffect, useRef, useState } from 'react'

/**
 * Themed dropdown replacing the native <select>, whose option list is drawn by
 * the OS and can't be styled (it renders as a white list on a dark app).
 *
 * options: [{ value, label }]
 */
export default function Select({ value, options, onChange, label, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const rootRef    = useRef(null)
  const triggerRef = useRef(null)
  const menuRef    = useRef(null)

  const current = options.find(o => o.value === value) || options[0]

  // Close on outside click / Escape, and move focus into the menu when it opens.
  useEffect(() => {
    if (!open) return

    const handlePointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()          // don't let a parent modal close too
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    // Focus the selected option so arrow keys work immediately.
    menuRef.current?.querySelector('[aria-selected="true"]')?.focus()

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const pick = (v) => {
    onChange(v)
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Arrow keys roll through the options without leaving the menu.
  const handleMenuKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...menuRef.current.querySelectorAll('.sel-option')]
    const at    = items.indexOf(document.activeElement)
    const next  = e.key === 'ArrowDown'
      ? (at + 1) % items.length
      : (at - 1 + items.length) % items.length
    items[next]?.focus()
  }

  return (
    <div className="sel" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`sel-trigger${open ? ' sel-trigger--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true) }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className="sel-value">{current?.label}</span>
        <svg className="sel-chevron" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor"
                strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className={`sel-menu sel-menu--${align}`}
          role="listbox"
          aria-label={label}
          ref={menuRef}
          onKeyDown={handleMenuKeyDown}
        >
          {options.map(o => {
            const selected = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={`sel-option${selected ? ' sel-option--active' : ''}`}
                onClick={() => pick(o.value)}
              >
                <span className="sel-option-label">{o.label}</span>
                {selected && (
                  <svg className="sel-check" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.5 6.5 5 9l4.5-6" fill="none" stroke="currentColor"
                          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
