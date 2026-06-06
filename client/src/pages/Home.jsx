import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBingoStore, generateCard, cardToFlat } from '../store/bingoStore.js'

export default function Home() {
  const navigate = useNavigate()
  const { language, voiceEnabled, setLanguage, setVoiceEnabled, cards, addCard, removeCard } = useBingoStore()

  // Quick add card state
  const [addMode, setAddMode] = useState(null) // 'auto' | 'manual'
  const [cardName, setCardName] = useState('')
  const [manualCols, setManualCols] = useState(
    Array.from({length:5}, () => Array(5).fill(''))
  )
  const [addMsg, setAddMsg] = useState('')

  const COLS = ['B','I','N','G','O']
  const RANGES = ['1-15','16-30','31-45','46-60','61-75']

  function handleAutoAdd() {
    const name = cardName.trim() || `Card ${cards.length + 1}`
    const cols = generateCard()
    addCard(name, cols)
    setCardName('')
    setAddMsg(`✅ "${name}" added!`)
    setTimeout(() => setAddMsg(''), 2000)
  }

  function handleManualAdd() {
    // Validate
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        if (r === 2 && c === 2) continue // FREE
        const v = parseInt(manualCols[c][r])
        if (isNaN(v)) return setAddMsg('❌ Fill all cells')
        const [min, max] = [[1,15],[16,30],[31,45],[46,60],[61,75]][c]
        if (v < min || v > max) return setAddMsg(`❌ ${COLS[c]}: must be ${RANGES[c]}`)
      }
    }
    const parsed = manualCols.map(col => col.map((v, r) => parseInt(v)))
    const name = cardName.trim() || `Card ${cards.length + 1}`
    addCard(name, parsed)
    setCardName('')
    setManualCols(Array.from({length:5}, () => Array(5).fill('')))
    setAddMsg(`✅ "${name}" added!`)
    setTimeout(() => setAddMsg(''), 2000)
  }

  function updateCell(col, row, val) {
    setManualCols(prev => {
      const next = prev.map(c => [...c])
      next[col][row] = val
      return next
    })
  }

  return (
    <div className="page">
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* Settings */}
        <div className="card">
          <h2 style={{color:'var(--orange)', marginBottom:16}}>⚙️ Game Settings</h2>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <label style={{fontWeight:700}}>Language
              <select value={language} onChange={e => setLanguage(e.target.value)} style={{marginLeft:8}}>
                <option value="en">English</option>
                <option value="am">Amharic</option>
              </select>
            </label>
            <label style={{fontWeight:700}}>Voice
              <input type="checkbox" checked={voiceEnabled} onChange={e => setVoiceEnabled(e.target.checked)} style={{marginLeft:8, width:18, height:18}} />
              <span style={{marginLeft:4, color: voiceEnabled ? 'var(--green)':'var(--text-muted)'}}>
                {voiceEnabled ? 'ON':'OFF'}
              </span>
            </label>
          </div>
          <div style={{marginTop:20, display:'flex', gap:8, flexWrap:'wrap'}}>
            <button className="btn btn-orange" onClick={() => navigate('/game')}>🎮 Start Game</button>
            <button className="btn btn-blue" onClick={() => navigate('/cards')}>📋 Manage Cards</button>
          </div>
        </div>

        {/* Stats */}
        <div className="card" style={{background:'linear-gradient(135deg,#FFF3E0,#FFF8E1)'}}>
          <h2 style={{color:'var(--orange)', marginBottom:16}}>📊 Quick Stats</h2>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            {[
              ['🃏 Cards Registered', cards.length, 'var(--blue)'],
              ['🎯 Ready to Play', cards.length > 0 ? 'Yes':'No', 'var(--green)'],
            ].map(([label, val, color]) => (
              <div key={label} style={{background:'white', borderRadius:12, padding:12, textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.07)'}}>
                <div style={{fontSize:22, fontWeight:900, color}}>{val}</div>
                <div style={{fontSize:12, color:'var(--text-muted)', fontWeight:600}}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:16, padding:12, background:'#E3F2FD', borderRadius:12, fontSize:13, color:'#1565C0', fontWeight:600}}>
            💡 Register each player's physical card before starting game for winner verification.
          </div>
        </div>
      </div>

      {/* Card Entry */}
      <div className="card">
        <h2 style={{color:'var(--orange)', marginBottom:4}}>🃏 Register Player Cards</h2>
        <p style={{color:'var(--text-muted)', fontSize:13, marginBottom:16}}>Add each physical card held by players. Cards are identified by name/ID for winner checking.</p>

        <div style={{display:'flex', gap:8, marginBottom:16, flexWrap:'wrap'}}>
          <input placeholder="Card name / Player name" value={cardName}
            onChange={e => setCardName(e.target.value)}
            style={{flex:1, minWidth:160}} />
          <button className="btn btn-green" onClick={() => setAddMode(addMode === 'auto' ? null : 'auto')}>
            ✨ Auto-Generate
          </button>
          <button className="btn btn-blue" onClick={() => setAddMode(addMode === 'manual' ? null : 'manual')}>
            ✏️ Enter Manually
          </button>
        </div>

        {addMode === 'auto' && (
          <div style={{background:'#F1F8E9', borderRadius:12, padding:16, marginBottom:16}}>
            <p style={{fontSize:13, marginBottom:10, fontWeight:600}}>A random valid bingo card will be generated and printed for this player.</p>
            <button className="btn btn-green" onClick={handleAutoAdd}>✅ Add Auto Card</button>
          </div>
        )}

        {addMode === 'manual' && (
          <div style={{background:'#E3F2FD', borderRadius:12, padding:16, marginBottom:16}}>
            <p style={{fontSize:13, marginBottom:12, fontWeight:600}}>Enter numbers from physical card (B:1-15, I:16-30, N:31-45, G:46-60, O:61-75). Center is FREE.</p>
            <div style={{display:'flex', gap:6, justifyContent:'center', marginBottom:8}}>
              {COLS.map((letter, c) => (
                <div key={c} style={{textAlign:'center'}}>
                  <div style={{fontWeight:900, color:'white', background:['var(--blue)','var(--teal)','var(--orange)','var(--purple)','var(--pink)'][c], borderRadius:8, padding:'4px 0', marginBottom:4, fontSize:16, width:52}}>{letter}</div>
                  {Array.from({length:5}).map((_,r) => (
                    r === 2 && c === 2
                      ? <div key={r} style={{width:52, height:36, background:'#FFD600', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:11, marginBottom:3}}>FREE</div>
                      : <input key={r} type="number"
                          value={manualCols[c][r]}
                          onChange={e => updateCell(c, r, e.target.value)}
                          style={{width:52, textAlign:'center', marginBottom:3, padding:'6px 4px'}}
                          placeholder={RANGES[c].split('-')[0]}
                        />
                  ))}
                </div>
              ))}
            </div>
            <div style={{textAlign:'center'}}>
              <button className="btn btn-blue" onClick={handleManualAdd}>✅ Add Manual Card</button>
            </div>
          </div>
        )}

        {addMsg && (
          <div style={{padding:'8px 16px', borderRadius:10, background: addMsg.startsWith('✅') ? '#E8F5E9':'#FFEBEE', color: addMsg.startsWith('✅') ? '#2E7D32':'#C62828', fontWeight:700, marginBottom:12}}>
            {addMsg}
          </div>
        )}

        {/* Cards list */}
        {cards.length > 0 && (
          <div>
            <h3 style={{marginBottom:10, color:'var(--text)'}}>Registered Cards ({cards.length})</h3>
            <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
              {cards.map(card => (
                <div key={card.id} style={{background:'#FFF3E0', border:'2px solid var(--orange)', borderRadius:12, padding:'8px 14px', display:'flex', alignItems:'center', gap:8}}>
                  <span style={{fontWeight:800}}>{card.name}</span>
                  <button onClick={() => removeCard(card.id)}
                    style={{background:'none', border:'none', cursor:'pointer', color:'#F44336', fontWeight:900, fontSize:16}}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
