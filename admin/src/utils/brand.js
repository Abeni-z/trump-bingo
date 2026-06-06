export const BRAND = 'TRUMP'
export const APP_NAME = 'Trump Bingo'
export const FULL_BRAND = 'TRUMP Bingo'
export const ADMIN_BRAND = 'TRUMP Bingo Admin'

const PAGE_TITLES = {
  '/login': 'Admin Login',
  '/': 'Dashboard',
  '/shops': 'Shop Management',
  '/topups': 'Top-up Requests',
}

export function setPageTitle(pathname) {
  const page = PAGE_TITLES[pathname]
  document.title = page ? `${page} | ${ADMIN_BRAND}` : ADMIN_BRAND
}
