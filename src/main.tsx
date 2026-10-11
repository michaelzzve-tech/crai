import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
import { CapturaErrores } from './components/ErrorPantalla'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CapturaErrores>
      <App />
    </CapturaErrores>
  </StrictMode>,
)
