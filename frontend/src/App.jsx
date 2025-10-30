import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Dashboard from './pages/Dashboard.jsx'
import Upload from './pages/Upload.jsx'
import Records from './pages/Records.jsx'
import RecordDetail from './pages/RecordDetail.jsx'
import Exports from './pages/Exports.jsx'
import Settings from './pages/Settings.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Review from './pages/Review.jsx'
import Shell from './components/Shell.jsx'

export default function App() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('auth_token')
    setAuthed(!!t)
  }, [])

  function handleLogin() {
    setAuthed(true)
  }

  return (
    <Shell>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/records" element={<Records />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/review/:id" element={<Review />} />
          <Route path="/exports" element={<Exports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<div className="p-8">Not Found</div>} />
        </Routes>
      </AnimatePresence>
    </Shell>
  )
}
