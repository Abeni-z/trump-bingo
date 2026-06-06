import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../utils/api.js'
import { BRAND, FULL_BRAND } from '../utils/brand.js'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminLogin(username, password)
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
      background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)'
    }}>
      <div className="admin-login-card" style={{
        background: 'white', borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
      }}>
        <div style={{textAlign: 'center', marginBottom: 32}}>
          <div style={{fontFamily: 'Fredoka One', color: '#1A1A2E', fontSize: 32, marginBottom: 4, fontWeight: 900, letterSpacing: 1}}>{BRAND}</div>
          <h1 style={{fontFamily: 'Fredoka One', color: '#1A1A2E', fontSize: 20, margin: 0}}>{FULL_BRAND} Admin</h1>
          <p style={{color: '#999', fontSize: 13, marginTop: 4}}>Management Dashboard</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 16,
            color: '#F44336', fontSize: 13, fontWeight: 600
          }}>⚠️ {error}</div>
        )}

        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: 16}}>
          <div>
            <label style={{fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6}}>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" required
              style={{width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #E0E0E0', fontSize: 15, outline: 'none', boxSizing: 'border-box'}} />
          </div>
          <div>
            <label style={{fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6}}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required
              style={{width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #E0E0E0', fontSize: 15, outline: 'none', boxSizing: 'border-box'}} />
          </div>
          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 50, border: 'none',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #1A1A2E, #0F3460)',
              color: '#fff', fontWeight: 800, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8,
              boxShadow: '0 4px 20px rgba(26,26,46,0.4)'
            }}>
            {loading ? '⏳ Signing in...' : '🔐 Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
