import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { Capacitor } from '@capacitor/core'
import { initTheme } from './lib/theme'

initTheme()

// Native app: no zoom, like a real app. Otherwise iOS zooms in on any field under 16px
// (date, note) and the zoomed page then slides sideways. The website keeps pinch-zoom
// (accessibility).
if (Capacitor.isNativePlatform()) {
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
