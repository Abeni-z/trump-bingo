import { create } from 'zustand'
import {
  dbSaveCard, dbGetAllCards, dbDeleteCard, dbClearCards,
  dbSaveSession, dbGetAllSessions, dbClearSessions, dbDeleteSession,
  dbSaveSetting, dbGetSetting,
  dbGetBalance, dbSetBalance
} from './db.js'

// Generate a valid bingo card: B(1-15) I(16-30) N(31-45) G(46-60) O(61-75)
export function generateCard() {
  const cols = [
    [1,15],[16,30],[31,45],[46,60],[61,75]
  ]
  return cols.map(([ min, max ]) => {
    const pool = Array.from({length: max-min+1}, (_,i) => i+min)
    const shuffled = pool.sort(() => Math.random()-0.5)
    return shuffled.slice(0,5)
  })
}

// columns: array of 5 arrays of 5 numbers. center is FREE.
export function cardToFlat(columns) {
  // returns 25 cells row-by-row, index 12 = FREE
  const flat = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) flat.push('FREE')
      else flat.push(columns[col][row])
    }
  }
  return flat
}

export function checkWin(flat, called) {
  // flat: 25 cells (row-major), called: Set of numbers
  const hit = flat.map(v => v === 'FREE' || called.has(v))
  const patterns = []

  // 5 rows
  for (let r = 0; r < 5; r++) {
    const cells = [0,1,2,3,4].map(c => r*5+c)
    if (cells.every(i => hit[i])) patterns.push({ type: `Row ${r+1}`, cells })
  }
  // 5 cols
  for (let c = 0; c < 5; c++) {
    const cells = [0,1,2,3,4].map(r => r*5+c)
    if (cells.every(i => hit[i])) patterns.push({ type: `Col ${['B','I','N','G','O'][c]}`, cells })
  }
  // diagonals
  const d1 = [0,6,12,18,24]
  const d2 = [4,8,12,16,20]
  if (d1.every(i => hit[i])) patterns.push({ type: 'Diagonal ↘', cells: d1 })
  if (d2.every(i => hit[i])) patterns.push({ type: 'Diagonal ↙', cells: d2 })

  // four corners
  const corners = [0,4,20,24]
  if (corners.every(i => hit[i])) patterns.push({ type: 'Four Corners', cells: corners })

  return patterns
}

let _cardIdCounter = 0

function shuffleCallDeck() {
  const deck = Array.from({ length: 75 }, (_, i) => i + 1)
  for (let i = deck.length - 1; i > 0; i--) {
    const rand = crypto.getRandomValues(new Uint32Array(1))[0]
    const j = rand % (i + 1)
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }
  return deck
}

