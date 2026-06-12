import React, { useState, useEffect } from 'react'
import { useBingoStore } from '../store/bingoStore.js'
import { apiSubmitTopup, apiGetMyTopups, apiGetConversionRate, apiGetReportOverride } from '../utils/api.js'
import { FULL_BRAND } from '../utils/brand.jsx'

function getLocalDateString(date) {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - (offset * 60 * 1000))
  return localDate.toISOString().split('T')[0]
}

export default function Report() {
  const { sessions, balance, conversionRate } = useBingoStore()
  const [showTopup, setShowTopup] = useState(false)
  const [topups, setTopups] = useState([])
  const [activeTab, setActiveTab] = useState('report') // 'report' or 'topup'
  const [reportOverride, setReportOverride] = useState({}) // admin-set override fields

  // Date filters
  const [startDate, setStartDate] = useState(() => getLocalDateString(new Date()))
  const [endDate, setEndDate] = useState(() => getLocalDateString(new Date()))

  const minDate = getLocalDateString(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000))
  const maxDate = getLocalDateString(new Date())

  // Load topup history
  useEffect(() => {
    apiGetMyTopups()
      .then(data => setTopups(data))
      .catch(() => {})
  }, [showTopup, activeTab])

  // Load admin report override
  useEffect(() => {
    apiGetReportOverride()
      .then(data => setReportOverride(data || {}))
      .catch(() => {})
  }, [])

  // Pending credits are claimed by App.jsx — no need to duplicate here

  const filteredSessions = sessions.filter(s => {
    if ((s.numPlayers || 0) < 3) return false
    const dateStr = getLocalDateString(new Date(s.date))
    return dateStr >= startDate && dateStr <= endDate
  })

  const rawTotalPayout = filteredSessions.reduce((s, g) => s + (g.winnerPrize || 0), 0)
  const rawTotalIncome = filteredSessions.reduce((s, g) => s + (g.income || 0), 0)
  const rawTotalGames = filteredSessions.length

  // Apply admin overrides if present
  const totalPayout = reportOverride.totalPayout !== undefined ? reportOverride.totalPayout : rawTotalPayout
  const totalIncome = reportOverride.totalIncome !== undefined ? reportOverride.totalIncome : rawTotalIncome
  const totalGames = reportOverride.totalRounds !== undefined ? reportOverride.totalRounds : rawTotalGames

  const handleResetToToday = () => {
    const today = getLocalDateString(new Date())
    setStartDate(today)
    setEndDate(today)
  }

  return (
    <div className="page" style={{fontFamily: "'Inter', 'Roboto', sans-serif"}}>
      {/* Summary cards */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:16}}>
        {[
          ['🎮 Total Rounds', totalGames, 'var(--orange)'],
          ['💰 Balance', `${balance} Credits`, 'var(--green)'],
          ['🏆 Total Payout', `${totalPayout} ብር`, 'var(--blue)'],
          ['📈 Total Income', `${totalIncome} ብር`, '#00C853'],
        ].map(([label, val, color]) => (
          <div key={label} className="card" style={{textAlign:'center'}}>
            <div style={{fontSize:24, fontWeight:900, color, fontFamily: "'Inter', 'Roboto', sans-serif"}}>{val}</div>
            <div style={{fontSize:12, color:'var(--text-muted)', fontWeight:600}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Main card containing the single table view */}
      <div className="card" style={{padding: 0, overflow: 'hidden'}}>
        
        {/* Navigation & Actions Toolbar */}
        <div style={{
          display:'flex', justifyContent:'space-between', alignItems:'center',
          padding: '16px 20px', flexWrap:'wrap', gap:12, borderBottom: '1px solid #F0F0F0'
        }}>
          {/* Tab buttons switcher */}
          <div style={{display: 'flex', gap: 8, background: '#F5F5F5', padding: 4, borderRadius: 12}}>
            <button
              onClick={() => setActiveTab('report')}
              style={{
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: activeTab === 'report' ? 'white' : 'transparent',
                color: activeTab === 'report' ? 'var(--orange)' : '#666',
                fontWeight: 800, fontSize: 13, transition: 'all 0.2s',
                boxShadow: activeTab === 'report' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}>
              📋 Round Report
            </button>
            <button
              onClick={() => setActiveTab('topup')}
              style={{
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: activeTab === 'topup' ? 'white' : 'transparent',
                color: activeTab === 'topup' ? 'var(--purple)' : '#666',
                fontWeight: 800, fontSize: 13, transition: 'all 0.2s',
                boxShadow: activeTab === 'topup' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}>
              📜 Top-up History
            </button>
          </div>

          <div style={{display:'flex', gap:8, flexWrap: 'wrap'}}>
            <button className="btn btn-green" onClick={() => setShowTopup(true)} style={{fontSize: 13, padding: '10px 18px'}}>
              💳 Request Top-up
            </button>
          </div>
        </div>

        {/* Date Filter Panel - only shown for Round Report */}
        {activeTab === 'report' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
            background: '#FAF9F6', borderBottom: '1px solid #F0F0F0', flexWrap: 'wrap'
          }}>
            <button onClick={handleResetToToday} style={{
              background: 'white', border: '2px solid #E0E0E0', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#555'
            }}>
              📅 Today's Report
            </button>

            <div style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', fontWeight: 600}}>
              <span>Start:</span>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  border: '2px solid #E0E0E0', borderRadius: 8, padding: '4px 8px',
                  fontWeight: 700, color: '#333', outline: 'none'
                }}
              />
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555', fontWeight: 600}}>
              <span>End:</span>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  border: '2px solid #E0E0E0', borderRadius: 8, padding: '4px 8px',
                  fontWeight: 700, color: '#333', outline: 'none'
                }}
              />
            </div>
            
            <span style={{fontSize: 11, color: '#999', marginLeft: 'auto'}}>
              Data older than 45 days is automatically deleted.
            </span>
          </div>
        )}

        {/* Table Rendering */}
        {activeTab === 'report' ? (
          filteredSessions.length === 0 ? (
            <div style={{textAlign:'center', padding:60, color:'var(--text-muted)'}}>
              <div style={{fontSize: 48, marginBottom: 12}}>📅</div>
              <div style={{fontWeight: 700, fontSize: 16}}>No rounds played in this period</div>
              <p style={{fontSize: 13, color: '#999', marginTop: 4}}>Try selecting a wider date range above.</p>
            </div>
          ) : (
            <div style={{maxHeight: 'calc(100vh - 340px)', overflowY: 'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontFamily: "'Inter', 'Roboto', sans-serif", fontSize: 14}}>
                <thead>
                  <tr style={{background:'#FF6B00', color:'white', position:'sticky', top:0, zIndex:2}}>
                    <th style={thStyle}>Round Date</th>
                    <th style={thStyle}>Bet Amount</th>
                    <th style={thStyle}>Players</th>
                    <th style={thStyle}>Percent</th>
                    <th style={thStyle}>Winner Prize</th>
                    <th style={thStyle}>Income</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((s, i) => (
                    <tr key={s.id} style={{background: i % 2 === 0 ? '#FFFFFF' : '#FFF8E1', borderBottom: '1px solid #F0F0F0'}}>
                      <td style={tdStyle}>{new Date(s.date).toLocaleString()}</td>
                      <td style={tdStyle}>{s.betAmount || 0} ብር</td>
                      <td style={tdStyle}>{s.numPlayers || 0}</td>
                      <td style={tdStyle}>{s.houseBetMode ? '1Bet' : (s.housePercent || 0) + '%'}</td>
                      <td style={{...tdStyle, color:'#1565C0', fontWeight:700}}>{s.winnerPrize || 0} ብር</td>
                      <td style={{...tdStyle, color:'#2E7D32', fontWeight:700}}>{s.income || 0} ብር</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:'#FFF3E0', fontWeight:900, position:'sticky', bottom:0, zIndex:2}}>
                    <td style={tdStyle} colSpan={4}>TOTALS</td>
                    <td style={{...tdStyle, color:'#1565C0', fontSize:16}}>{totalPayout} ብር</td>
                    <td style={{...tdStyle, color:'#2E7D32', fontSize:16}}>{totalIncome} ብር</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : (
          /* Top-up History View */
          topups.length === 0 ? (
            <div style={{padding: 60, textAlign: 'center', color: '#999'}}>
              <div style={{fontSize: 48, marginBottom: 12}}>💳</div>
              <div style={{fontWeight: 700, fontSize: 16}}>No top-up requests yet</div>
              <p style={{fontSize: 13, color: '#999', marginTop: 4}}>Click Request Top-up to add balance.</p>
            </div>
          ) : (
            <div style={{maxHeight: 'calc(100vh - 300px)', overflowY: 'auto'}}>
              <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                <thead>
                  <tr style={{background: '#7C4DFF', color: 'white'}}>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Amount (ETB)</th>
                    <th style={thStyle}>Credits Added</th>
                    <th style={thStyle}>Bank</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topups.map((t, i) => (
                    <tr key={t.id} style={{borderBottom: '1px solid #F0F0F0', background: i % 2 === 0 ? '#FFFFFF' : '#F9F8FF'}}>
                      <td style={tdStyle}>{new Date(t.created_at).toLocaleString()}</td>
                      <td style={{...tdStyle, fontWeight: 700}}>{t.amount} ETB</td>
                      <td style={{...tdStyle, fontWeight: 700, color: '#7C4DFF'}}>{(t.credits !== null && t.credits !== undefined) ? t.credits : Math.round(t.amount * (conversionRate || 10))} ብር</td>
                      <td style={tdStyle}>{t.bank}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                          background: t.status === 'approved' ? 'rgba(0,200,83,0.15)' : t.status === 'rejected' ? 'rgba(244,67,54,0.15)' : 'rgba(255,152,0,0.15)',
                          color: t.status === 'approved' ? '#00C853' : t.status === 'rejected' ? '#F44336' : '#FF9800'
                        }}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Top-up Popup */}
      {showTopup && (
        <TopupPopup
          onClose={() => setShowTopup(false)}
          onSuccess={() => {
            setShowTopup(false)
            // Topup request submitted — admin will approve later
            // Credits will be claimed by App.jsx on next mount/refresh
          }}
        />
      )}
    </div>
  )
}

function TopupPopup({ onClose, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [bank, setBank] = useState('')
  const [screenshot, setScreenshot] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [conversionRate, setConversionRate] = useState(10)

  const banks = ['Commercial Bank of Ethiopia (CBE)', 'Awash Bank', 'Telebirr', 'Dashen Bank', 'Bank of Abyssinia', 'Wegagen Bank', 'Cooperative Bank of Oromia', 'Other']

  useEffect(() => {
    apiGetConversionRate()
      .then(data => {
        if (data.conversionRate) {
          setConversionRate(data.conversionRate)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!amount || parseFloat(amount) <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (!bank) {
      setError('Select a bank')
      return
    }

    setLoading(true)
    try {
      await apiSubmitTopup(amount, bank, screenshot)
      setSuccess(true)
      setTimeout(() => onSuccess(), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200}}>
      <div style={{
        background: 'white', borderRadius: 20, padding: 28, maxWidth: 440, width: '95%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: "'Inter', 'Roboto', sans-serif"
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
          <div>
            <div style={{fontSize: 14, fontWeight: 700, color: '#FF6B00', fontFamily: "'Nunito', sans-serif", marginBottom: 4}}>TRUMP Bingo</div>
            <h2 style={{color: 'var(--green)', fontFamily: 'Fredoka One', fontSize: 22, margin: 0}}>💳 Top-up Request</h2>
          </div>
          <button onClick={onClose} style={{background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#999'}}>×</button>
        </div>

        {success ? (
          <div style={{textAlign: 'center', padding: 30}}>
            <div style={{fontSize: 64, marginBottom: 12}}>✅</div>
            <div style={{fontSize: 18, fontWeight: 800, color: '#00C853'}}>Request Submitted!</div>
            <p style={{color: '#999', fontSize: 13, marginTop: 8}}>Admin will review and approve your top-up shortly.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            {error && (
              <div style={{background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.3)', borderRadius: 12, padding: '10px 14px', color: '#F44336', fontSize: 13, fontWeight: 600}}>
                ⚠️ {error}
              </div>
            )}

            <div>
              <label style={{fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6}}>Amount (ETB)</label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 1000"
                required
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #E0E0E0',
                  fontSize: 18, fontWeight: 700, outline: 'none', boxSizing: 'border-box', fontFamily: "'Nunito', sans-serif"
                }}
              />
              {amount && parseFloat(amount) > 0 && (
                <div style={{fontSize: 18, color: '#7C4DFF', marginTop: 8, fontWeight: 800, background: '#F2EEFF', padding: '8px 14px', borderRadius: 8, fontFamily: "'Nunito', sans-serif"}}>
                  💳 Calculated Credits: {Math.round(parseFloat(amount) * conversionRate)} Credits
                </div>
              )}
            </div>

            <div>
              <label style={{fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6}}>Bank</label>
              <select
                value={bank}
                onChange={e => setBank(e.target.value)}
                required
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #E0E0E0',
                  fontSize: 14, fontWeight: 600, outline: 'none', boxSizing: 'border-box',
                  background: 'white', color: bank ? '#333' : '#999'
                }}
              >
                <option value="">Select bank...</option>
                {banks.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div>
              <label style={{fontSize: 12, fontWeight: 700, color: '#666', display: 'block', marginBottom: 6}}>Transfer Screenshot</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setScreenshot(e.target.files[0] || null)}
                style={{
                  width: '100%', padding: '10px', borderRadius: 12, border: '2px dashed #E0E0E0',
                  fontSize: 13, boxSizing: 'border-box', cursor: 'pointer'
                }}
              />
              {screenshot && (
                <div style={{fontSize: 11, color: '#00C853', marginTop: 4, fontWeight: 600}}>
                  ✅ {screenshot.name} ({(screenshot.size / 1024).toFixed(0)} KB)
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 50, border: 'none',
                background: loading ? '#ccc' : 'linear-gradient(135deg, #00C853, #00E676)',
                color: '#fff', fontWeight: 800, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 8, boxShadow: '0 4px 20px rgba(0,200,83,0.3)'
              }}
            >
              {loading ? '⏳ Submitting...' : '📤 Submit Top-up Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const thStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontWeight: 800,
  fontSize: 13,
  whiteSpace: 'nowrap',
  borderBottom: '2px solid rgba(255,255,255,0.3)'
}

const tdStyle = {
  padding: '10px 16px',
  whiteSpace: 'nowrap'
}
