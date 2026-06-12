import React, { useState, useEffect } from 'react'
import { getShops, toggleShop, updateShopBalance, deleteShop, updateShopReport } from '../utils/api.js'
import { FULL_BRAND } from '../utils/brand.js'

export default function ShopManagement() {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingBalance, setEditingBalance] = useState(null) // { id, value }
  const [actionLoading, setActionLoading] = useState(null)
  const [reportModal, setReportModal] = useState(null) // { shop } — open report editor

  function loadShops() {
    setLoading(true)
    getShops()
      .then(data => { setShops(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadShops() }, [])

  async function handleToggle(id) {
    setActionLoading(id)
    try {
      await toggleShop(id)
      loadShops()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleBalanceUpdate(id) {
    if (!editingBalance || editingBalance.id !== id) return
    setActionLoading(id)
    try {
      await updateShopBalance(id, editingBalance.value)
      setEditingBalance(null)
      loadShops()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete shop "${name}"? This cannot be undone.`)) return
    setActionLoading(id)
    try {
      await deleteShop(id)
      loadShops()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <div style={{padding: 40, textAlign: 'center', color: '#999'}}>Loading shops...</div>

  return (
    <div>
      <div className="admin-page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24}}>
        <h2 style={{fontSize: 22, fontWeight: 900}}>🏪 {FULL_BRAND} — Shops</h2>
        <span style={{fontSize: 14, color: '#999', fontWeight: 700}}>{shops.length} shops</span>
      </div>

      <div className="card" style={{padding: 0, overflow: 'hidden'}}>
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 14}}>
            <thead>
              <tr style={{background: '#1A1A2E', color: 'white'}}>
                <th style={thS}>Shop Name</th>
                <th style={thS}>Username</th>
                <th style={thS}>Phone</th>
                <th style={thS}>Pending Credits</th>
                <th style={thS}>Status</th>
                <th style={thS}>Created</th>
                <th style={thS}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.length === 0 ? (
                <tr><td colSpan={7} style={{padding: 30, textAlign: 'center', color: '#999'}}>No shops registered yet.</td></tr>
              ) : shops.map((s, i) => (
                <tr key={s.id} style={{background: i % 2 === 0 ? '#fff' : '#F8F9FA', borderBottom: '1px solid #F0F0F0'}}>
                  <td style={{...tdS, fontWeight: 800}}>{s.shop_name}</td>
                  <td style={tdS}>{s.username}</td>
                  <td style={tdS}>{s.phone}</td>
                  <td style={tdS}>
                    {editingBalance && editingBalance.id === s.id ? (
                      <div style={{display: 'flex', gap: 4, alignItems: 'center'}}>
                        <input
                          type="number"
                          placeholder="Add amount"
                          value={editingBalance.value}
                          onChange={e => setEditingBalance({id: s.id, value: e.target.value})}
                          style={{width: 90, padding: '4px 8px', borderRadius: 8, border: '2px solid #7C4DFF', fontSize: 13}}
                        />
                        <button onClick={() => handleBalanceUpdate(s.id)}
                          style={{background: '#00C853', color: 'white', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 12}}>
                          + Add
                        </button>
                        <button onClick={() => setEditingBalance(null)}
                          style={{background: '#E0E0E0', color: '#333', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, fontSize: 12}}>
                          ✗
                        </button>
                      </div>
                    ) : (
                      <span onClick={() => setEditingBalance({id: s.id, value: ''})}
                        style={{cursor: 'pointer', fontWeight: 700, color: '#0091EA', borderBottom: '1px dashed #0091EA'}}>
                        {s.pending_credits} ETB (+Add)
                      </span>
                    )}
                  </td>
                  <td style={tdS}>
                    <span style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                      background: s.is_active ? 'rgba(0,200,83,0.15)' : 'rgba(244,67,54,0.15)',
                      color: s.is_active ? '#00C853' : '#F44336'
                    }}>
                      {s.is_active ? 'ACTIVE' : 'KILLED'}
                    </span>
                  </td>
                  <td style={{...tdS, fontSize: 12, color: '#999'}}>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td style={tdS}>
                    <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                      <button
                        onClick={() => handleToggle(s.id)}
                        disabled={actionLoading === s.id}
                        style={{
                          padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: s.is_active ? 'rgba(244,67,54,0.15)' : 'rgba(0,200,83,0.15)',
                          color: s.is_active ? '#F44336' : '#00C853',
                          fontWeight: 700, fontSize: 11
                        }}>
                        {s.is_active ? '🔌 Kill' : '✅ Activate'}
                      </button>
                      {/* Report Override button */}
                      <button
                        onClick={() => setReportModal({ shop: s })}
                        style={{
                          padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: 'rgba(124,77,255,0.12)', color: '#7C4DFF',
                          fontWeight: 700, fontSize: 11
                        }}>
                        📊 Report
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.shop_name)}
                        disabled={actionLoading === s.id}
                        style={{
                          padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: 'rgba(244,67,54,0.1)', color: '#F44336', fontWeight: 700, fontSize: 11
                        }}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Override Modal */}
      {reportModal && (
        <ReportOverrideModal
          shop={reportModal.shop}
          onClose={() => setReportModal(null)}
          onSaved={() => { setReportModal(null); loadShops() }}
        />
      )}
    </div>
  )
}

function ReportOverrideModal({ shop, onClose, onSaved }) {
  const [totalRounds, setTotalRounds] = useState('')
  const [totalPayout, setTotalPayout] = useState('')
  const [totalIncome, setTotalIncome] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSave() {
    setError('')
    setSuccess('')
    // Validate at least one field is filled
    if (totalRounds === '' && totalPayout === '' && totalIncome === '') {
      setError('Enter at least one value to override.')
      return
    }
    const payload = {}
    if (totalRounds !== '') {
      const v = parseInt(totalRounds)
      if (isNaN(v) || v < 0) { setError('Total Rounds must be a non-negative integer.'); return }
      payload.totalRounds = v
    }
    if (totalPayout !== '') {
      const v = parseFloat(totalPayout)
      if (isNaN(v) || v < 0) { setError('Total Payout must be a non-negative number.'); return }
      payload.totalPayout = v
    }
    if (totalIncome !== '') {
      const v = parseFloat(totalIncome)
      if (isNaN(v) || v < 0) { setError('Total Income must be a non-negative number.'); return }
      payload.totalIncome = v
    }

    setSaving(true)
    try {
      await updateShopReport(shop.id, payload)
      setSuccess('Report override saved — shop will see updated values on next refresh.')
      setTimeout(() => onSaved(), 1500)
    } catch (err) {
      setError(err.message || 'Failed to save report override.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200}}>
      <div style={{background:'white', borderRadius:20, padding:32, maxWidth:440, width:'95%', boxShadow:'0 8px 40px rgba(0,0,0,0.2)', fontFamily:"'Inter','Roboto',sans-serif"}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <h2 style={{fontSize:18, fontWeight:900, color:'#7C4DFF', margin:0}}>📊 Override Game Report</h2>
          <button onClick={onClose} style={{background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#999'}}>×</button>
        </div>
        <div style={{fontSize:13, color:'#666', marginBottom:20, background:'#F8F4FF', borderRadius:10, padding:'10px 14px', border:'1px solid #E8D5FF'}}>
          Shop: <strong style={{color:'#7C4DFF'}}>{shop.shop_name}</strong><br/>
          Leave a field blank to keep its current value. Changes appear on the client's Report page immediately.
        </div>

        {[
          { label: '🎮 Total Rounds', val: totalRounds, set: setTotalRounds, placeholder: 'e.g. 150', type: 'number', step: '1' },
          { label: '🏆 Total Payout (ብር)', val: totalPayout, set: setTotalPayout, placeholder: 'e.g. 45000', type: 'number', step: '0.01' },
          { label: '📈 Total Income (ብር)', val: totalIncome, set: setTotalIncome, placeholder: 'e.g. 12000', type: 'number', step: '0.01' },
        ].map(({ label, val, set, placeholder, type, step }) => (
          <label key={label} style={{display:'flex', flexDirection:'column', gap:6, marginBottom:14}}>
            <span style={{fontSize:13, fontWeight:700, color:'#333'}}>{label}</span>
            <input
              type={type} step={step} min={0}
              value={val}
              onChange={e => set(e.target.value)}
              placeholder={placeholder}
              style={{
                padding:'10px 14px', borderRadius:10, border:'2px solid #E0E0E0',
                fontSize:16, fontWeight:700, outline:'none',
                transition:'border-color 0.2s'
              }}
              onFocus={e => e.target.style.borderColor='#7C4DFF'}
              onBlur={e => e.target.style.borderColor='#E0E0E0'}
            />
          </label>
        ))}

        {error && (
          <div style={{background:'rgba(244,67,54,0.1)', border:'1px solid rgba(244,67,54,0.3)', borderRadius:10, padding:'8px 14px', marginBottom:14, fontSize:13, color:'#F44336', fontWeight:600}}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div style={{background:'rgba(0,200,83,0.1)', border:'1px solid rgba(0,200,83,0.3)', borderRadius:10, padding:'8px 14px', marginBottom:14, fontSize:13, color:'#00C853', fontWeight:600}}>
            ✅ {success}
          </div>
        )}

        <div style={{display:'flex', gap:10, marginTop:8}}>
          <button onClick={handleSave} disabled={saving}
            style={{
              flex:1, padding:'12px 0', borderRadius:50, border:'none',
              background: saving ? '#ccc' : 'linear-gradient(135deg, #7C4DFF, #B388FF)',
              color:'white', fontWeight:800, fontSize:14, cursor: saving ? 'not-allowed' : 'pointer'
            }}>
            {saving ? 'Saving…' : '💾 Save Override'}
          </button>
          <button onClick={onClose}
            style={{
              flex:1, padding:'12px 0', borderRadius:50, border:'1px solid #E0E0E0',
              background:'white', color:'#666', fontWeight:700, fontSize:14, cursor:'pointer'
            }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

const thS = { padding: '14px 16px', textAlign: 'left', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }
const tdS = { padding: '12px 16px', whiteSpace: 'nowrap' }
