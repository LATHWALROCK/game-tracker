import React from 'react'
export default function Toast({ message, type = 'success', visible }) {
  return (
    <div className={`toast toast--${type} ${visible ? 'toast--visible' : ''}`}>
      {type === 'success' && <span className="toast-icon">✓</span>}
      {type === 'error'   && <span className="toast-icon">✕</span>}
      {type === 'info'    && <span className="toast-icon">ℹ</span>}
      <span>{message}</span>
    </div>
  )
}
