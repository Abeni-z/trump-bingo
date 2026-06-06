import React, { useState, useEffect } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { isAdminLoggedIn, adminLogout } from './utils/api.js'
import { setPageTitle, BRAND, FULL_BRAND } from './utils/brand.js'
import AdminLogin from './pages/AdminLogin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ShopManagement from './pages/ShopManagement.jsx'
import TopupRequests from './pages/TopupRequests.jsx'

function RequireAdmin({ children }) {
  if (!isAdminLoggedIn()) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const location = useLocation()

  useEffect(() => {
    setPageTitle(location.pathname)
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route path="/*" element={
        <RequireAdmin>
          <AdminLayout />
        </RequireAdmin>
      } />
    </Routes>
  )
}

function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setMenuOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  function handleLogout() {
    adminLogout()
    navigate('/login')
  }

  const links = [
    { to: '/', label: '📊 Dashboard', end: true },
    { to: '/shops', label: '🏪 Shops' },
    { to: '/topups', label: '💳 Top-ups' },
  ]

  const sidebarContent = (
    <>
      <div className="admin-sidebar-header">
        <div style={{fontSize: 22, fontWeight: 900, fontFamily: 'Fredoka One', letterSpacing: 1}}>{BRAND}</div>
        <div style={{fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4}}>{FULL_BRAND} Admin</div>
      </div>

      <nav className="admin-sidebar-nav">
        {links.map(link => (
          <NavLink key={link.to} to={link.to} end={link.end}
            className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
            onClick={() => isMobile && setMenuOpen(false)}>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <button onClick={handleLogout} className="admin-logout-btn">
          🚪 Logout
        </button>
      </div>
    </>
  )

  return (
    <div className="admin-layout">
      {isMobile && menuOpen && (
        <div className="admin-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      {isMobile && (
        <header className="admin-mobile-header">
          <button
            type="button"
            className="admin-menu-btn"
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span className="admin-menu-icon">
              <span />
              <span />
              <span />
            </span>
          </button>
          <span className="admin-mobile-title">{BRAND} Admin</span>
        </header>
      )}

      <aside className={`admin-sidebar${isMobile ? ' mobile' : ''}${menuOpen ? ' open' : ''}`}>
        {sidebarContent}
      </aside>

      <main className="admin-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/shops" element={<ShopManagement />} />
          <Route path="/topups" element={<TopupRequests />} />
        </Routes>
      </main>
    </div>
  )
}
