import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/pages.css'
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
