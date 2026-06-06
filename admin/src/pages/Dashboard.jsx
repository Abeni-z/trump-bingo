import React, { useState, useEffect } from 'react'
import { getStats, getConversionRate, updateConversionRate } from '../utils/api.js'
import { FULL_BRAND } from '../utils/brand.js'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rate, setRate] = useState(10)
  const [editingRate, setEditingRate] = useState(false)
  const [rateInput, setRateInput] = useState('10')
  const [rateSaving, setRateSaving] = useState(false)

  useEffect(() => {
    getStats()
      .then(data => {
        setStats(data)
        setRate(data.conversionRate || 10)
        setRateInput(String(data.conversionRate || 10))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSaveRate() {
    const val = parseFloat(rateInput)
    if (!val || val <= 0) return alert('Enter a valid positive number')
    setRateSaving(true)
    try {
      const res = await updateConversionRate(val)
      setRate(res.conversionRate)
      setEditingRate(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setRateSaving(false)
    }
  }

  if (loading) return <div style={{padding: 40, textAlign: 'center', color: '#999'}}>Loading stats...</div>
  if (!stats) return <div style={{padding: 40, textAlign: 'center', color: '#F44336'}}>Failed to load stats</div>

  const cards = [
    { label: 'Total Shops', value: stats.totalShops, icon: '🏪', color: '#7C4DFF', bg: 'rgba(124,77,255,0.1)' },
    { label: 'Active Shops', value: stats.activeShops, icon: '✅', color: '#00C853', bg: 'rgba(0,200,83,0.1)' },
    { label: 'Inactive Shops', value: stats.inactiveShops, icon: '🚫', color: '#F44336', bg: 'rgba(244,67,54,0.1)' },
    { label: 'Pending Top-ups', value: stats.pendingTopups, icon: '⏳', color: '#FF9800', bg: 'rgba(255,152,0,0.1)' },
    { label: 'Approved Top-ups', value: stats.approvedTopups, icon: '✅', color: '#00C853', bg: 'rgba(0,200,83,0.1)' },
    { label: 'Rejected Top-ups', value: stats.rejectedTopups, icon: '❌', color: '#F44336', bg: 'rgba(244,67,54,0.1)' },
    { label: 'Total Approved (ETB)', value: stats.totalApprovedAmount.toLocaleString(), icon: '💰', color: '#0091EA', bg: 'rgba(0,145,234,0.1)' },
  ]

  return (
    <div>
      <h2 style={{marginBottom: 24, fontSize: 22, fontWeight: 900}}>📊 {FULL_BRAND} — Dashboard</h2>

      {/* Conversion Rate Card */}
      <div className="card admin-conversion-card" style={{
        marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20,
        border: '1px solid rgba(124,77,255,0.2)', background: 'linear-gradient(135deg, rgba(124,77,255,0.05), rgba(0,145,234,0.05))'
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: 14, background: 'rgba(124,77,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0
        }}>💱</div>
        <div style={{flex: 1}}>
          <div style={{fontSize: 12, color: '#999', fontWeight: 600, marginBottom: 4}}>Conversion Rate</div>
          {editingRate ? (
            <div className="admin-conversion-edit" style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <span style={{fontWeight: 700, color: '#333'}}>1 ETB =</span>
              <input
                type="number" min="0.1" step="0.1"
                value={rateInput}
                onChange={e => setRateInput(e.target.value)}
                style={{width: 80, padding: '6px 10px', borderRadius: 8, border: '2px solid #7C4DFF', fontSize: 16, fontWeight: 800, textAlign: 'center'}}
              />
              <span style={{fontWeight: 700, color: '#333'}}>credits</span>
              <button onClick={handleSaveRate} disabled={rateSaving}
                style={{padding: '6px 14px', borderRadius: 8, border: 'none', background: '#00C853', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer'}}>
                {rateSaving ? '...' : '✓ Save'}
              </button>
              <button onClick={() => { setEditingRate(false); setRateInput(String(rate)) }}
                style={{padding: '6px 14px', borderRadius: 8, border: 'none', background: '#E0E0E0', color: '#333', fontWeight: 700, fontSize: 12, cursor: 'pointer'}}>
                ✗
              </button>
            </div>
          ) : (
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <span style={{fontSize: 22, fontWeight: 900, color: '#7C4DFF'}}>1 ETB = {rate} credits</span>
              <button onClick={() => setEditingRate(true)}
                style={{padding: '4px 12px', borderRadius: 8, border: '1px solid #E0E0E0', background: '#F5F5F5', color: '#7C4DFF', fontWeight: 700, fontSize: 11, cursor: 'pointer'}}>
                ✏️ Edit
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="admin-stats-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16}}>
        {cards.map(c => (
          <div key={c.label} className="card" style={{display: 'flex', alignItems: 'center', gap: 16, border: `1px solid ${c.bg}`}}>
            <div style={{
              width: 50, height: 50, borderRadius: 14, background: c.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0
            }}>{c.icon}</div>
            <div>
              <div style={{fontSize: 24, fontWeight: 900, color: c.color}}>{c.value}</div>
              <div style={{fontSize: 12, color: '#999', fontWeight: 600}}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
