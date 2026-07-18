const DB_NAME = 'rojas-produccion'
const DB_VERSION = 1
const STORE_NAME = 'app-state'
const STATE_KEY = 'production-board'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readIndexedState() {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
}

async function writeIndexedState(state) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY)
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
  })
}

function readLegacyState() {
  const parse = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback)) }
    catch { return fallback }
  }
  return {
    jobs: parse('rojas-jobs', []),
    completed: parse('rojas-completed', []),
    lastImport: parse('rojas-import', null),
  }
}

export async function loadAppState() {
  try {
    const stored = await readIndexedState()
    if (stored) return stored

    const legacy = readLegacyState()
    await writeIndexedState(legacy)
    localStorage.removeItem('rojas-jobs')
    localStorage.removeItem('rojas-completed')
    localStorage.removeItem('rojas-import')
    return legacy
  } catch {
    return readLegacyState()
  }
}

export async function saveAppState(state) {
  try {
    await writeIndexedState(state)
  } catch {
    localStorage.setItem('rojas-jobs', JSON.stringify(state.jobs))
    localStorage.setItem('rojas-completed', JSON.stringify(state.completed))
    if (state.lastImport) localStorage.setItem('rojas-import', JSON.stringify(state.lastImport))
  }
}
