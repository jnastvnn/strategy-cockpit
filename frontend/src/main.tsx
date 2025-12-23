import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react/ui'
import { authClient } from './lib/auth'
import { BrowserRouter } from 'react-router-dom'
import '@neondatabase/auth-ui/css'
import './index.css'
import './App.css'
import App from './App.tsx'

inject()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NeonAuthUIProvider authClient={authClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </NeonAuthUIProvider>
  </StrictMode>,
)
