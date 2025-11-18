import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
})

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
} catch (error) {
  console.error('Failed to render app:', error)
  document.getElementById('root').innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Error loading app</h1>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.message}\n${error.stack}</pre>
    </div>
  `
}