export const useBingoStore = create((set, get) => ({
  // Settings
  language: 'en',
  voiceEnabled: true,
  callSpeed: 3,
  betAmount: 10,
  housePercent: 20,
  houseBetMode: false, // false = percentage, true = 1Bet mode

  // Cards registry: { id, name, columns (5×5), flat }
  cards: [],

  // Which card IDs are registered (selected by players for this round)
  registeredCardIds: [],

  // Which card IDs have been checked for winner but were not winners (locked until round ends)
  lockedCardIds: [],

  // Game state
  gameActive: false,
  activeSessionId: null,
  calledNumbers: [],
  lastCalled: null,
  gameLog: [], // { number, timestamp }
  callDeck: [],
  callDeckIndex: 0,

  // Reports
  sessions: [],

  // Balance
  balance: 0,

  // DB loaded flag
  dbLoaded: false,

  // --- Load persisted data from IndexedDB ---
  loadFromDB: async () => {
    try {
      const [cards, sessions, lang, voice, speed, bet, pct, bal] = await Promise.all([
        dbGetAllCards(),
        dbGetAllSessions(),
        dbGetSetting('language'),
        dbGetSetting('voiceEnabled'),
        dbGetSetting('callSpeed'),
        dbGetSetting('betAmount'),
        dbGetSetting('housePercent'),
        dbGetBalance()
      ])

      // Clean old reports (>45 days old)
      const cutoff = Date.now() - 45 * 24 * 60 * 60 * 1000
      const validSessions = []
      const sessionsToClear = []

      for (const s of (sessions || [])) {
        const time = new Date(s.date).getTime()
        const numPlayers = s.numPlayers || 0
        if (time < cutoff || numPlayers < 3) {
          sessionsToClear.push(s.id)
        } else {
          validSessions.push(s)
        }
      }

      if (sessionsToClear.length > 0) {
        console.log(`Auto-deleting ${sessionsToClear.length} old report entries (>45 days old)`)
        await Promise.all(sessionsToClear.map(id => dbDeleteSession(id)))
      }

      // Fetch active conversion rate from server
      let conversionRate = 10
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        const res = await fetch(`${apiBase}/conversion-rate`)
        if (res.ok) {
          const data = await res.json()
          if (data.conversionRate) {
            conversionRate = data.conversionRate
          }
        }
      } catch (err) {
        console.warn('Could not load conversion rate from server, using default 10:', err)
      }

      // Set counter past existing IDs
      if (cards.length) {
        const maxNum = cards.reduce((m, c) => {
          const match = c.id.match(/card_(\d+)_/)
          return match ? Math.max(m, parseInt(match[1])) : m
        }, 0)
        _cardIdCounter = maxNum
      }
      set({
        cards: cards || [],
        sessions: validSessions.sort((a, b) => new Date(b.date) - new Date(a.date)),
        language: lang || 'en',
        voiceEnabled: voice !== undefined ? voice : true,
        callSpeed: speed || 5,
        betAmount: bet || 10,
        housePercent: pct || 20, // default 20
        balance: bal || 0,
        conversionRate,
        dbLoaded: true
      })
    } catch (e) {
      console.error('Failed to load from IndexedDB:', e)
      set({ dbLoaded: true })
    }
  },

  setLanguage: (l) => { set({ language: l }); dbSaveSetting('language', l) },
  setVoiceEnabled: (v) => { set({ voiceEnabled: v }); dbSaveSetting('voiceEnabled', v) },
  setCallSpeed: (s) => { set({ callSpeed: s }); dbSaveSetting('callSpeed', s) },
  setBetAmount: (a) => { set({ betAmount: a }); dbSaveSetting('betAmount', a) },
  setHousePercent: (p) => { set({ housePercent: p }); dbSaveSetting('housePercent', p) },
  setHouseBetMode: (m) => set({ houseBetMode: m }),

  setBalance: (amount) => { set({ balance: amount }); dbSetBalance(amount) },

  addBalance: (amount) => {
    const newBal = get().balance + amount
    set({ balance: newBal })
    dbSetBalance(newBal)
  },

  clearStoreData: async () => {
    set({
      cards: [],
      sessions: [],
      balance: 0,
      calledNumbers: [],
      lastCalled: null,
      gameLog: [],
      lockedCardIds: [],
      gameActive: false,
      activeSessionId: null,
      callDeck: [],
      callDeckIndex: 0
    })
    await Promise.all([
      dbClearCards(),
      dbClearSessions(),
      dbSetBalance(0)
    ])
  },

  addCard: (name, columns) => {
    _cardIdCounter++
    const id = 'card_' + _cardIdCounter + '_' + Date.now()
    const flat = cardToFlat(columns)
    const card = { id, name, columns, flat }
    set(s => ({ cards: [...s.cards, card] }))
    dbSaveCard(card)
    return id
  },

  updateCard: (id, columns) => {
    const flat = cardToFlat(columns)
    set(s => ({
      cards: s.cards.map(c => c.id === id ? { ...c, columns, flat } : c)
    }))
    // Persist the updated card
    const card = get().cards.find(c => c.id === id)
    if (card) dbSaveCard(card)
  },

  removeCard: (id) => {
    set(s => ({
      cards: s.cards.filter(c => c.id !== id),
      registeredCardIds: s.registeredCardIds.filter(rid => rid !== id)
    }))
    dbDeleteCard(id)
  },

  clearAllCards: () => {
    set({ cards: [], registeredCardIds: [] })
    dbClearCards()
  },

  registerCard: (id) => set(s => ({
    registeredCardIds: s.registeredCardIds.includes(id)
      ? s.registeredCardIds
      : [...s.registeredCardIds, id]
  })),

  unregisterCard: (id) => set(s => ({
    registeredCardIds: s.registeredCardIds.filter(rid => rid !== id)
  })),

  toggleRegisterCard: (id) => set(s => ({
    registeredCardIds: s.registeredCardIds.includes(id)
      ? s.registeredCardIds.filter(rid => rid !== id)
      : [...s.registeredCardIds, id]
  })),

  clearRegistered: () => set({ registeredCardIds: [] }),

  lockCard: (id) => set(s => ({
    lockedCardIds: s.lockedCardIds.includes(id)
      ? s.lockedCardIds
      : [...s.lockedCardIds, id]
  })),

  resetLocked: () => set({ lockedCardIds: [] }),

  startGame: () => {
    const { registeredCardIds, betAmount, housePercent, houseBetMode, balance, gameActive } = get()
    if (gameActive) return false

    const numPlayers = registeredCardIds.length
    if (numPlayers < 3) return false

    const totalPot = numPlayers * betAmount
    // In 1Bet mode, income = 1 player's bet amount. Otherwise, use percentage.
    const income = houseBetMode ? betAmount : Math.round(totalPot * housePercent / 100)
    const winnerPrize = totalPot - income
    const newBalance = balance - income

    const sessionId = Date.now().toString()
    const session = {
      id: sessionId,
      date: new Date().toISOString(),
      calledNumbers: [],
      winner: null,
      callCount: 0,
      duration: 0,
      numPlayers,
      betAmount,
      housePercent: houseBetMode ? null : housePercent, // null for 1Bet mode
      houseBetMode,
      totalPot,
      winnerPrize,
      income,
      status: 'active'
    }

    set(s => ({
      gameActive: true,
      activeSessionId: sessionId,
      calledNumbers: [],
      lastCalled: null,
      gameLog: [],
      callDeck: shuffleCallDeck(),
      callDeckIndex: 0,
      lockedCardIds: [],
      balance: newBalance,
      sessions: [session, ...s.sessions]
    }))

    dbSaveSession(session)
    dbSetBalance(newBalance)
    return true
  },

  callNumber: (num) => set(s => {
    if (s.calledNumbers.includes(num)) return s
    const gameLog = [...s.gameLog, { number: num, timestamp: Date.now() }]
    return { calledNumbers: [...s.calledNumbers, num], lastCalled: num, gameLog }
  }),

  callRandom: () => {
    let { callDeck, callDeckIndex, calledNumbers } = get()
    const calledSet = new Set(calledNumbers)

    // Draw from the round's pre-shuffled deck (fresh shuffle each startGame)
    while (callDeck.length && callDeckIndex < callDeck.length) {
      const num = callDeck[callDeckIndex]
      callDeckIndex += 1
      if (!calledSet.has(num)) {
        set({ callDeckIndex })
        get().callNumber(num)
        return num
      }
    }
    if (callDeckIndex !== get().callDeckIndex) {
      set({ callDeckIndex })
    }

    // Fallback: uniform random from remaining numbers
    const remaining = []
    for (let i = 1; i <= 75; i++) if (!calledSet.has(i)) remaining.push(i)
    if (!remaining.length) return null
    const rand = crypto.getRandomValues(new Uint32Array(1))[0]
    const num = remaining[rand % remaining.length]
    get().callNumber(num)
    return num
  },

  endGame: (winner) => {
    const { activeSessionId, calledNumbers, gameLog, sessions } = get()

    const updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        const updated = {
          ...s,
          calledNumbers: [...calledNumbers],
          winner: winner || null,
          callCount: calledNumbers.length,
          duration: gameLog.length > 1
            ? Math.round((gameLog[gameLog.length-1].timestamp - gameLog[0].timestamp) / 1000)
            : 0,
          status: 'finished'
        }
        dbSaveSession(updated)
        return updated
      }
      return s
    })

    set({
      gameActive: false,
      activeSessionId: null,
      lockedCardIds: [],
      callDeck: [],
      callDeckIndex: 0,
      sessions: updatedSessions
    })
  },

  clearSessions: () => {
    set({ sessions: [] })
    dbClearSessions()
  },
}))
