import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './App.css'
import { BrowserRouter } from 'react-router'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
