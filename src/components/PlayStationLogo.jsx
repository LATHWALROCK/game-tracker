import React from 'react'

export default function PlayStationLogo({ className = 'ps-logo', size = 18, color = 'currentColor' }) {
  // Proportions match the official 95 x 74 viewBox
  const width = size
  const height = Math.round(size * (74 / 95))

  return (
    <svg
      className={className}
      viewBox="0 0 95 74"
      width={width}
      height={height}
      fill={color}
      aria-hidden="true"
    >
      <path d="M1.9 53.6c-3.6 2.4-2.4 6.9 5.2 9 7.8 2.6 16.4 3.3 24.7 1.9.5 0 .9-.2 1.2-.2v-8.1l-8.1 2.6c-3.1.9-6.2 1.2-9.3.5-2.4-.7-1.9-2.1.9-3.3L33 50.3v-8.8l-22.8 7.8c-2.8 1-5.7 2.4-8.3 4.3M57 18v23c9.7 4.7 17.3 0 17.3-12.3 0-12.6-4.5-18.3-17.6-22.8-6.9-2.4-14-4.5-21.1-5.9v68.6l16.6 5V15.9c0-2.6 0-4.5 1.9-3.8 2.6.7 2.9 3.3 2.9 5.9m30.8 30.2c-6.9-2.4-14.2-3.3-21.4-2.6-3.8.2-7.4 1.2-10.7 2.4l-.7.2v9.3l15.4-5.7c3.1-.9 6.2-1.2 9.3-.5 2.4.7 1.9 2.1-.9 3.3l-23.7 8.8v9l32.7-12.1c2.4-.9 4.5-2.1 6.4-4 1.7-2.4 1-5.8-6.4-8.1" />
    </svg>
  )
}
