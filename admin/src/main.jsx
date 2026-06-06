import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import '@fontsource/inter/400.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/900.css'
import './index.css'

// ========== PREVENT CODE INSPECTION & DEVTOOLS ==========
// Disable right-click context menu
document.addEventListener('contextmenu', (e) => e.preventDefault())

// Disable common DevTools keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && e.key === 'I') ||
    (e.ctrlKey && e.shiftKey && e.key === 'J') ||
    (e.ctrlKey && e.shiftKey && e.key === 'C')
  ) {
    e.preventDefault()
    e.stopPropagation()
  }
})

// Detect and close DevTools
const devtoolsThreshold = 160
let lastCheckTime = 0

const checkDevTools = () => {
  const now = Date.now()
  if (now - lastCheckTime < 500) return // Rate limit
  lastCheckTime = now

  const widthThreshold = window.outerWidth - window.innerWidth > devtoolsThreshold
  const heightThreshold = window.outerHeight - window.innerHeight > devtoolsThreshold

  if (widthThreshold || heightThreshold) {
    // DevTools detected, try to close
    window.close()
  }
}

// Monitor for DevTools opening
window.addEventListener('resize', checkDevTools)

// Disable console access
const noop = () => {}
Object.defineProperty(window, 'console', {
  value: {
    log: noop,
    warn: noop,
    error: noop,
    info: noop,
    debug: noop,
    clear: noop,
    time: noop,
    timeEnd: noop,
    trace: noop,
    table: noop,
    group: noop,
    groupEnd: noop
  },
  writable: false,
  configurable: false
})

// Disable debugger statement
window.eval = function() { throw new Error('eval is disabled') }

// ========== END DEVTOOLS PREVENTION ==========

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
