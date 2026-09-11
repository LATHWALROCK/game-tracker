import React, { useEffect, useState } from 'react'

/**
 * Cover art with a working fallback.
 *
 * The previous inline `onError={e => e.target.style.display = 'none'}` left an
 * empty box rather than the placeholder, and React clobbered the direct DOM
 * mutation on the next render. Tracking failure in state renders the real
 * placeholder branch instead.
 */
export default function Cover({
  src, alt = '', className, placeholderClassName, placeholder = '🎮', ...rest
}) {
  const [failed, setFailed] = useState(false)

  // Load-bearing: without this a new URL keeps showing the placeholder, which
  // would make the add/edit preview useless after a bad paste is corrected.
  useEffect(() => { setFailed(false) }, [src])

  if (!src || failed) {
    return (
      <div className={placeholderClassName} aria-hidden="true">{placeholder}</div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      draggable={false}
      // Some image hosts 403 on an unrecognised referer, which reads as
      // randomly broken art.
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      {...rest}
    />
  )
}
