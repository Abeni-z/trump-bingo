import React, { useEffect } from 'react'
import { Routes, Route, NavLink, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useBingoStore } from './store/bingoStore.js'
import { isLoggedIn, apiLogout, getShopInfo, apiClaimPendingCredits } from './utils/api.js'
import { setPageTitle, BrandMark } from './utils/brand.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Registration from './pages/Registration.jsx'
import Game from './pages/Game.jsx'
import CardManager from './pages/CardManager.jsx'
import Report from './pages/Report.jsx'

// Auth guard — redirects to login if not authenticated
function RequireAuth({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const loadFromDB = useBingoStore(s => s.loadFromDB)
  const dbLoaded = useBingoStore(s => s.dbLoaded)
  const addBalance = useBingoStore(s => s.addBalance)

  // Load persisted data from IndexedDB on mount
  useEffect(() => {
    loadFromDB()
  }, [])

  // Sync pending credits from server when logged in
  useEffect(() => {
    if (dbLoaded && isLoggedIn()) {
      apiClaimPendingCredits()
        .then(data => {
          if (data && data.pending_credits > 0) {
            addBalance(data.pending_credits)
          }
        })
        .catch(() => {}) // Silently fail if offline
    }
  }, [dbLoaded])

  useEffect(() => {
    setPageTitle(location.pathname)
  }, [location.pathname])

  // Pages where the nav bar should be hidden
  const hideNav = ['/', '/game', '/login', '/register'].includes(location.pathname)

  if (!dbLoaded) {
    return (
      <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily: "'Inter', 'Roboto', sans-serif"}}>
        <div style={{textAlign:'center'}}>
          <div style={{marginBottom:16}}><BrandMark size={36} color="var(--orange)" /></div>
          <div style={{fontSize:16, fontWeight:700, color:'var(--orange)'}}>Loading TRUMP Bingo...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {!hideNav && <Nav />}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route path="/" element={<RequireAuth><Registration /></RequireAuth>} />
        <Route path="/game" element={<RequireAuth><Game /></RequireAuth>} />
        <Route path="/cards" element={<RequireAuth><CardManager /></RequireAuth>} />
        <Route path="/report" element={<RequireAuth><Report /></RequireAuth>} />
      </Routes>
    </>
  )
}

function Nav() {
  const navigate = useNavigate()
  const shopInfo = getShopInfo()
  const clearStoreData = useBingoStore(s => s.clearStoreData)

  function handleLogout() {
    if (!window.confirm('Are you sure you want to logout?')) return
    apiLogout()
    clearStoreData().then(() => {
      navigate('/login')
    })
  }

  return (
    <nav className="nav">
      <span className="brand"><BrandMark size={26} color="white" /></span>
      <div className="nav-links">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/cards">Cards</NavLink>
        <NavLink to="/report">Report</NavLink>
        <button onClick={handleLogout} style={{background: 'rgba(244,67,54,0.8)'}}>
          🚪 Logout
        </button>
      </div>
    </nav>
  )
}
