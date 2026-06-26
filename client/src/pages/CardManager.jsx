import React, { useState, useRef } from 'react'
import { useBingoStore, generateCard, generateCardForNumber } from '../store/bingoStore.js'
import { FULL_BRAND } from '../utils/brand.jsx'

const LETTERS = ['B','I','N','G','O']
const RANGES = [[1,15],[16,30],[31,45],[46,60],[61,75]]
const COL_COLORS = ['#0091EA','#00BCD4','#FF6B00','#7C4DFF','#E91E63']

export default function CardManager() {
  const { cards, addCard, removeCard, updateCard, clearAllCards } = useBingoStore()
  const [bulkCount, setBulkCount] = useState(5)
  const [singleCardNum, setSingleCardNum] = useState('')
  const [startFrom, setStartFrom] = useState('')
  const printRef = useRef()

  const existingNums = new Set(
    cards.map(c => parseInt(c.name.match(/\d+/)?.[0] ?? '0')).filter(n => n > 0)
  )

  const nextCardNum = existingNums.size === 0 ? 1 : Math.max(...existingNums) + 1

  function handleSingleGenerate() {
    const num = parseInt(singleCardNum)
    if (isNaN(num) || num < 1) return

    if (existingNums.has(num)) {
      if (!window.confirm(`Card ${num} already exists. Generate a duplicate?`)) return
    }

    addCard(`Card ${num}`, generateCardForNumber(num))
    setSingleCardNum('')
  }

  function handleBulkGenerate() {
    const start = startFrom !== '' ? parseInt(startFrom) : nextCardNum
    if (isNaN(start) || start < 1) return

    let skipped = 0
    for (let i = 0; i < bulkCount; i++) {
      const cardNum = start + i
      if (existingNums.has(cardNum)) {
        skipped++
        continue
      }
      addCard(`Card ${cardNum}`, generateCardForNumber(cardNum))
    }
    if (skipped > 0) {
      alert(`${skipped} card(s) were skipped because they already exist.`)
    }
    setStartFrom('')
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="page">
      <div className="card" style={{marginBottom:16}}>
        <h2 style={{color:'var(--orange)', marginBottom:16, fontFamily: "'Inter', 'Roboto', sans-serif"}}>📋 {FULL_BRAND} — Card Manager</h2>

        {/* Single Card Generator */}
        <div style={{
          display:'flex', gap:8, flexWrap:'wrap', alignItems:'center',
          padding:'10px 14px', background:'rgba(0,150,136,0.06)', borderRadius:10, marginBottom:10
        }}>
          <span style={{fontWeight:700, fontSize:14, color:'#00897B', fontFamily: "'Inter', 'Roboto', sans-serif"}}>🎯 Single Card:</span>
          <span style={{fontSize:13, color:'var(--text-muted)', fontFamily: "'Inter', 'Roboto', sans-serif"}}>Card #</span>
          <input type="number" min={1} value={singleCardNum}
            onChange={e => setSingleCardNum(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSingleGenerate() }}
            placeholder={String(nextCardNum)}
            style={{width:70, textAlign:'center'}} />
          <button className="btn" onClick={handleSingleGenerate}
            style={{background:'#00897B', color:'white', fontWeight:700, fontSize:13}}>
            + Generate Card {singleCardNum || nextCardNum}
          </button>
          {singleCardNum && existingNums.has(parseInt(singleCardNum)) && (
            <span style={{fontSize:12, color:'#F57C00', fontWeight:600, fontFamily: "'Inter', 'Roboto', sans-serif"}}>
              ⚠️ Card {singleCardNum} already exists
            </span>
          )}
        </div>

        {/* Bulk Generator */}
        <div style={{
          display:'flex', gap:8, flexWrap:'wrap', alignItems:'center',
          padding:'10px 14px', background:'rgba(33,150,243,0.06)', borderRadius:10, marginBottom:10
        }}>
          <span style={{fontWeight:700, fontSize:14, color:'var(--blue)', fontFamily: "'Inter', 'Roboto', sans-serif"}}>📦 Bulk Generate:</span>
          <span style={{fontSize:13, color:'var(--text-muted)', fontFamily: "'Inter', 'Roboto', sans-serif"}}>Start from #</span>
          <input type="number" min={1} value={startFrom}
            onChange={e => setStartFrom(e.target.value)}
            placeholder={String(nextCardNum)}
            style={{width:70, textAlign:'center'}} />
          <span style={{fontSize:13, color:'var(--text-muted)', fontFamily: "'Inter', 'Roboto', sans-serif"}}>Count</span>
          <input type="number" min={1} max={200} value={bulkCount}
            onChange={e => setBulkCount(Number(e.target.value))}
            style={{width:70, textAlign:'center'}} />
          <button className="btn btn-green" onClick={handleBulkGenerate}>
            ✨ Generate {bulkCount} Cards
          </button>
        </div>

        {/* Actions Row */}
        <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
          <button className="btn btn-blue" onClick={handlePrint}>🖨️ Print All Cards</button>
          <button className="btn btn-red" onClick={() => { if(window.confirm('Remove all cards?')) clearAllCards() }}>
            🗑️ Clear All
          </button>
          <span style={{marginLeft:'auto', fontWeight:800, color:'var(--orange)', fontFamily: "'Inter', 'Roboto', sans-serif"}}>{cards.length} cards total</span>
        </div>
      </div>

      <div ref={printRef} style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16}}>
        {[...cards].sort((a, b) => {
          const numA = parseInt(a.name.match(/\d+/)?.[0] ?? '0')
          const numB = parseInt(b.name.match(/\d+/)?.[0] ?? '0')
          return numA - numB
        }).map(card => (
          <EditableCardTile key={card.id} card={card} onRemove={() => removeCard(card.id)} onSave={updateCard} />
        ))}
        {cards.length === 0 && (
          <div style={{gridColumn:'1/-1', textAlign:'center', padding:40, color:'var(--text-muted)', fontFamily: "'Inter', 'Roboto', sans-serif"}}>
            No cards yet. Use Single Card or Bulk Generate above to create cards.
          </div>
        )}
      </div>

      <style>{`@media print { .nav, .btn { display:none!important; } }`}</style>
    </div>
  )
}

