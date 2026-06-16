import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import AppRoutes from './routes/approutes'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <AppRoutes />
  </ThemeProvider>
)
