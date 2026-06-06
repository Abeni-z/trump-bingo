// IndexedDB persistence layer for Bingo platform
// Stores: cards, sessions (reports), settings, balance

const DB_NAME = 'BingoDB'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('cards')) {
        db.createObjectStore('cards', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains('balance')) {
        db.createObjectStore('balance', { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Generic helpers
async function putItem(storeName, item) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(item)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getItem(storeName, key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getAllItems(storeName) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function deleteItem(storeName, key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function clearStore(storeName) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ===== Cards =====
export async function dbSaveCard(card) {
  return putItem('cards', card)
}

export async function dbGetAllCards() {
  return getAllItems('cards')
}

export async function dbDeleteCard(id) {
  return deleteItem('cards', id)
}

export async function dbClearCards() {
  return clearStore('cards')
}

// ===== Sessions / Reports =====
export async function dbSaveSession(session) {
  return putItem('sessions', session)
}

export async function dbGetAllSessions() {
  return getAllItems('sessions')
}

export async function dbClearSessions() {
  return clearStore('sessions')
}

export async function dbDeleteSession(id) {
  return deleteItem('sessions', id)
}

// ===== Settings =====
export async function dbSaveSetting(key, value) {
  return putItem('settings', { key, value })
}

export async function dbGetSetting(key) {
  const item = await getItem('settings', key)
  return item ? item.value : undefined
}

// ===== Balance =====
export async function dbGetBalance() {
  const item = await getItem('balance', 'shopBalance')
  return item ? item.value : 0
}

export async function dbSetBalance(amount) {
  return putItem('balance', { key: 'shopBalance', value: amount })
}

export async function dbGetLastServerBalance() {
  const item = await getItem('balance', 'lastServerBalance')
  return item ? item.value : 0
}

export async function dbSetLastServerBalance(amount) {
  return putItem('balance', { key: 'lastServerBalance', value: amount })
}
