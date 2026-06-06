import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiRegister } from '../utils/api.js'
import { useBingoStore } from '../store/bingoStore.js'
import { BrandMark } from '../utils/brand.jsx'

export default function Register() {
  const navigate = useNavigate()
  const setBalance = useBingoStore(s => s.setBalance)
  const [form, setForm] = useState({ shop_name: '', username: '', password: '', phone: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.shop_name || !form.username || !form.password || !form.phone) {
      setError('All fields are required')
      return
    }

    if (form.password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }

    setLoading(true)
    try {
      const res = await apiRegister(form.shop_name, form.username, form.password, form.phone)
      navigate('/login', { state: { infoMessage: res.message || 'Registration request sent successfully. Please wait for admin approval.' } })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #7C4DFF 0%, #00BCD4 50%, #00C853 100%)',
      fontFamily: "'Inter', 'Roboto', sans-serif"
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{textAlign: 'center', marginBottom: 28}}>
          <div style={{marginBottom: 8}}><BrandMark size={30} color="#7C4DFF" /></div>
          <h1 style={{fontFamily: 'Fredoka One', color: '#7C4DFF', fontSize: 22, margin: 0}}>Create Shop</h1>
          <p style={{color: '#999', fontSize: 14, marginTop: 4}}>Register your TRUMP Bingo shop</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 16,
            color: '#F44336', fontSize: 13, fontWeight: 600
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          {[
            { key: 'shop_name', label: 'Shop Name', placeholder: 'e.g. TRUMP Bingo Downtown', type: 'text' },
            { key: 'username', label: 'Username', placeholder: 'Choose a username', type: 'text' },
            { key: 'password', label: 'Password', placeholder: 'Choose a password', type: 'password' },
            { key: 'phone', label: 'Phone Number', placeholder: '09xxxxxxxx', type: 'tel' },
          ].map(field => (
            <div key={field.key}>
              <label style={{fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6}}>
                {field.label}
              </label>
              <input
                type={field.type}
                value={form[field.key]}
                onChange={e => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                required
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #E0E0E0',
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  fontFamily: "'Inter', 'Roboto', sans-serif"
                }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 50, border: 'none',
              background: loading ? '#ccc' : 'linear-gradient(135deg, #7C4DFF, #00BCD4)',
              color: '#fff', fontWeight: 800, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', 'Roboto', sans-serif", marginTop: 8,
              boxShadow: '0 4px 20px rgba(124,77,255,0.3)'
            }}
          >
            {loading ? '⏳ Creating...' : '🏪 Create Shop'}
          </button>
        </form>

        <div style={{textAlign: 'center', marginTop: 20}}>
          <span style={{color: '#999', fontSize: 13}}>Already have an account? </span>
          <Link to="/login" style={{color: '#7C4DFF', fontWeight: 700, fontSize: 13, textDecoration: 'none'}}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
