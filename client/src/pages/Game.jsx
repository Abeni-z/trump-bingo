import React, { useState, useEffect, useRef } from 'react'
import { useBingoStore, checkWin, cardToFlat } from '../store/bingoStore.js'
import { speakNumber, playSpecialVoice, getLetterForNumber } from '../utils/voice.js'
import { playShuffleMixSound } from '../utils/shuffleSound.js'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../utils/brand.jsx'

const COL_COLORS = ['#0091EA', '#00BCD4', '#FF6B00', '#7C4DFF', '#E91E63']
const SHUFFLE_COLORS = ['#0091EA', '#00BCD4', '#FF6B00', '#7C4DFF', '#E91E63', '#00C853', '#F44336', '#FFD600', '#FF4081', '#26C6DA']
const LETTERS = ['B', 'I', 'N', 'G', 'O']

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

function getCardProgress(flatCard, calledSet) {
  const hit = flatCard.map(v => v === 'FREE' || calledSet.has(v))
  const patterns = []
  
  // 5 rows
  for (let r = 0; r < 5; r++) {
    patterns.push([0,1,2,3,4].map(c => r*5+c))
  }
  // 5 cols
  for (let c = 0; c < 5; c++) {
    patterns.push([0,1,2,3,4].map(r => r*5+c))
  }
  // diagonals
  patterns.push([0,6,12,18,24])
  patterns.push([4,8,12,16,20])
  // four corners
  patterns.push([0,4,20,24])

  let minRemaining = 5
  for (const cells of patterns) {
    const unhitCount = cells.filter(i => !hit[i]).length
    if (unhitCount < minRemaining) {
      minRemaining = unhitCount
    }
  }
  return minRemaining
}

