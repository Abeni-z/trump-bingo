import React, { useState, useEffect, useRef } from 'react'
import { useBingoStore, checkWin, cardToFlat } from '../store/bingoStore.js'
import { speakNumber, playSpecialVoice, getLetterForNumber } from '../utils/voice.js'
import { playShuffleMixSound } from '../utils/shuffleSound.js'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../utils/brand.jsx'

const COL_COLORS = ['#0091EA','#00BCD4','#FF6B00','#7C4DFF','#E91E63']
const SHUFFLE_COLORS = ['#0091EA','#00BCD4','#FF6B00','#7C4DFF','#E91E63','#00C853','#F44336','#FFD600','#FF4081','#26C6DA']
const LETTERS = ['B','I','N','G','O']

function shuffleRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function getShuffleCellState(number, frame) {
  const seed = number * 127.1 + frame * 311.7
  const visibility = shuffleRandom(seed)
  const colorPick = shuffleRandom(seed + 41.3)
  const showNumber = shuffleRandom(seed + 89.1) > 0.28
  return {
    visible: visibility > 0.32,
    showNumber,
    color: SHUFFLE_COLORS[Math.floor(colorPick * SHUFFLE_COLORS.length)]
  }
}

export default function Game() {
  const navigate = useNavigate()
  const { language, voiceEnabled, callSpeed, setCallSpeed, betAmount, housePercent, houseBetMode, calledNumbers, lastCalled, gameActive, callRandom, endGame, cards, registeredCardIds, lockedCardIds, lockCard, resetLocked } = useBingoStore()
  const [autoMode, setAutoMode] = useState(false)
  const [showWinner, setShowWinner] = useState(false)
  const [shuffling, setShuffling] = useState(false)
  const [shuffleFrame, setShuffleFrame] = useState(0)
  const [hasPlayed, setHasPlayed] = useState(calledNumbers.length > 0)
  const autoRef = useRef(null)
  const autoModeRef = useRef(false)
  const shuffleSoundStopRef = useRef(null)

  function changeSpeed(delta) {
    const nextSpeed = Math.round((Number(callSpeed) + delta) * 2) / 2
    setCallSpeed(Math.min(5, Math.max(1, nextSpeed)))
  }

  // Sync ref with autoMode state
  useEffect(() => {
    autoModeRef.current = autoMode
  }, [autoMode])

  // Game must be started from Registration — redirect if no active round
  useEffect(() => {
    if (!gameActive || registeredCardIds.length < 3) {
      navigate('/')
      return
    }
    setHasPlayed(calledNumbers.length > 0)
  }, [])

  useEffect(() => {
    if (autoMode && gameActive) {
      const runAutoCall = () => {
        if (!autoModeRef.current) return
        const num = callRandom()
        if (num) {
          if (voiceEnabled) speakNumber(num, language, voiceEnabled) // fire-and-forget, voice can overlap
          if (autoModeRef.current) {
            autoRef.current = setTimeout(runAutoCall, callSpeed * 1000)
          }
        } else {
          setAutoMode(false)
        }
      }
      autoRef.current = setTimeout(runAutoCall, callSpeed * 1000)
    }
    return () => {
      clearTimeout(autoRef.current)
      autoRef.current = null
    }
  }, [autoMode, callSpeed, language, voiceEnabled, gameActive])

  function handlePlayPause() {
    if (!autoMode) {
      if (voiceEnabled && calledNumbers.length === 0) playSpecialVoice('begning')
      setHasPlayed(true)
      setAutoMode(true)
    } else {
      if (autoRef.current) {
        clearTimeout(autoRef.current)
        autoRef.current = null
      }
      setAutoMode(false)
    }
  }

  function handleEndGame(winner) {
    if (autoRef.current) {
      clearTimeout(autoRef.current)
      autoRef.current = null
    }
    setAutoMode(false)
    resetLocked()
    endGame(winner)
    navigate('/report')
  }

  function handleShuffle() {
    if (shuffling || hasPlayed) return
    setShuffling(true)
    if (shuffleSoundStopRef.current) shuffleSoundStopRef.current()
    shuffleSoundStopRef.current = playShuffleMixSound(10)

    // Shuffle animation: numbers flicker in/out with random colors
    const interval = setInterval(() => {
      setShuffleFrame(f => f + 1)
    }, 90)

    // 10 seconds total shuffle duration
    setTimeout(() => {
      clearInterval(interval)
      if (shuffleSoundStopRef.current) {
        shuffleSoundStopRef.current()
        shuffleSoundStopRef.current = null
      }
      setShuffling(false)
    }, 10000)
  }

  const calledSet = new Set(calledNumbers)
  const letter = lastCalled ? getLetterForNumber(lastCalled) : null

  const numPlayers = registeredCardIds.length
  const totalPot = numPlayers * betAmount
  // Calculate income based on house mode
  const income = houseBetMode ? betAmount : Math.round(totalPot * housePercent / 100)
  const winnerPrize = totalPot - income

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'Inter', 'Roboto', sans-serif", display: 'flex', flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '6px 16px', background: 'var(--orange)', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(255,107,0,0.25)'
      }}>
        <BrandMark size={22} color="white" />
        <span style={{fontSize: 12, fontWeight: 700, opacity: 0.9}}>Live Game</span>
      </div>
      {/* Top Section: Indicators */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', gap: 12,
        padding: '8px 16px', alignItems: 'stretch', flexWrap: 'wrap',
        marginBottom: 4
      }}>
        {/* Current ball - Moved to Left, fully round, hyphenated */}
        <div className="card" style={{
          background: lastCalled ? COL_COLORS[['B','I','N','G','O'].indexOf(letter)] : 'var(--card-bg)',
          width: 110, height: 110, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: lastCalled ? 'pop 0.4s ease' : 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          flexShrink: 0
        }}>
          <div style={{
            fontSize: 32, fontWeight: 900, 
            color: lastCalled ? 'white' : 'var(--text-muted)', 
            lineHeight: 1, fontFamily: 'Fredoka One',
            whiteSpace: 'nowrap'
          }}>
            {lastCalled ? `${letter}-${lastCalled}` : '—'}
          </div>
        </div>

        {/* Recent calls & Stats - Middle */}
        <div className="card" style={{
          flex: 1, minWidth: 200, display: 'flex',
          alignItems: 'center', padding: '10px 16px', gap: 16
        }}>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
            <div style={{fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700}}>Recent Calls</div>
            <div style={{display:'flex', gap: 8, flexWrap:'wrap'}}>
              {[...calledNumbers].reverse().slice(0,15).map(n => (
                <span key={n} style={{
                  background: COL_COLORS[Math.floor((n-1)/15)],
                  color:'white', borderRadius: '50%', width: 44, height: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 900, fontFamily: "'Inter', 'Roboto', sans-serif"
                }}>{n}</span>
              ))}
              {calledNumbers.length === 0 && <span style={{color: 'var(--text-muted)', fontSize: 12, fontWeight: 500}}>No numbers called yet</span>}
            </div>
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: 20, borderLeft: '2px solid #E0E0E0', paddingLeft: 16}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize: 24, fontWeight: 900, color:'var(--orange)', fontFamily: 'Fredoka One'}}>{calledNumbers.length}</div>
              <div style={{fontSize: 11, color: 'var(--text-muted)', fontWeight: 700}}>Called</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize: 20, fontWeight: 900, color:'var(--blue)', fontFamily: 'Fredoka One'}}>{75 - calledNumbers.length}</div>
              <div style={{fontSize: 11, color: 'var(--text-muted)', fontWeight: 700}}>Remaining</div>
            </div>
          </div>
        </div>

        {/* Winner Prize - Right corner */}
        <div className="card" style={{
          background: '#000',
          border: '4px solid #00C853',
          width: 110, height: 110, borderRadius: '50%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          flexShrink: 0,
          padding: 0
        }}>
          <div style={{fontSize: 11, color: '#E0E0E0', fontWeight: 900, marginBottom: 2, fontFamily: "'Inter', 'Roboto', sans-serif", letterSpacing: '0.5px'}}>ደራሽ</div>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 4}}>
            <div style={{fontSize: 34, fontWeight: 900, color: '#fff', fontFamily: "'Inter', 'Roboto', sans-serif", lineHeight: 1.1}}>{winnerPrize}</div>
            <div style={{fontSize: 18, color: '#FFD700', fontWeight: 500, fontFamily: "'Inter', 'Roboto', sans-serif"}}>ብር</div>
          </div>
        </div>
      </div>

      {/* Board Section - fills available space and stretches */}
      <div style={{flex: 1, padding: '4px 16px 8px 16px', overflowX: 'hidden', display: 'flex', flexDirection: 'column'}}>
        <div style={{
          width: '100%', background: '#222',
          padding: 12, borderRadius: 16,
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          flex: 1, display: 'flex', flexDirection: 'column'
        }}>
          <div style={{display:'flex', flexDirection: 'column', gap: 4, flex: 1}}>
            {LETTERS.map((l, i) => (
              <div key={l} style={{display: 'flex', gap: 12, flex: 1}}>
                {/* Letter */}
                <div style={{
                  background: COL_COLORS[i], color: 'white', borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 48, fontFamily: 'Fredoka One', fontSize: 24,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}>
                  {l}
                </div>
                {/* Numbers */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 4, flex: 1}}>
                  {Array.from({length: 15}, (_, j) => i * 15 + j + 1).map(n => {
                    const called = calledSet.has(n)
                    const shuffleCell = shuffling && !called ? getShuffleCellState(n, shuffleFrame) : null
                    return (
                      <div key={n}
                        style={{
                          background: called
                            ? COL_COLORS[i]
                            : shuffleCell
                              ? (shuffleCell.visible ? shuffleCell.color : '#2a2a2a')
                              : '#444',
                          color: 'white',
                          borderRadius: 8, textAlign:'center', padding: 0,
                          fontSize: 40, fontWeight: 900, fontFamily: "'Inter', 'Roboto', sans-serif",
                          transition: shuffling ? 'opacity 0.08s ease, background-color 0.08s ease' : 'all 0.2s',
                          border: called ? `2px solid ${COL_COLORS[i]}` : '2px solid #555',
                          animation: shuffling ? 'none' : (called && n === lastCalled ? 'pop 0.4s ease' : 'none'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          height: '100%',
                          opacity: shuffleCell ? (shuffleCell.visible ? 1 : 0.15) : 1
                        }}>
                        {shuffleCell ? (shuffleCell.visible && shuffleCell.showNumber ? n : '') : n}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar — order: Play, Check Winner, Shuffle, Speed | End Game (right) */}
      <div className="game-action-bar">
        <div className="game-action-bar-left">
        {/* 1. Play */}
        <button className="game-btn-play" onClick={handlePlayPause}
          style={{
            padding: '10px 24px', borderRadius: 50, border: 'none',
            background: autoMode ? 'linear-gradient(135deg, #F44336, #FF5252)' : 'linear-gradient(135deg, #00C853, #00E676)',
            color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
            fontFamily: "'Inter', 'Roboto', sans-serif", transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
          {autoMode ? (
            <>
              <span>⏸️</span> Pause
            </>
          ) : (
            <>
              <span>▶️</span> Play
            </>
          )}
        </button>

        {/* 2. Check Winner */}
        <button className="game-btn-check-winner" onClick={() => setShowWinner(true)} disabled={autoMode}
          style={{
            padding: '10px 20px', borderRadius: 50, border: 'none',
            background: autoMode ? '#555' : 'linear-gradient(135deg, #E91E63, #FF4081)',
            color: '#fff', fontWeight: 800, fontSize: 14, 
            cursor: autoMode ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', 'Roboto', sans-serif", transition: 'all 0.15s',
            opacity: autoMode ? 0.4 : 1
          }}>
          🏆 Check Winner
        </button>

        {/* 3. Shuffle */}
        <button className="game-btn-shuffle" onClick={handleShuffle} disabled={shuffling || hasPlayed || !gameActive}
          style={{
            padding: '10px 24px', borderRadius: 50, border: 'none',
            background: (shuffling || hasPlayed || !gameActive) ? '#555' : 'linear-gradient(135deg, #7C4DFF, #B388FF)',
            color: '#fff', fontWeight: 800, fontSize: 14,
            cursor: (shuffling || hasPlayed || !gameActive) ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', 'Roboto', sans-serif", transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 8,
            animation: shuffling ? 'shake 0.1s ease infinite' : 'none',
            opacity: (shuffling || hasPlayed || !gameActive) ? 0.5 : 1
          }}>
          🔀 Shuffle
        </button>

        {/* 4. Speed Control */}
        <div className="game-btn-speed-control" style={{display:'flex', alignItems:'center', gap:8, background:'rgba(0,0,0,0.05)', padding:'6px 16px', borderRadius:50, color:'var(--text)', border: '1px solid #E0E0E0',
          opacity: autoMode ? 0.4 : 1, pointerEvents: autoMode ? 'none' : 'auto'}}>
          <span style={{fontSize: 13, fontWeight: 700, whiteSpace:'nowrap', fontFamily: "'Inter', 'Roboto', sans-serif"}}>Speed Control: <span style={{color: '#FF6B00'}}>{Number(callSpeed).toFixed(Number(callSpeed) % 1 === 0 ? 0 : 1)} sec</span></span>
          <button type="button" onClick={() => changeSpeed(-0.5)}
            aria-label="Decrease speed"
            disabled={autoMode || callSpeed <= 1}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: callSpeed <= 1 ? '#ddd' : 'linear-gradient(135deg, #FFB74D, #FF9800)',
              color: '#fff', fontSize: 18, fontWeight: 900, cursor: (autoMode || callSpeed <= 1) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
            }}
          >
            −
          </button>
          <input type="range" min={1} max={5} step={0.5} value={callSpeed}
            disabled={autoMode}
            onChange={e => setCallSpeed(Number(e.target.value))}
            style={{width: 100}} />
          <button type="button" onClick={() => changeSpeed(0.5)}
            aria-label="Increase speed"
            disabled={autoMode || callSpeed >= 5}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: callSpeed >= 5 ? '#ddd' : 'linear-gradient(135deg, #FFB74D, #FF9800)',
              color: '#fff', fontSize: 18, fontWeight: 900, cursor: (autoMode || callSpeed >= 5) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
            }}
          >
            +
          </button>
        </div>
        </div>

        {/* End Game — blue, stays on the right */}
        <button className="game-action-bar-end" onClick={() => {
          if (autoRef.current) {
            clearTimeout(autoRef.current)
            autoRef.current = null
          }
          setAutoMode(false)
          resetLocked()
          endGame(null)
          navigate('/')
        }}>
          End Game
        </button>
      </div>

      {showWinner && (
        <WinnerModal
          calledSet={calledSet}
          cards={cards}
          registeredCardIds={registeredCardIds}
          lockedCardIds={lockedCardIds}
          onLock={lockCard}
          onClose={() => setShowWinner(false)}
          onConfirmWin={(cardName) => handleEndGame(cardName)}
          onNewGame={() => {
            clearTimeout(autoRef.current)
            autoRef.current = null
            setAutoMode(false)
            resetLocked()
            endGame(null)
            navigate('/')
          }}
        />
      )}
    </div>
  )
}

function WinnerModal({ calledSet, cards, registeredCardIds, lockedCardIds, onLock, onClose, onConfirmWin, onNewGame }) {
  const [cardNumber, setCardNumber] = useState('')
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [showLockIcon, setShowLockIcon] = useState(false)
  const [lockedCardNum, setLockedCardNum] = useState(null)
  const autoCloseTimerRef = useRef(null)
  const lockIconTimerRef = useRef(null)

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
      if (lockIconTimerRef.current) clearTimeout(lockIconTimerRef.current)
    }
  }, [])

  // Helper: extract the number from a card name like "Card 1" -> "1"
  function extractNumber(name) {
    const m = name.match(/\d+/)
    return m ? m[0] : null
  }

  function findCard(query) {
    // 1) Try exact name match (case-insensitive): "Card 1" matches "Card 1"
    let card = cards.find(c => c.name.toLowerCase() === query.toLowerCase())
    if (card) return card

    // 2) Try matching just the number portion: "1" matches "Card 1"
    card = cards.find(c => {
      const num = extractNumber(c.name)
      return num && num === query
    })
    if (card) return card

    // 3) Try "Card X" format: user types "1", try matching "Card 1"
    card = cards.find(c => c.name.toLowerCase() === `card ${query}`.toLowerCase())
    return card || null
  }

  function handleCheck() {
    setResult(null)
    setErrorMsg('')
    setShowLockIcon(false)
    setLockedCardNum(null)
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
    if (lockIconTimerRef.current) clearTimeout(lockIconTimerRef.current)

    const query = cardNumber.trim()
    if (!query) {
      setErrorMsg('Please enter a card number.')
      return
    }

    const card = findCard(query)

    if (!card) {
      setErrorMsg(`Card "${query}" does not exist in the system.`)
      return
    }

    // Check if it's registered
    if (!registeredCardIds.includes(card.id)) {
      setErrorMsg(`Card "${card.name}" is NOT registered for this round.`)
      playSpecialVoice('not_registered')
      return
    }

    // Check if it's locked - show lock icon with card number
    if (lockedCardIds.includes(card.id)) {
      setErrorMsg(`Card "${card.name}" is locked — already checked this round and was not a winner.`)
      setLockedCardNum(extractNumber(card.name))
      setShowLockIcon(true)
      return
    }

    const patterns = checkWin(card.flat, calledSet)
    const isWinner = patterns.length > 0

    setResult({ flat: card.flat, cardName: card.name, cardId: card.id, patterns, isWinner })

    // Play appropriate voice
    if (isWinner) {
      playSpecialVoice('winner')
    } else {
      playSpecialVoice('not_winner')
      onLock(card.id) // Lock it immediately
      // Show lock icon after 2 seconds, then disappear after 5s total
      lockIconTimerRef.current = setTimeout(() => {
        setShowLockIcon(true)
        setLockedCardNum(extractNumber(card.name))
      }, 2000)
      // Disappear auto after 5s
      autoCloseTimerRef.current = setTimeout(() => {
        onClose()
      }, 5000)
    }
  }

  function handleCheckOther() {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
    setResult(null)
    setCardNumber('')
    setErrorMsg('')
  }

  // Determine Title text and styling based on checking state
  let modalTitle = '🏆 Check Winner'
  let titleColor = 'var(--pink)'
  if (result) {
    if (result.isWinner) {
      modalTitle = '🎉 💐 Winner 💐 🎉'
      titleColor = '#00C853'
    } else {
      modalTitle = '🔒 Not Winner'
      titleColor = '#F44336'
    }
  }

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100}}>
      <div style={{
        background:'white', borderRadius:20, padding:28, maxWidth:520, width:'95%',
        maxHeight:'90vh', overflowY:'auto', border: '1px solid #E0E0E0',
        boxShadow: 'var(--shadow)',
        fontFamily: "'Inter', 'Roboto', sans-serif"
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
          <h2 style={{color: titleColor, fontFamily: 'Fredoka One', fontSize: 22}}>{modalTitle}</h2>
          <button onClick={() => {
            if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
            onClose()
          }} style={{background:'none', border:'none', fontSize:24, cursor:'pointer', color: 'var(--text-muted)'}}>×</button>
        </div>

        {/* Card number input - only show if there is no result */}
        {!result && (
          <div style={{marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12}}>
            <label style={{fontSize: 13, color: 'var(--text-muted)', display: 'block', fontWeight: 700}}>
              Enter card number:
            </label>
            <input
              type="number"
              min={1}
              value={cardNumber}
              onChange={e => { setCardNumber(e.target.value); setErrorMsg(''); setResult(null); }}
              onKeyDown={e => { if (e.key === 'Enter') handleCheck() }}
              placeholder="e.g. 1"
              style={{
                width: '100%', height: 48, borderRadius: 4, border: '2px solid #E0E0E0',
                background: 'white', color: 'var(--text)', fontSize: 26, fontWeight: 900,
                textAlign: 'center', fontFamily: "'Inter', 'Roboto', sans-serif", outline: 'none',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
            <button onClick={handleCheck}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 50, border: 'none',
                background: 'linear-gradient(135deg, #00C853, #00E676)',
                color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
                fontFamily: "'Inter', 'Roboto', sans-serif", marginTop: 8
              }}>
              🔍 Check
            </button>
          </div>
        )}

        {/* Error/Info message */}
        {errorMsg && (
          <div style={{
            background: errorMsg.includes('🔒') || errorMsg.includes('locked') ? 'rgba(255,107,0,0.12)' : errorMsg.includes('NOT registered') ? '#FFF3E0' : 'rgba(244,67,54,0.12)',
            border: `1px solid ${errorMsg.includes('🔒') || errorMsg.includes('locked') ? 'rgba(255,107,0,0.3)' : errorMsg.includes('NOT registered') ? 'rgba(255,107,0,0.3)' : 'rgba(244,67,54,0.3)'}`,
            borderRadius: 12, padding: '10px 14px', marginBottom: 16,
            fontSize: 13, color: errorMsg.includes('🔒') || errorMsg.includes('locked') ? '#FF9100' : errorMsg.includes('NOT registered') ? 'var(--orange)' : '#FF5252', fontWeight: 600
          }}>
            {errorMsg}
          </div>
        )}

        {/* Result — show card grid without input fields/winning patterns details */}
        {result && (
          <div style={{position: 'relative'}}>
            <h3 style={{marginBottom: 16, color: 'var(--text)', fontSize: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <span>Card: <span style={{color: 'var(--orange)', fontFamily: 'Fredoka One'}}>{result.cardName}</span></span>
              {result.isWinner ? (
                <span style={{color: '#00C853', fontWeight: 900, fontSize: 15}}>🎉 Winner!</span>
              ) : (
                <span style={{color: '#FF5252', fontWeight: 900, fontSize: 15}}>🔒 Locked (Not Winner)</span>
              )}
            </h3>

            {/* Display card with called/uncalled highlighting */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4, marginBottom:20}}>
              {LETTERS.map((l,i) => (
                <div key={l} style={{background:COL_COLORS[i], color:'white', textAlign:'center', borderRadius:8, padding:6, fontFamily:'Fredoka One', fontSize:16}}>{l}</div>
              ))}
              {result.flat.map((val, idx) => {
                const col = idx % 5
                const isCalled = val === 'FREE' || calledSet.has(val)
                const isWinCell = result.isWinner && result.patterns.some(p => p.cells.includes(idx))
                return (
                  <div key={idx} style={{
                    background: isWinCell ? 'var(--green)' : isCalled ? COL_COLORS[col]+'22' : '#F5F5F5',
                    border: `2px solid ${isWinCell ? 'var(--green)' : isCalled ? COL_COLORS[col] : '#E0E0E0'}`,
                    borderRadius:8, textAlign:'center', padding:'8px 4px',
                    fontWeight:900, fontSize:14,
                    color: isWinCell ? 'white' : isCalled ? COL_COLORS[col] : 'var(--text-muted)'
                  }}>
                    {val === 'FREE' ? '★' : val}
                  </div>
                )
              })}
            </div>

            {/* Lock Icon Display for non-winners (appears after 2 seconds) */}
            {showLockIcon && !result.isWinner && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 16, marginBottom: 20, padding: 24,
                background: 'rgba(244,67,54,0.08)', borderRadius: 16,
                border: '2px solid rgba(244,67,54,0.2)',
                animation: 'pulse 0.6s ease-in-out'
              }}>
                <div style={{fontSize: 80, lineHeight: 1}}>🔒</div>
                <div style={{fontSize: 18, fontWeight: 900, color: '#F44336', textAlign: 'center'}}>Card Locked</div>
              </div>
            )}

            {/* Action buttons side-by-side with medium font size and bold weight */}
            <div style={{display: 'flex', flexDirection: 'row', gap: 10, marginTop: 20, width: '100%'}}>
              <button 
                onClick={handleCheckOther}
                style={{
                  flex: 1, padding: '12px 6px', borderRadius: 50, border: 'none',
                  background: 'linear-gradient(135deg, #0091EA, #00B0FF)', color: '#fff',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', 'Roboto', sans-serif",
                  whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'
                }}
              >
                🔄 Check Other
              </button>
              <button 
                onClick={() => {
                  if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
                  if (lockIconTimerRef.current) clearTimeout(lockIconTimerRef.current)
                  onNewGame()
                }}
                style={{
                  flex: 1, padding: '12px 6px', borderRadius: 50, border: 'none',
                  background: 'linear-gradient(135deg, #FF6B00, #FF9100)', color: '#fff',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', 'Roboto', sans-serif",
                  whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'
                }}
              >
                🎮 New Game
              </button>
              <button 
                onClick={() => {
                  if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
                  if (lockIconTimerRef.current) clearTimeout(lockIconTimerRef.current)
                  onClose()
                }}
                style={{
                  flex: 1, padding: '12px 6px', borderRadius: 50, border: '1px solid #E0E0E0',
                  background: '#fff', color: 'var(--text-muted)',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', 'Roboto', sans-serif",
                  whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden'
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        )}

        {/* Lock Icon Display for already-locked cards (shown with error message) */}
        {showLockIcon && !result && errorMsg.includes('locked') && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 16, marginBottom: 20, padding: 24,
            background: 'rgba(255,107,0,0.12)', borderRadius: 16,
            border: '2px solid rgba(255,107,0,0.3)',
            animation: 'pulse 0.6s ease-in-out'
          }}>
            <div style={{fontSize: 80, lineHeight: 1}}>🔒</div>
            {lockedCardNum && (
              <div style={{fontSize: 24, fontWeight: 900, color: '#FF6B00'}}>Card {lockedCardNum}</div>
            )}
            <div style={{fontSize: 16, fontWeight: 900, color: '#FF6B00', textAlign: 'center'}}>Already Locked</div>
          </div>
        )}
      </div>
    </div>
  )
}
