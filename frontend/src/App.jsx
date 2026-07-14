import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import History from './pages/History'
import Alerts from './pages/Alerts'
import Layout from './components/Layout'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={setToken} />} />
        <Route path="/" element={<Layout token={token} logout={logout} />}>
          <Route index element={token ? <Dashboard token={token} /> : <Navigate to="/login" />} />
          <Route path="history" element={token ? <History token={token} /> : <Navigate to="/login" />} />
          <Route path="alerts" element={token ? <Alerts token={token} /> : <Navigate to="/login" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
