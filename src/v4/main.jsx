import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import '../styles.css'
import './scrolly.css'

// The page decides where to scroll (to the vote's first card, or a deep-linked
// step); the browser must not restore the previous visit's position over it.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
