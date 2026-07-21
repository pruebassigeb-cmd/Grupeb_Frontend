import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Fuente Inter empaquetada localmente (antes se cargaba con @import a Google
// Fonts desde expo.tsx en tiempo de ejecución — fallaba sin conexión y
// generaba ruido en consola). Al venir del bundle, Workbox la precachea
// igual que el resto del JS/CSS y funciona offline desde la primera visita.
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
