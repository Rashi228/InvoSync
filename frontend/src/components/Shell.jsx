import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import HowItWorks from './HowItWorks.jsx'

const nav = [
  { to: '/records', label: 'Records' },
  { to: '/exports', label: 'Exports' },
  { to: '/settings', label: 'Settings' },
  { to: '/signup', label: 'Sign up' }
]

export default function Shell({ children }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-950/70 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            {/* Improved logo with invoice icon design */}
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-emerald-500 shadow-lg shadow-indigo-500/30 flex items-center justify-center overflow-hidden group-hover:shadow-indigo-500/50 transition-all">
              {/* Invoice document icon */}
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {/* Sync arrow overlay */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white"></div>
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">InvoSync</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            {nav.map(n => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `relative text-sm transition-colors ${isActive ? 'text-brand-400' : 'text-slate-300 hover:text-white'}`}>
                {n.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 bg-gradient-to-r from-accent-500 to-brand-400 transition-transform group-[.active]:scale-x-100" />
              </NavLink>
            ))}
          </nav>
          <button className="md:hidden p-2 rounded-lg bg-white/5 ring-1 ring-white/10" onClick={() => setOpen(v => !v)}>
            <span className="i">☰</span>
          </button>
        </div>
        {open && (
          <div className="md:hidden px-4 pb-3 grid gap-2">
            {nav.map(n => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `py-2 ${isActive ? 'text-brand-400' : 'text-slate-200'}`}>{n.label}</NavLink>
            ))}
          </div>
        )}
      </header>
      <main className="flex-1">{children}</main>

      {/* How it works section shown on all pages */}
      <HowItWorks />

      <footer className="border-t border-white/10 text-sm text-slate-300 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-emerald-500 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white"></div>
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">InvoSync</span>
            </div>
            <p className="mt-3 text-slate-400">AI-powered invoice and PO verification with instant reconciliation and export.</p>
          </div>
          <div>
            <div className="font-medium text-white mb-2">Product</div>
            <ul className="grid gap-1">
              <li><Link className="hover:text-white" to="/records">Records</Link></li>
              <li><Link className="hover:text-white" to="/exports">Exports</Link></li>
              <li><Link className="hover:text-white" to="/settings">Settings</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-white mb-2">Resources</div>
            <ul className="grid gap-1">
              <li><a className="hover:text-white" href="#">Docs</a></li>
              <li><a className="hover:text-white" href="#">API</a></li>
              <li><a className="hover:text-white" href="#">Status</a></li>
            </ul>
          </div>
          <div>
            <div className="font-medium text-white mb-2">Stay updated</div>
            <div className="flex gap-2">
              <input placeholder="Work email" className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 placeholder:text-slate-500" />
              <button className="px-4 py-2 rounded bg-gradient-to-r from-accent-500 to-brand-500 text-white">Subscribe</button>
            </div>
            <div className="mt-4 flex gap-2">
              <a className="p-2 rounded bg-white/5 border border-white/10" href="#" aria-label="Twitter">𝕏</a>
              <a className="p-2 rounded bg-white/5 border border-white/10" href="#" aria-label="LinkedIn">in</a>
              <a className="p-2 rounded bg-white/5 border border-white/10" href="#" aria-label="GitHub">GH</a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400">
            <p>2025 All rights reserved</p>
            <p>Made for finance teams who want speed and accuracy</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