function EditableCardTile({ card, onRemove, onSave }) {
  const [editing, setEditing] = useState(false)
  const [editCols, setEditCols] = useState(null)
  const [error, setError] = useState('')

  function startEdit() {
    setEditCols(card.columns.map(col => [...col]))
    setEditing(true)
    setError('')
  }

  function cancelEdit() {
    setEditing(false)
    setEditCols(null)
    setError('')
  }

  function updateCell(colIdx, rowIdx, val) {
    setEditCols(prev => {
      const next = prev.map(c => [...c])
      next[colIdx][rowIdx] = val === '' ? '' : parseInt(val) || ''
      return next
    })
    setError('')
  }

  function handleSave() {
    // Validate all cells
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r < 5; r++) {
        if (r === 2 && c === 2) continue // FREE
        const v = parseInt(editCols[c][r])
        if (isNaN(v) || v < RANGES[c][0] || v > RANGES[c][1]) {
          setError(`${LETTERS[c]}: numbers must be ${RANGES[c][0]}-${RANGES[c][1]}`)
          return
        }
      }
    }
    // Check for duplicates within same column
    for (let c = 0; c < 5; c++) {
      const nums = editCols[c].filter((_, r) => !(r === 2 && c === 2)).map(Number)
      const unique = new Set(nums)
      if (unique.size !== nums.length) {
        setError(`${LETTERS[c]} column has duplicate numbers`)
        return
      }
    }
    onSave(card.id, editCols)
    setEditing(false)
    setEditCols(null)
    setError('')
  }

  return (
    <div className="card" style={{border:'2px solid #FFF3E0', fontFamily: "'Inter', 'Roboto', sans-serif", padding: 16}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <span style={{fontWeight:800, fontSize:15}}>{card.name}</span>
        <div style={{display:'flex', gap:6}}>
          {!editing && (
            <button onClick={startEdit}
              style={{background:'none', border:'1px solid var(--blue)', color:'var(--blue)', cursor:'pointer', fontWeight:700, fontSize:12, borderRadius:8, padding:'4px 10px'}}>
              ✏️ Edit
            </button>
          )}
          {editing && (
            <>
              <button onClick={handleSave}
                style={{background:'var(--green)', border:'none', color:'white', cursor:'pointer', fontWeight:700, fontSize:12, borderRadius:8, padding:'4px 10px'}}>
                💾 Save
              </button>
              <button onClick={cancelEdit}
                style={{background:'none', border:'1px solid #999', color:'#999', cursor:'pointer', fontWeight:700, fontSize:12, borderRadius:8, padding:'4px 10px'}}>
                Cancel
              </button>
            </>
          )}
          <button onClick={e => { e.stopPropagation(); onRemove() }}
            style={{background:'none', border:'none', color:'#F44336', cursor:'pointer', fontWeight:900, fontSize:18}}>×</button>
        </div>
      </div>

      {error && (
        <div style={{background:'#FFEBEE', color:'#D32F2F', fontSize:12, padding:'6px 10px', borderRadius:6, marginBottom:10, fontWeight:600}}>
          ⚠️ {error}
        </div>
      )}

      {/* Card grid */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4}}>
        {LETTERS.map((l,i) => (
          <div key={l} style={{
            background:COL_COLORS[i], color:'white', textAlign:'center', borderRadius:4,
            fontSize:14, fontWeight:900, padding:'4px 0'
          }}>
            {l}
          </div>
        ))}
        {/* Cells: row-major order */}
        {Array.from({length: 25}, (_, idx) => {
          const row = Math.floor(idx / 5)
          const col = idx % 5
          const isFree = row === 2 && col === 2

          if (isFree) {
            return (
              <div key={idx} style={{
                background:'#FFD600', borderRadius:4, textAlign:'center',
                fontSize:15, fontWeight:700, padding:'6px 0', color:'#333'
              }}>★</div>
            )
          }

          if (editing) {
            const val = editCols[col][row]
            return (
              <input key={idx}
                type="number"
                min={RANGES[col][0]} max={RANGES[col][1]}
                value={val}
                onChange={e => updateCell(col, row, e.target.value)}
                style={{
                  width:'100%', textAlign:'center', fontSize:14, fontWeight:700,
                  padding:'5px 0', border:'1px solid #ccc', borderRadius:4,
                  outline:'none', boxSizing:'border-box', background:'#FFFDE7'
                }}
              />
            )
          }

          const val = card.columns[col][row]
          return (
            <div key={idx} style={{
              background:'#F5F5F5', borderRadius:4, textAlign:'center',
              fontSize:14, fontWeight:700, padding:'6px 0', color:'#555'
            }}>{val}</div>
          )
        })}
      </div>
    </div>
  )
}
