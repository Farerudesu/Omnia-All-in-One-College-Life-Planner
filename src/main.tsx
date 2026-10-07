import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const cachedTheme = localStorage.getItem('omnia_theme')
if (cachedTheme === 'dark' || cachedTheme === 'light') {
  document.documentElement.setAttribute('data-theme', cachedTheme)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
