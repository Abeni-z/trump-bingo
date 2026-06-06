import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { apiLogin } from '../utils/api.js'
import { useBingoStore } from '../store/bingoStore.js'
import { BrandMark } from '../utils/brand.jsx'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const clearStoreData = useBingoStore(s => s.clearStoreData)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const infoMessage = location.state?.infoMessage

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await apiLogin(username, password)
      const lastShopId = localStorage.getItem('last_shop_id')
      if (lastShopId && lastShopId !== data.shop.id) {
        await clearStoreData()
      }
      localStorage.setItem('last_shop_id', data.shop.id)

      // Pending credits are claimed by App.jsx on mount — no need to do it here
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #FF6B00 0%, #FF3D7F 50%, #7C4DFF 100%)',
      fontFamily: "'Inter', 'Roboto', sans-serif"
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{textAlign: 'center', marginBottom: 32}}>
          <div style={{marginBottom: 8}}><BrandMark size={34} color="#FF6B00" /></div>
          <p style={{color: '#999', fontSize: 14, marginTop: 4}}>Sign in to your TRUMP Bingo shop</p>
        </div>

        {infoMessage && (
          <div style={{
            background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.3)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 16,
            color: '#2E7D32', fontSize: 13, fontWeight: 600
          }}>
            ℹ️ {infoMessage}
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 16,
            color: '#F44336', fontSize: 13, fontWeight: 600
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: 16}}>
          <div>
            <label style={{fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6}}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #E0E0E0',
                fontSize: 15, outline: 'none', boxSizing: 'border-box',
                fontFamily: "'Inter', 'Roboto', sans-serif"
              }}
            />
          </div>

          <div>
            <label style={{fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6}}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #E0E0E0',
                fontSize: 15, outline: 'none', boxSizing: 'border-box',
                fontFamily: "'Inter', 'Roboto', sans-serif"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 50, border: 'none',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #FF6B00, #FF3D7F)',
              color: '#fff', fontWeight: 800, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', 'Roboto', sans-serif", marginTop: 8,
              transition: 'transform 0.15s',
              boxShadow: '0 4px 20px rgba(255,107,0,0.3)'
            }}
          >
            {loading ? '⏳ Signing in...' : '🔑 Sign In'}
          </button>
        </form>

        <div style={{textAlign: 'center', marginTop: 24}}>
          <span style={{color: '#999', fontSize: 13}}>Don't have an account? </span>
          <Link to="/register" style={{color: '#FF6B00', fontWeight: 700, fontSize: 13, textDecoration: 'none'}}>
            Create Shop
          </Link>
        </div>
      </div>
    </div>
  )
}
