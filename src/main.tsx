import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initCapacitor } from './mobile/capacitor/init'

// Capacitor platformu başlat (StatusBar, Splash, App listeners)
initCapacitor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
