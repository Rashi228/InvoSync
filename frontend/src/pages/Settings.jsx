import React, { useState } from 'react'
import Page from '../components/Page.jsx'

export default function Settings() {
  const [amountPct, setAmountPct] = useState('0.5')
  const [amountAbs, setAmountAbs] = useState('25')
  const [dateDays, setDateDays] = useState('7')
  const [currency, setCurrency] = useState('INR')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')

  return (
    <Page>
      <section className="max-w-6xl mx-auto px-4 py-8 grid gap-6">
        <h1 className="text-2xl font-semibold">Settings</h1>

        {/* Reconciliation tolerances */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/35 to-emerald-400/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="font-medium mb-4">Reconciliation tolerances</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <input className="bg-white/5 border border-white/10 rounded px-3 py-2" placeholder="Amount %" value={amountPct} onChange={e=>setAmountPct(e.target.value)} />
              <input className="bg-white/5 border border-white/10 rounded px-3 py-2" placeholder="Amount Abs" value={amountAbs} onChange={e=>setAmountAbs(e.target.value)} />
              <input className="bg-white/5 border border-white/10 rounded px-3 py-2" placeholder="Date days" value={dateDays} onChange={e=>setDateDays(e.target.value)} />
            </div>
            <button className="mt-4 px-4 py-2 rounded text-white bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400">Save tolerances</button>
          </div>
        </div>

        {/* Preferences */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-sky-400/35 to-indigo-500/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="font-medium mb-4">Preferences</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <select className="bg-white/5 border border-white/10 rounded px-3 py-2" value={currency} onChange={e=>setCurrency(e.target.value)}>
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
              <select className="bg-white/5 border border-white/10 rounded px-3 py-2" value={dateFormat} onChange={e=>setDateFormat(e.target.value)}>
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
              <input className="bg-white/5 border border-white/10 rounded px-3 py-2" placeholder="Company name (optional)" />
            </div>
            <button className="mt-4 px-4 py-2 rounded border border-white/10 hover:bg-white/10">Save preferences</button>
          </div>
        </div>

        {/* Email Integration */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-emerald-400/35 to-sky-400/35">
          <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
            <h2 className="font-medium mb-2">Email integration</h2>
            <p className="text-slate-300 mb-4 text-sm">Connect Gmail to ingest attachments automatically and trigger verification.</p>
            <div className="flex flex-wrap gap-2">
              <button className="px-4 py-2 rounded text-white bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400">Connect Gmail</button>
              <button className="px-4 py-2 rounded border border-white/10 hover:bg-white/10">Test fetch</button>
            </div>
          </div>
        </div>
      </section>
    </Page>
  )
}
