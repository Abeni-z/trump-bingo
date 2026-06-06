import React, { useState, useEffect } from 'react'
import { getTopups, approveTopup, rejectTopup, getTopupScreenshot } from '../utils/api.js'
import { FULL_BRAND } from '../utils/brand.js'

export default function TopupRequests() {
  const [topups, setTopups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [actionLoading, setActionLoading] = useState(null)
  const [previewImg, setPreviewImg] = useState(null)
  const [screenshotLoading, setScreenshotLoading] = useState(null)
  const [creditsOverrides, setCreditsOverrides] = useState({})

  function loadTopups() {
    setLoading(true)
    getTopups(filter)
      .then(data => {
        setTopups(data)
        const overrides = {}
        data.forEach(t => {
          overrides[t.id] = t.credits
        })
        setCreditsOverrides(overrides)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadTopups() }, [filter])

  async function handleApprove(id) {
    const creditsOverride = creditsOverrides[id]
    setActionLoading(id)
    try {
      await approveTopup(id, '', creditsOverride)
      loadTopups()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleViewScreenshot(id) {
    setScreenshotLoading(id)
    try {
      const data = await getTopupScreenshot(id)
      setPreviewImg(data.data_url)
    } catch (err) {
      alert(err.message || 'Could not load screenshot')
    } finally {
      setScreenshotLoading(null)
    }
  }

  async function handleReject(id) {
    const note = prompt('Rejection reason (optional):')
    if (note === null) return // cancelled
    setActionLoading(id)
    try {
      await rejectTopup(id, note)
      loadTopups()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div>
      <div className="admin-page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12}}>
        <h2 style={{fontSize: 22, fontWeight: 900}}>💳 {FULL_BRAND} — Top-ups</h2>
        <div className="admin-filter-row" style={{display: 'flex', gap: 8}}>
          {['', 'pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                background: filter === f ? '#1A1A2E' : '#E0E0E0',
                color: filter === f ? 'white' : '#333',
                fontWeight: 700, fontSize: 12
              }}>
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{padding: 40, textAlign: 'center', color: '#999'}}>Loading...</div>
      ) : (
        <div className="card" style={{padding: 0, overflow: 'hidden'}}>
          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 14}}>
              <thead>
                <tr style={{background: '#1A1A2E', color: 'white'}}>
                  <th style={thS}>Date</th>
                  <th style={thS}>Shop</th>
                  <th style={thS}>Phone</th>
                  <th style={thS}>Amount</th>
                  <th style={thS}>Bank</th>
                  <th style={thS}>Screenshot</th>
                  <th style={thS}>Status</th>
                  <th style={thS}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {topups.length === 0 ? (
                  <tr><td colSpan={8} style={{padding: 30, textAlign: 'center', color: '#999'}}>No top-up requests found.</td></tr>
                ) : topups.map((t, i) => (
                  <tr key={t.id} style={{background: i % 2 === 0 ? '#fff' : '#F8F9FA', borderBottom: '1px solid #F0F0F0'}}>
                    <td style={{...tdS, fontSize: 12, color: '#999'}}>{new Date(t.created_at).toLocaleString()}</td>
                    <td style={{...tdS, fontWeight: 800}}>{t.shop?.shop_name || '—'}</td>
                    <td style={tdS}>{t.shop?.phone || '—'}</td>
                    <td style={{...tdS, fontWeight: 800}}>
                      <div style={{color: '#0091EA'}}>{t.amount} ETB</div>
                      <div style={{fontSize: 12, color: '#666', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6}}>
                        {t.status === 'pending' ? (
                          <label style={{display: 'flex', alignItems: 'center', gap: 4, fontWeight: 'normal'}}>
                            <span>Credits:</span>
                            <input
                              type="number"
                              value={creditsOverrides[t.id] !== undefined ? creditsOverrides[t.id] : t.credits}
                              onChange={e => setCreditsOverrides({
                                ...creditsOverrides,
                                [t.id]: parseFloat(e.target.value) || 0
                              })}
                              style={{
                                width: 80,
                                padding: '3px 6px',
                                border: '1px solid #7C4DFF',
                                borderRadius: 6,
                                fontSize: 13,
                                fontWeight: 'bold',
                                outline: 'none'
                              }}
                            />
                          </label>
                        ) : (
                          <span>{t.credits} Credits</span>
                        )}
                      </div>
                    </td>
                    <td style={tdS}>{t.bank}</td>
                    <td style={tdS}>
                      {t.has_screenshot ? (
                        <button onClick={() => handleViewScreenshot(t.id)} disabled={screenshotLoading === t.id}
                          style={{
                            padding: '4px 10px', borderRadius: 8, border: '1px solid #E0E0E0', cursor: 'pointer',
                            background: '#F5F5F5', color: '#0091EA', fontWeight: 700, fontSize: 11,
                            opacity: screenshotLoading === t.id ? 0.6 : 1
                          }}>
                          {screenshotLoading === t.id ? '…' : '🖼️ View'}
                        </button>
                      ) : <span style={{color: '#999', fontSize: 12}}>None</span>}
                    </td>
                    <td style={tdS}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                        background: t.status === 'approved' ? 'rgba(0,200,83,0.15)' : t.status === 'rejected' ? 'rgba(244,67,54,0.15)' : 'rgba(255,152,0,0.15)',
                        color: t.status === 'approved' ? '#00C853' : t.status === 'rejected' ? '#F44336' : '#FF9800'
                      }}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={tdS}>
                      {t.status === 'pending' ? (
                        <div style={{display: 'flex', gap: 6}}>
                          <button onClick={() => handleApprove(t.id)} disabled={actionLoading === t.id}
                            style={{
                              padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: '#00C853', color: 'white', fontWeight: 700, fontSize: 12
                            }}>
                            ✅ Approve
                          </button>
                          <button onClick={() => handleReject(t.id)} disabled={actionLoading === t.id}
                            style={{
                              padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: '#F44336', color: 'white', fontWeight: 700, fontSize: 12
                            }}>
                            ❌ Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{fontSize: 12, color: '#999'}}>{t.admin_note || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Screenshot Preview Modal */}
      {previewImg && (
        <div onClick={() => setPreviewImg(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 200, cursor: 'pointer'
        }}>
          <div style={{maxWidth: '90vw', maxHeight: '90vh', position: 'relative'}} onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImg(null)} style={{
              position: 'absolute', top: -12, right: -12, width: 36, height: 36, borderRadius: '50%',
              background: '#F44336', color: 'white', border: 'none', fontSize: 18, cursor: 'pointer', fontWeight: 900
            }}>×</button>
            <img src={previewImg} alt="Screenshot" style={{maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)'}} />
          </div>
        </div>
      )}
    </div>
  )
}

const thS = { padding: '14px 16px', textAlign: 'left', fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap' }
const tdS = { padding: '12px 16px', whiteSpace: 'nowrap' }
