import { useRef } from 'react'

/**
 * Click-to-close on a modal overlay that survives a text drag.
 *
 * Checking only `e.target === e.currentTarget` on click is not enough: a click
 * event dispatches on the nearest common ancestor of the mousedown and mouseup
 * targets. So selecting text inside an input and releasing over the overlay
 * fires the handler and throws away the form. Requiring the pointerdown to have
 * landed on the overlay too fixes it.
 */
export function useOverlayClose(onClose) {
  const downOnOverlay = useRef(false)

  return {
    onPointerDown: e => { downOnOverlay.current = e.target === e.currentTarget },
    onClick: e => {
      if (downOnOverlay.current && e.target === e.currentTarget) onClose()
      downOnOverlay.current = false
    },
  }
}