export default function Game() {
  const navigate = useNavigate()
  const { language, voiceEnabled, callSpeed, setCallSpeed, betAmount, housePercent, houseBetMode, calledNumbers, lastCalled, gameActive, callRandom, endGame, cards, registeredCardIds, lockedCardIds, lockCard, resetLocked } = useBingoStore()
  const [autoMode, setAutoMode] = useState(false)
  const [showWinner, setShowWinner] = useState(false)
  const [shuffling, setShuffling] = useState(false)
  const [shuffleFrame, setShuffleFrame] = useState(0)
  const [hasPlayed, setHasPlayed] = useState(calledNumbers.length > 0)
  const [showProgress, setShowProgress] = useState(true)
  const autoRef = useRef(null)
  const autoModeRef = useRef(false)
  const shuffleSoundStopRef = useRef(null)

  function changeSpeed(delta) {
    const nextSpeed = Math.round((Number(callSpeed) + delta) * 2) / 2
    setCallSpeed(Math.min(5, Math.max(1, nextSpeed)))
  }

  useEffect(() => {
    autoModeRef.current = autoMode
  }, [autoMode])

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
          if (voiceEnabled) speakNumber(num, language, voiceEnabled)
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
      playSpecialVoice('begning')
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
    
    const audio = new Audio('/voices/shuffle.mp3')
    audio.loop = true
    audio.play().catch(err => {
      console.warn('Could not play shuffle audio file:', err)
    })
    
    shuffleSoundStopRef.current = () => {
      audio.pause()
      audio.currentTime = 0
    }

    const interval = setInterval(() => {
      setShuffleFrame(f => f + 1)
    }, 90)

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
  const income = houseBetMode ? betAmount : Math.round(totalPot * housePercent / 100)
  const winnerPrize = totalPot - income

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'Bebas Neue', 'Fredoka One', 'Inter', sans-serif",
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      paddingTop: 12,
      paddingBottom: 12
    }}>

      {/* TOP SECTION: Indicators — NO orange header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', gap: 6,
        padding: '4px 8px', alignItems: 'stretch', flexWrap: 'wrap',
        marginBottom: 1
      }}>
        {/* Current ball — bigger circle */}
        <div className="card" style={{
          background: lastCalled ? COL_COLORS[['B', 'I', 'N', 'G', 'O'].indexOf(letter)] : 'var(--card-bg)',
          width: 140, height: 140, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: lastCalled ? '6px solid #00C853' : '6px solid #484848',
          boxSizing: 'border-box',
          flexShrink: 0,
          padding: 0
        }}>
          <div key={lastCalled} style={{
            fontSize: 54, fontWeight: 900,
            color: lastCalled ? 'white' : 'var(--text-muted)',
            lineHeight: 1, fontFamily: "'Nunito', sans-serif",
            whiteSpace: 'nowrap',
            animation: lastCalled ? 'ballPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' : 'none'
          }}>
            {lastCalled ? `${letter}-${lastCalled}` : '—'}
          </div>
        </div>

        {/* Recent calls — 10 numbers, no wrapping, fixed width to fit them exactly */}
        <div className="card" style={{
          width: 580, flexShrink: 0, display: 'flex',
          alignItems: 'center', padding: '8px 12px', gap: 12,
          boxSizing: 'border-box'
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>Recent Calls</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'hidden' }}>
              {[...calledNumbers].reverse().slice(0, 10).map(n => (
                <span key={n} style={{
                  background: COL_COLORS[Math.floor((n - 1) / 15)],
                  color: 'white', borderRadius: '50%', width: 48, height: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 900, fontFamily: "'Nunito', sans-serif",
                  flexShrink: 0
                }}>{n}</span>
              ))}
              {calledNumbers.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>No calls yet</span>}
            </div>
          </div>
        </div>

        {/* Stats & Progress Combined Card */}
        <div className="card" style={{
          flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column',
          padding: '6px 8px', margin: 0, position: 'relative', border: '1px solid rgba(0,200,83,0.3)',
          boxSizing: 'border-box', justifyContent: 'center', maxHeight: 124, overflowY: 'auto'
        }}>
          {showProgress ? (
            <>
              <button onClick={() => setShowProgress(false)} style={{
                position: 'absolute', right: 6, top: 6, background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.3)',
                color: 'var(--orange)', cursor: 'pointer', fontSize: 11, fontWeight: 'bold', padding: '2px 6px', borderRadius: 4,
                fontFamily: "'Inter', sans-serif"
              }} title="Show game stats">📊 Stats</button>
              
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>
                📈 Progress
              </div>
              
              {(() => {
                const progressMap = { 1: [], 2: [] }
                const registeredCards = cards.filter(c => registeredCardIds.includes(c.id))
                registeredCards.forEach(card => {
                  const minRemaining = getCardProgress(card.flat, calledSet)
                  if (minRemaining === 1 || minRemaining === 2) {
                    const cardNum = card.name.match(/\d+/)?.[0] || card.name
                    progressMap[minRemaining].push(cardNum)
                  }
                })

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'center' }}>
                    {/* 1 Away wrapping to full width */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, width: '100%' }}>
                      <span style={{
                        background: '#D50000', color: 'white', fontSize: 10, fontWeight: 850,
                        padding: '2px 4px', borderRadius: 3, whiteSpace: 'nowrap', flexShrink: 0
                      }}>1 AWAY</span>
                      {progressMap[1].length > 0 ? (
                        progressMap[1].map(num => (
                          <span key={num} style={{ background: '#FFEBEE', color: '#D50000', padding: '1px 4px', borderRadius: 2, fontSize: 12, fontWeight: 800 }}>#{num}</span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>None</span>
                      )}
                    </div>
                    
                    {/* 2 Away wrapping to full width */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, width: '100%' }}>
                      <span style={{
                        background: '#E65100', color: 'white', fontSize: 10, fontWeight: 850,
                        padding: '2px 4px', borderRadius: 3, whiteSpace: 'nowrap', flexShrink: 0
                      }}>2 AWAY</span>
                      {progressMap[2].length > 0 ? (
                        progressMap[2].map(num => (
                          <span key={num} style={{ background: '#FFF3E0', color: '#E65100', padding: '1px 4px', borderRadius: 2, fontSize: 12, fontWeight: 800 }}>#{num}</span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 500 }}>None</span>
                      )}
                    </div>
                  </div>
                )
              })()}
            </>
          ) : (
            <>
              <button onClick={() => setShowProgress(true)} style={{
                position: 'absolute', right: 6, top: 6, background: 'rgba(0,200,83,0.1)', border: '1px solid rgba(0,200,83,0.3)',
                color: '#00C853', cursor: 'pointer', fontSize: 11, fontWeight: 'bold', padding: '2px 6px', borderRadius: 4,
                fontFamily: "'Inter', sans-serif"
              }} title="Show progress tracker">📈 Progress</button>
              
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2, fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>
                📊 Game Stats
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1, marginTop: 4 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--orange)', fontFamily: "'Nunito', sans-serif", lineHeight: 1.1 }}>{calledNumbers.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>Called</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--blue)', fontFamily: "'Nunito', sans-serif", lineHeight: 1.1 }}>{75 - calledNumbers.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, fontFamily: "'Inter', sans-serif" }}>Remaining</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Winner Prize — bigger circle */}
        <div className="card" style={{
          background: '#000',
          border: '3px solid #00C853',
          width: 140, height: 140, borderRadius: '50%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          flexShrink: 0,
          padding: 0
        }}>
          <div style={{ fontSize: 14, color: '#E0E0E0', fontWeight: 800, marginBottom: 2, fontFamily: "'Inter', sans-serif", letterSpacing: '0.5px' }}>ደራሽ</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: '#fff', fontFamily: "'Nunito', sans-serif", lineHeight: 1.1 }}>{winnerPrize}</div>
            <div style={{ fontSize: 20, color: '#FFD700', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>ብር</div>
          </div>
        </div>
      </div>

      {/* Board Section */}
      <div style={{ flex: 1, padding: '4px 16px 8px 16px', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          width: '100%', background: '#111',
          padding: '8px 10px', borderRadius: 16,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          flex: 1, display: 'flex', flexDirection: 'column'
        }}>
          <style>{`
            @keyframes ballPop {
              0% { transform: scale(0.5); opacity: 0; }
              70% { transform: scale(1.12); }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes lastCalledPulse {
              0%   { transform: scale(1); }
              100% { transform: scale(1.12); }
            }
            @keyframes blinkYellowAnim {
              0%, 100% {
                opacity: 1;
                transform: scale(1);
                box-shadow: 0 0 10px 4px #FFD700, 0 0 20px 8px rgba(255, 215, 0, 0.6);
              }
              50% {
                opacity: 0.35;
                transform: scale(0.75);
                box-shadow: 0 0 4px 1px #FFD700, 0 0 8px 3px rgba(255, 215, 0, 0.3);
              }
            }
            @keyframes blinkRedAnim {
              0%, 100% {
                opacity: 1;
                transform: scale(1);
                box-shadow: 0 0 10px 4px #FF1744, 0 0 20px 8px rgba(255, 23, 68, 0.6);
              }
              50% {
                opacity: 0.35;
                transform: scale(0.75);
                box-shadow: 0 0 4px 1px #FF1744, 0 0 8px 3px rgba(255, 23, 68, 0.3);
              }
            }
            .blink-yellow {
              animation: blinkYellowAnim 0.6s infinite alternate;
            }
            .blink-red {
              animation: blinkRedAnim 0.6s infinite alternate-reverse;
            }
            .bingo-cell {
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 10px;
              height: 100%;
              font-family: 'Nunito', sans-serif;
              font-weight: 900;
              font-size: clamp(28px, 4vw, 52px);
              color: #fff;
              line-height: 1;
              transition: background 0.2s, border-color 0.2s;
              user-select: none;
            }
            .bingo-cell-uncalled {
              background: #000;
              border: 2px solid #484848;
              color: #fff;
            }
            .bingo-cell-called {
              border: 2px solid transparent;
              color: #fff;
            }
            .bingo-cell-last {
              background: #00C853 !important;
              border: 2px solid #69F0AE !important;
              color: #fff !important;
              animation: lastCalledPulse 0.6s ease-in-out infinite alternate;
              z-index: 2;
              position: relative;
            }
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
            {LETTERS.map((l, i) => (
              <div key={l} style={{ display: 'flex', gap: 6, flex: 1 }}>
                {/* Letter */}
                <div style={{
                  background: COL_COLORS[i], color: 'white', borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 72, flexShrink: 0,
                  fontFamily: "'Inter', 'Roboto', sans-serif",
                  fontSize: 'clamp(28px, 3.5vw, 48px)',
                  fontWeight: 900,
                  letterSpacing: '4px',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.4)'
                }}>
                  {l}
                </div>
                {/* Numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 1, flex: 1 }}>
                  {Array.from({ length: 15 }, (_, j) => i * 15 + j + 1).map(n => {
                    const called = calledSet.has(n)
                    const isLast = n === lastCalled
                    const shuffleCell = shuffling && !called ? getShuffleCellState(n, shuffleFrame) : null

                    let cellClass = 'bingo-cell '
                    let extraStyle = {}

                    if (shuffleCell) {
                      cellClass += 'bingo-cell-called'
                      extraStyle = {
                        background: shuffleCell.visible ? shuffleCell.color : '#222',
                        border: '2px solid transparent',
                        opacity: shuffleCell.visible ? 1 : 0.12,
                        transition: 'opacity 0.08s ease, background 0.08s ease',
                        animation: 'none',
                        color: '#fff'
                      }
                    } else if (isLast) {
                      cellClass += 'bingo-cell-last'
                    } else if (called) {
                      cellClass += 'bingo-cell-called'
                      extraStyle = { background: COL_COLORS[i], border: `2px solid ${COL_COLORS[i]}`, color: '#fff' }
                    } else {
                      cellClass += 'bingo-cell-uncalled'
                    }

                    return (
                      <div key={n} className={cellClass} style={extraStyle}>
                        {shuffleCell
                          ? (shuffleCell.visible && shuffleCell.showNumber ? n : '')
                          : n}

                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="game-action-bar">
        <div className="game-action-bar-left">
          <button className="game-btn-play" onClick={handlePlayPause}
            style={{
              padding: '10px 24px', borderRadius: 50, border: 'none',
              background: autoMode ? 'linear-gradient(135deg, #F44336, #FF5252)' : 'linear-gradient(135deg, #00C853, #00E676)',
              color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              fontFamily: "'Inter', 'Roboto', sans-serif", transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
            {autoMode ? (<><span>⏸️</span> Pause</>) : (<><span>▶️</span> Play</>)}
          </button>

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

          <div className="game-btn-speed-control" style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.05)', padding: '6px 16px', borderRadius: 50, color: 'var(--text)', border: '1px solid #E0E0E0',
            opacity: autoMode ? 0.4 : 1, pointerEvents: autoMode ? 'none' : 'auto'
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: "'Inter', 'Roboto', sans-serif" }}>Speed: <span style={{ color: '#FF6B00' }}>{Number(callSpeed).toFixed(Number(callSpeed) % 1 === 0 ? 0 : 1)} sec</span></span>
            <button type="button" onClick={() => changeSpeed(-0.5)}
              aria-label="Decrease speed"
              disabled={autoMode || callSpeed <= 1}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                background: callSpeed <= 1 ? '#ddd' : 'linear-gradient(135deg, #FFB74D, #FF9800)',
                color: '#fff', fontSize: 18, fontWeight: 900, cursor: (autoMode || callSpeed <= 1) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
              }}>−</button>
            <input type="range" min={1} max={5} step={0.5} value={callSpeed}
              disabled={autoMode}
              onChange={e => setCallSpeed(Number(e.target.value))}
              style={{ width: 100 }} />
            <button type="button" onClick={() => changeSpeed(0.5)}
              aria-label="Increase speed"
              disabled={autoMode || callSpeed >= 5}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                background: callSpeed >= 5 ? '#ddd' : 'linear-gradient(135deg, #FFB74D, #FF9800)',
                color: '#fff', fontSize: 18, fontWeight: 900, cursor: (autoMode || callSpeed >= 5) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
              }}>+</button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginLeft: 'auto',
          flexShrink: 0,
          background: 'transparent'
        }}>
          <span style={{
            fontFamily: "'Fredoka One', cursive",
            fontSize: 16,
            color: '#2196F3',
            background: 'transparent',
            fontWeight: 800,
            whiteSpace: 'nowrap',
            lineHeight: 1
          }}>
            TRUMP bingo
          </span>
          <button className="game-action-bar-end" style={{ marginLeft: 0 }} onClick={() => {
            if (autoRef.current) { clearTimeout(autoRef.current); autoRef.current = null }
            setAutoMode(false)
            resetLocked()
            endGame(null)
            navigate('/')
          }}>
            End Game
          </button>
        </div>
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

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
      if (lockIconTimerRef.current) clearTimeout(lockIconTimerRef.current)
    }
  }, [])

  function extractNumber(name) {
    const m = name.match(/\d+/)
    return m ? m[0] : null
  }

  function findCard(query) {
    let card = cards.find(c => c.name.toLowerCase() === query.toLowerCase())
    if (card) return card
    card = cards.find(c => {
      const num = extractNumber(c.name)
      return num && num === query
    })
    if (card) return card
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
    if (!query) { setErrorMsg('Please enter a card number.'); return }

    const card = findCard(query)
    if (!card) { setErrorMsg(`Card "${query}" does not exist in the system.`); return }
    if (!registeredCardIds.includes(card.id)) {
      setErrorMsg(`Card "${card.name}" is NOT registered for this round.`)
      playSpecialVoice('not_registered')
      return
    }
    if (lockedCardIds.includes(card.id)) {
      setErrorMsg(`Card "${card.name}" is locked — already checked this round and was not a winner.`)
      setLockedCardNum(extractNumber(card.name))
      setShowLockIcon(true)
      return
    }

    const patterns = checkWin(card.flat, calledSet)
    const isWinner = patterns.length > 0

    setResult({ flat: card.flat, cardName: card.name, cardId: card.id, patterns, isWinner })

    if (isWinner) {
      playSpecialVoice('winner')
    } else {
      playSpecialVoice('not_winner')
      onLock(card.id)
      lockIconTimerRef.current = setTimeout(() => {
        setShowLockIcon(true)
        setLockedCardNum(extractNumber(card.name))
      }, 2000)
      autoCloseTimerRef.current = setTimeout(() => { onClose() }, 5000)
    }
  }

  function handleCheckOther() {
    if (autoCloseTimerRef.current) { clearTimeout(autoCloseTimerRef.current); autoCloseTimerRef.current = null }
    setResult(null)
    setCardNumber('')
    setErrorMsg('')
  }

  let modalTitle = '🏆 Check Winner'
  let titleColor = 'var(--pink)'
  if (result) {
    if (result.isWinner) { modalTitle = '🎉 Winner 🎉'; titleColor = '#00C853' }
    else { modalTitle = '🔒 Not Winner'; titleColor = '#F44336' }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      {result && result.isWinner && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 101,
          overflow: 'hidden'
        }}>
          <style>{`
            @keyframes confetti-burst {
              0% {
                transform: translate(var(--x0), var(--y0)) rotate(0deg) scale(1);
                opacity: 1;
              }
              25% {
                transform: translate(var(--x1), var(--y1)) rotate(var(--spin1)) scale(1.1);
                opacity: 1;
              }
              100% {
                transform: translate(var(--x2), var(--y2)) rotate(var(--spin2)) scale(0.4);
                opacity: 0;
              }
            }
            .confetti-piece {
              position: absolute;
              bottom: 0;
              left: 50%;
              animation: confetti-burst var(--duration) cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
              animation-delay: var(--delay);
              opacity: 0;
            }
          `}</style>
          {Array.from({ length: 450 }).map((_, i) => {
            const angle = (Math.random() * 160 - 80) * (Math.PI / 180)
            const velocity = 40 + Math.random() * 55
            const xMid = Math.sin(angle) * velocity
            const yMid = -velocity * (0.7 + Math.random() * 0.5)
            const xEnd = xMid + (Math.random() - 0.5) * 30
            const yEnd = yMid + 60 + Math.random() * 80
            const spin1 = 180 + Math.random() * 360
            const spin2 = spin1 + 360 + Math.random() * 720
            const size = 6 + Math.random() * 10
            const duration = 3.5 + Math.random() * 3.5
            const delay = Math.random() * 0.4
            const colors = ['#FF6B00', '#00C853', '#2196F3', '#FFC107', '#E91E63', '#9C27B0', '#FF4081', '#00BCD4', '#FFEB3B', '#76FF03']
            const shapes = ['50%', '2px', '0']
            return (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  '--x0': '0px',
                  '--y0': '0px',
                  '--x1': `${xMid}vw`,
                  '--y1': `${yMid}vh`,
                  '--x2': `${xEnd}vw`,
                  '--y2': `${yEnd}vh`,
                  '--spin1': `${spin1}deg`,
                  '--spin2': `${spin2}deg`,
                  '--duration': `${duration}s`,
                  '--delay': `${delay}s`,
                  width: size,
                  height: size * (0.5 + Math.random() * 0.8),
                  background: colors[Math.floor(Math.random() * colors.length)],
                  borderRadius: shapes[Math.floor(Math.random() * shapes.length)],
                  boxShadow: `0 0 ${2 + Math.random() * 4}px rgba(255,255,255,0.3)`
                }}
              />
            )
          })}
        </div>
      )}
      <div style={{
        background: 'white', borderRadius: 20, padding: 28, maxWidth: 520, width: '95%',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid #E0E0E0',
        boxShadow: 'var(--shadow)',
        fontFamily: "'Inter', 'Roboto', sans-serif"
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#FF6B00', fontFamily: "'Nunito', sans-serif", marginBottom: 4 }}>TRUMP Bingo</div>
            <h2 style={{ color: titleColor, fontFamily: 'Fredoka One', fontSize: 22, margin: 0 }}>{modalTitle}</h2>
          </div>
          <button onClick={() => { if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current); onClose() }}
            style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
        </div>

        {!result && (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>Enter card number:</label>
            <input
              type="number" min={1} value={cardNumber}
              onChange={e => { setCardNumber(e.target.value); setErrorMsg(''); setResult(null) }}
              onKeyDown={e => { if (e.key === 'Enter') handleCheck() }}
              placeholder="e.g. 1"
              style={{
                width: '100%', height: 48, borderRadius: 4, border: '2px solid #E0E0E0',
                background: 'white', color: 'var(--text)', fontSize: 26, fontWeight: 900,
                textAlign: 'center', fontFamily: "'Nunito', sans-serif", outline: 'none',
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
              }}>🔍 Check</button>
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: errorMsg.includes('locked') ? 'rgba(255,107,0,0.12)' : errorMsg.includes('NOT registered') ? '#FFF3E0' : 'rgba(244,67,54,0.12)',
            border: `1px solid ${errorMsg.includes('locked') ? 'rgba(255,107,0,0.3)' : errorMsg.includes('NOT registered') ? 'rgba(255,107,0,0.3)' : 'rgba(244,67,54,0.3)'}`,
            borderRadius: 12, padding: '10px 14px', marginBottom: 16,
            fontSize: 13, color: errorMsg.includes('locked') ? '#FF9100' : errorMsg.includes('NOT registered') ? 'var(--orange)' : '#FF5252', fontWeight: 600
          }}>
            {errorMsg}
          </div>
        )}

        {result && (
          <div style={{ position: 'relative' }}>
            <h3 style={{ marginBottom: 16, color: 'var(--text)', fontSize: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--orange)', fontFamily: 'Fredoka One' }}>{result.cardName}</span>
              {result.isWinner
                ? <span style={{ color: '#00C853', fontWeight: 900, fontSize: 15 }}>🎉 Winner!</span>
                : <span style={{ color: '#FF5252', fontWeight: 900, fontSize: 15 }}>🔒 Locked (Not Winner)</span>}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4, marginBottom: 20 }}>
              {LETTERS.map((l, i) => (
                <div key={l} style={{ background: COL_COLORS[i], color: 'white', textAlign: 'center', borderRadius: 8, padding: 6, fontFamily: 'Fredoka One', fontSize: 16 }}>{l}</div>
              ))}
              {result.flat.map((val, idx) => {
                const col = idx % 5
                const isCalled = val === 'FREE' || calledSet.has(val)
                const isWinCell = result.isWinner && result.patterns.some(p => p.cells.includes(idx))
                return (
                  <div key={idx} style={{
                    background: isWinCell ? 'var(--green)' : isCalled ? COL_COLORS[col] + '22' : '#F5F5F5',
                    border: `2px solid ${isWinCell ? 'var(--green)' : isCalled ? COL_COLORS[col] : '#E0E0E0'}`,
                    borderRadius: 8, textAlign: 'center', padding: '8px 4px',
                    fontWeight: 900, fontSize: 14, fontFamily: "'Nunito', sans-serif",
                    color: isWinCell ? 'white' : isCalled ? COL_COLORS[col] : 'var(--text-muted)'
                  }}>
                    {val === 'FREE' ? '★' : val}
                  </div>
                )
              })}
            </div>
            {showLockIcon && !result.isWinner && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 16, marginBottom: 20, padding: 24,
                background: 'rgba(244,67,54,0.08)', borderRadius: 16,
                border: '2px solid rgba(244,67,54,0.2)',
                animation: 'pulse 0.6s ease-in-out'
              }}>
                <div style={{ fontSize: 80, lineHeight: 1 }}>🔒</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#F44336', textAlign: 'center' }}>Card Locked</div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' }}>
              <button onClick={handleCheckOther}
                style={{ flex: 1, padding: '12px 6px', borderRadius: 50, border: 'none', background: 'linear-gradient(135deg, #0091EA, #00B0FF)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🔄 Check Other
              </button>
              <button onClick={() => { if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current); if (lockIconTimerRef.current) clearTimeout(lockIconTimerRef.current); onNewGame() }}
                style={{ flex: 1, padding: '12px 6px', borderRadius: 50, border: 'none', background: 'linear-gradient(135deg, #FF6B00, #FF9100)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                🎮 New Game
              </button>
              <button onClick={() => { if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current); if (lockIconTimerRef.current) clearTimeout(lockIconTimerRef.current); onClose() }}
                style={{ flex: 1, padding: '12px 6px', borderRadius: 50, border: '1px solid #E0E0E0', background: '#fff', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                ❌ Cancel
              </button>
            </div>
          </div>
        )}

        {showLockIcon && !result && errorMsg.includes('locked') && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 16, marginBottom: 20, padding: 24,
            background: 'rgba(255,107,0,0.12)', borderRadius: 16,
            border: '2px solid rgba(255,107,0,0.3)',
            animation: 'pulse 0.6s ease-in-out'
          }}>
            <div style={{ fontSize: 80, lineHeight: 1 }}>🔒</div>
            {lockedCardNum && <div style={{ fontSize: 24, fontWeight: 900, color: '#FF6B00' }}>Card {lockedCardNum}</div>}
            <div style={{ fontSize: 16, fontWeight: 900, color: '#FF6B00', textAlign: 'center' }}>Already Locked</div>
          </div>
        )}
      </div>
    </div>
  )
}
