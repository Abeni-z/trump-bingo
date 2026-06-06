import React, { useState, useEffect } from 'react'
import { getShops, toggleShop, updateShopBalance, deleteShop } from '../utils/api.js'
import { FULL_BRAND } from '../utils/brand.js'

export default function ShopManagement() {
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingBalance, setEditingBalance] = useState(null) // { id, value }
  const [actionLoading, setActionLoading] = useState(null)

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
                    <div style={{display: 'flex', gap: 6}}>
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
    </div>
  )
}

const thS = { padding: '14px 16px', textAlign: 'left', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }
const tdS = { padding: '12px 16px', whiteSpace: 'nowrap' }
