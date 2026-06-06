import React from 'react'

export const BRAND = 'TRUMP'
export const APP_NAME = 'Trump Bingo'
export const FULL_BRAND = 'TRUMP Bingo'

const PAGE_TITLES = {
  '/': 'Card Registration',
  '/game': 'Live Game',
  '/cards': 'Card Manager',
  '/report': 'Reports & Top-up',
  '/login': 'Shop Login',
  '/register': 'Create Shop',
}

export function setPageTitle(pathname) {
  const page = PAGE_TITLES[pathname]
  document.title = page ? `${page} | ${FULL_BRAND}` : FULL_BRAND
}

export function BrandMark({ size = 26, color = 'inherit', subtitle = 'Bingo', style = {} }) {
  return (
    <span style={{ fontFamily: 'Fredoka One', letterSpacing: '1px', display: 'inline-flex', alignItems: 'baseline', gap: 6, ...style }}>
      <span style={{ fontSize: size, fontWeight: 900, color }}>{BRAND}</span>
      {subtitle && (
        <span style={{ fontSize: Math.round(size * 0.55), fontWeight: 700, color, opacity: 0.95 }}>{subtitle}</span>
      )}
    </span>
  )
}
