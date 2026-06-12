import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBingoStore } from '../store/bingoStore.js'
import { BrandMark } from '../utils/brand.jsx'

export default function Registration() {
  const navigate = useNavigate()
  const {
    cards, registeredCardIds, toggleRegisterCard, startGame, clearRegistered,
    language, voiceEnabled, setLanguage, setVoiceEnabled,
    betAmount, housePercent, setBetAmount, setHousePercent, houseBetMode, setHouseBetMode, balance
  } = useBingoStore()
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const profileRef = useRef(null)
  const settingsRef = useRef(null)
  const settingsButtonRef = useRef(null)

  // Clean up any stale active game state when entering the registration page
  useEffect(() => {
    const store = useBingoStore.getState()
    if (store.gameActive) {
      store.endGame(null)
    }
  }, [])

  // Close profile and settings dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target) && settingsButtonRef.current && !settingsButtonRef.current.contains(e.target)) {
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Calculate rounds played today (same timing/filters as Report page)
  const sessions = useBingoStore(s => s.sessions)
  const [roundsToday, setRoundsToday] = useState(0)

  useEffect(() => {
    function getLocalDateString(date) {
      const offset = date.getTimezoneOffset()
      const localDate = new Date(date.getTime() - (offset * 60 * 1000))
      return localDate.toISOString().split('T')[0]
    }

    const updateCount = () => {
      const today = getLocalDateString(new Date())
      const activeToday = sessions.filter(s => {
        if ((s.numPlayers || 0) < 3) return false
        const dateStr = getLocalDateString(new Date(s.date))
        return dateStr === today
      })
      setRoundsToday(activeToday.length)
    }
    updateCount()
    const interval = setInterval(updateCount, 10000)
    return () => clearInterval(interval)
  }, [sessions])

  const registeredCount = registeredCardIds.length

  function handleStartGame() {
    if (registeredCount < 3) return
    const totalPool = registeredCount * betAmount
    // Calculate prospective income based on house mode
    const prospectiveIncome = houseBetMode ? betAmount : Math.round(totalPool * housePercent / 100)
    if (balance <= 0) {
      alert("⚠️ Your shop balance is 0. Please top up to host a game.")
      return
    }
    if (balance < prospectiveIncome) {
      alert(`⚠️ Insufficient balance to host this game.\nRequired: ${prospectiveIncome} Credits\nCurrent Balance: ${balance} Credits\nPlease top up or reduce registered cards.`)
      return
    }
    const started = startGame()
    if (!started) return
    navigate('/game')
  }

  // Extract just the number from card name, e.g. "Card 12" -> 12
  function getCardNumber(card) {
    const match = card.name.match(/\d+/)
    return match ? match[0] : card.name
  }

  return (
    <div style={{minHeight: '100vh', fontFamily: "'Inter', 'Roboto', sans-serif"}}>
      {/* Header - orange bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', background: 'var(--orange)',
        color: 'white',
        borderRadius: '0 0 20px 20px',
        boxShadow: '0 4px 12px rgba(255,107,0,0.3)',
        marginBottom: 20
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <BrandMark size={26} color="white" />
          <span style={{fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 700}}>Card Registration</span>
        </div>

        {/* Center: Yellow card rounds indicator */}
        <div style={{
          background: 'var(--yellow)',
          color: '#1A1A2E',
          padding: '8px 16px',
          borderRadius: 12,
          fontWeight: 800,
          fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: "'Inter', 'Roboto', sans-serif"
        }}>
          {language === 'am' ? `ዙር: ${roundsToday}` : `Round: ${roundsToday}`}
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>

          {/* Settings toggle */}
          <button ref={settingsButtonRef} onClick={() => setSettingsOpen(v => !v)}
            style={{background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'rgba(255,255,255,0.85)', transition: 'color 0.2s'}}
            onMouseOver={e => e.target.style.color = '#fff'}
            onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.85)'}>
            ⚙️
          </button>
          {/* Profile icon */}
          <div ref={profileRef} style={{position: 'relative'}}>
            <button onClick={() => setProfileOpen(v => !v)}
              style={{
                width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)',
                background: 'linear-gradient(135deg, #7C4DFF, #E91E63)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20,
                color: 'white', transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(124,77,255,0.4)' }}
              onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none' }}>
              👤
            </button>
            {profileOpen && (
              <div style={{
                position: 'absolute', top: 50, right: 0, background: 'var(--card-bg)',
                borderRadius: 16, boxShadow: 'var(--shadow)',
                padding: 8, minWidth: 180, zIndex: 50, border: '1px solid #E0E0E0',
                animation: 'pop 0.2s ease'
              }}>
                <button onClick={() => { setProfileOpen(false); navigate('/cards') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px',
                    background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer',
                    borderRadius: 10, fontSize: 13, fontWeight: 700, transition: 'background 0.2s',
                    fontFamily: "'Inter', 'Roboto', sans-serif"
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}>
                  📋 Card Manager
                </button>
                <button onClick={() => { setProfileOpen(false); navigate('/report') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px',
                    background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer',
                    borderRadius: 10, fontSize: 13, fontWeight: 700, transition: 'background 0.2s',
                    fontFamily: "'Inter', 'Roboto', sans-serif"
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#F5F5F5'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}>
                  📊 Game Reports
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <div ref={settingsRef} className="settings-panel">
          <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: 8}}>
            <span style={{fontWeight: 900, color: 'var(--orange)', fontFamily: "'Inter', 'Roboto', sans-serif"}}>Settings</span>
            <button onClick={() => setSettingsOpen(false)} style={{background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1}}>×</button>
          </div>
          <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700}}>
            Language
            <select value={language} onChange={e => setLanguage(e.target.value)}
              style={{background: 'white', color: 'var(--text)', border: '2px solid #E0E0E0', borderRadius: 10, padding: '6px 10px', fontSize: 13}}>
              <option value="en">English</option>
              <option value="am">Amharic</option>
            </select>
          </label>
          <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700}}>
            Voice
            <input type="checkbox" checked={voiceEnabled} onChange={e => setVoiceEnabled(e.target.checked)} />
            <span style={{color: voiceEnabled ? '#00C853' : '#888'}}>{voiceEnabled ? 'ON' : 'OFF'}</span>
          </label>
          <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700}}>
            House %
            <select value={houseBetMode ? 'oneBet' : housePercent} onChange={e => {
                const v = e.target.value
                if (v === 'oneBet') {
                  setHouseBetMode(true)
                } else {
                  setHouseBetMode(false)
                  setHousePercent(Number(v))
                }
              }}
              style={{background: 'white', color: 'var(--text)', border: '2px solid #E0E0E0', borderRadius: 10, padding: '6px 10px', fontSize: 13}}>
              <option value="oneBet">1Bet</option>
              {[15,20,25,30,35,40].map(p => (
                <option key={p} value={p}>{p}%</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {balance <= 0 && (
        <div style={{
          margin: '0 24px 20px 20px',
          background: 'rgba(244,67,54,0.1)',
          border: '1px solid rgba(244,67,54,0.3)',
          borderRadius: 16,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: '#D32F2F',
          fontWeight: 700,
          fontSize: 14,
          boxShadow: '0 4px 12px rgba(244,67,54,0.1)'
        }}>
          <span style={{fontSize: 24}}>⚠️</span>
          <div>
            <div style={{fontSize: 16, fontWeight: 900}}>Shop Balance is 0!</div>
            <div style={{fontWeight: 500, marginTop: 4, color: '#666'}}>Card registration and game play are disabled. Please top up in the Reports page to resume.</div>
          </div>
          <button onClick={() => navigate('/report')} style={{
            marginLeft: 'auto',
            background: '#F44336',
            color: 'white',
            border: 'none',
            borderRadius: 50,
            padding: '8px 20px',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(244,67,54,0.3)'
          }}>
            💳 Top-up Now
          </button>
        </div>
      )}

      {/* Main content */}
      <div style={{display: 'flex', gap: 24, padding: '0 24px 24px 0', maxWidth: '100%', margin: 0, alignItems: 'flex-start'}}>
        
        {/* Left Sidebar */}
        <div className="card" style={{
          width: 280, position: 'sticky', top: 90,
          display: 'flex', flexDirection: 'column', gap: 20,
          flexShrink: 0,
          height: 'calc(100vh - 220px)',
          margin: '5px 5px 5px 20px',
          padding: 24,
          borderRadius: 16
        }}>
          <h3 style={{margin: 0, color: 'var(--orange)', fontFamily: "'Inter', 'Roboto', sans-serif"}}>Round Setup</h3>
          
          <label style={{display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, fontWeight: 700, fontFamily: "'Inter', 'Roboto', sans-serif"}}>
            Bet Amount
            <select value={betAmount} onChange={e => setBetAmount(Number(e.target.value))}
              style={{background: 'white', color: 'var(--text)', border: '2px solid #E0E0E0', borderRadius: 10, padding: '10px', fontSize: 16, fontWeight: 700}}>
              {[10,20,30,40,50,60,70,80,90,100,200,300,400,500].map(val => (
                <option key={val} value={val}>{val} ብር</option>
              ))}
            </select>
          </label>

          <button onClick={handleStartGame}
            disabled={registeredCount < 3}
            style={{
              marginTop: 'auto',
              padding: '12px 24px', borderRadius: 50, border: 'none',
              background: registeredCount >= 3 ? 'linear-gradient(135deg, #00C853, #00E676)' : '#E0E0E0',
              color: registeredCount >= 3 ? '#fff' : '#999',
              fontWeight: 800, fontSize: 16, cursor: registeredCount >= 3 ? 'pointer' : 'not-allowed',
              fontFamily: "'Inter', 'Roboto', sans-serif",
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: registeredCount >= 3 ? '0 4px 20px rgba(0,200,83,0.3)' : 'none',
              width: '100%'
            }}
            onMouseOver={e => { if (registeredCount >= 3) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 25px rgba(0,200,83,0.4)' }}}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = registeredCount >= 3 ? '0 4px 20px rgba(0,200,83,0.3)' : 'none' }}>
            🎮 Start Game
          </button>
        </div>

        {/* Number Grid Wrapper */}
        <div style={{flex: 1, minWidth: 0}}>
        {/* No cards message */}
        {cards.length === 0 && (
          <div className="card" style={{textAlign: 'center', padding: 60}}>
            <div style={{fontSize: 48, marginBottom: 16}}>🃏</div>
            <div style={{fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text)'}}>No cards generated yet</div>
            <p style={{fontSize: 13, color: 'var(--text-muted)', marginBottom: 16}}>Go to Card Manager to generate cards first.</p>
            <button className="btn btn-blue" onClick={() => navigate('/cards')}>
              📋 Open Card Manager
            </button>
          </div>
        )}

        {/* Number Grid — just card numbers */}
        {cards.length > 0 && (
          <div className="card" style={{padding: 20, marginBottom: 120}}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gap: 4
            }}>
              {[...cards].sort((a, b) => getCardNumber(a) - getCardNumber(b)).map(card => {
                const isSelected = registeredCardIds.includes(card.id)
                const num = getCardNumber(card)
                return (
                  <button key={card.id}
                    onClick={() => {
                      if (balance <= 0) {
                        alert("⚠️ Registration disabled because shop balance is 0. Please top up.")
                        return
                      }
                      toggleRegisterCard(card.id)
                    }}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      margin: 0,
                      borderRadius: '50%',
                      border: isSelected ? '3px solid var(--orange)' : '2px solid #E0E0E0',
                      background: balance <= 0 ? '#F5F5F5' : (isSelected ? 'var(--orange)' : 'white'),
                      color: balance <= 0 ? '#999' : (isSelected ? 'white' : 'var(--text)'),
                      fontSize: 48,
                      fontWeight: 700,
                      fontFamily: "'Nunito', sans-serif",
                      letterSpacing: '0',
                      cursor: balance <= 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      boxShadow: isSelected && balance > 0 ? '0 4px 16px rgba(255,107,0,0.4)' : '0 2px 6px rgba(0,0,0,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                  >
                    {num}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Bottom fixed bar for selected cards */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--card-bg)', padding: '12px 24px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column', gap: 12,
        borderTop: '1px solid #E0E0E0', zIndex: 100
      }}>
        {/* Action buttons on the first line */}
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 16, width: '100%'}}>
            <div style={{
              background: '#F5F5F5', borderRadius: 20, padding: '6px 16px',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              <span style={{
                fontSize: 20, fontWeight: 900,
                color: registeredCount >= 3 ? 'var(--green)' : 'var(--orange)',
                fontFamily: "'Inter', 'Roboto', sans-serif"
              }}>{registeredCount}</span>
              <span style={{fontSize: 12, color: 'var(--text-muted)', fontWeight: 700, fontFamily: "'Inter', 'Roboto', sans-serif"}}>/ {cards.length}</span>
            </div>
            <div style={{flex: 1}}></div>
            <button onClick={clearRegistered}
              disabled={registeredCount === 0}
              style={{
                padding: '8px 24px', borderRadius: 50, border: 'none',
                background: '#F44336', color: 'white',
                fontWeight: 800, fontSize: 13, cursor: registeredCount === 0 ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', 'Roboto', sans-serif", opacity: registeredCount === 0 ? 0.5 : 1,
                boxShadow: registeredCount > 0 ? '0 4px 12px rgba(244,67,54,0.3)' : 'none'
              }}>
              🧹 Clean
            </button>
        </div>

        {/* Selected cards display on the next line */}
        <div style={{display: 'flex', alignItems: 'center', gap: 12, width: '100%', overflowX: 'auto', paddingBottom: 4}}>
          <div style={{fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontFamily: "'Inter', 'Roboto', sans-serif"}}>Selected:</div>
          <div style={{display: 'flex', gap: 8, paddingRight: 16}}>
            {registeredCardIds.map(id => {
              const c = cards.find(x => x.id === id)
              return c ? (
                <div key={id} style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--orange)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, fontFamily: "'Inter', 'Roboto', sans-serif",
                  boxShadow: '0 2px 8px rgba(255,107,0,0.3)',
                  flexShrink: 0
                }}>
                  {getCardNumber(c)}
                </div>
              ) : null
            })}
            {registeredCount === 0 && <span style={{fontSize: 13, color: '#aaa', fontStyle: 'italic', display: 'flex', alignItems: 'center'}}>None</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
