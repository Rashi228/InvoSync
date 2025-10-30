import React, { useEffect, useRef, useState } from 'react'
import Page from '../components/Page.jsx'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { DataApi } from '../lib/api'

export default function Dashboard() {
  const navigate = useNavigate()

  const poInputRef = useRef(null)
  const invInputRef = useRef(null)
  const [poFile, setPoFile] = useState(null)
  const [invFile, setInvFile] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  const [stats, setStats] = useState({ matched: 0, discrepancies: 0, pending: 0, lastExport: null })
  const [recent, setRecent] = useState([])

  async function loadData() {
    try {
      const s = await DataApi.stats()
      setStats(s)
      const r = await DataApi.records({ limit: 6 })
      setRecent(r.items || [])
    } catch (e) {
      // ignore for now; page still renders
    }
  }

  useEffect(() => { loadData() }, [])

  function onDrop(type, e) {
    e.preventDefault()
    const list = Array.from(e.dataTransfer.files || [])
    if (!list.length) return
    const file = list[0]
    if (type === 'po') setPoFile(file)
    if (type === 'inv') setInvFile(file)
  }

  function onBrowse(type, e) {
    const list = Array.from(e.target.files || [])
    if (!list.length) return
    const file = list[0]
    if (type === 'po') setPoFile(file)
    if (type === 'inv') setInvFile(file)
  }

  async function handleVerify() {
    if (!poFile || !invFile) return
    setErrorMsg('')
    setVerifying(true)
    setProgress(10)
    try {
      await new Promise(r=>setTimeout(r,150))
      setProgress(40)
      const res = await DataApi.verify({ invoiceFile: invFile, poFile: poFile })
      setProgress(85)
      await loadData()
      setProgress(100)
      setPoFile(null); setInvFile(null)
      if (res && res.id) {
        navigate(`/review/${res.id}`)
      } else {
        navigate('/records')
      }
    } catch (e) {
      setErrorMsg(e?.message || 'Verification failed')
      setProgress(0)
    } finally {
      setVerifying(false)
    }
  }

  const kpis = [
    { label: 'Matched', value: stats.matched },
    { label: 'Discrepancies', value: stats.discrepancies },
    { label: 'Pending', value: stats.pending },
    { label: 'Last export', value: stats.lastExport ? new Date(stats.lastExport).toLocaleTimeString() : '—' }
  ]

  const badge = (s) => ({
    matched: 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30',
    mismatch: 'bg-orange-400/15 text-orange-300 ring-1 ring-orange-400/30',
    partial: 'bg-yellow-400/15 text-yellow-300 ring-1 ring-yellow-400/30'
  }[s] || 'bg-white/10 text-slate-300')

  const canVerify = !!poFile && !!invFile && !verifying

  return (
    <Page>
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 pt-8">
          {/* Hero - lighter professional gradient */}
          <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10 p-[1px] bg-gradient-to-r from-indigo-500/35 via-sky-400/35 to-emerald-400/35">
            <div className="rounded-[14px] bg-[#0f1530]/80 p-8">
              <div className="absolute inset-0 pointer-events-none" />
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">Verification dashboard</h1>
                  <p className="text-slate-300 mt-2">Upload PO and Invoice, verify quickly, and export clean data.</p>
                  <div className="mt-4 flex gap-3">
                    <Link to="/records" className="px-5 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition">View records</Link>
                  </div>
                </div>
                {/* KPI Row - uniform light panels with gentle gradient tint */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                  {kpis.map((k, i) => (
                    <motion.div
                      key={k.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: .35, delay: i * 0.05 }}
                      whileHover={{ y: -3 }}
                      className="relative rounded-xl p-4 text-center text-white bg-white/10 backdrop-blur ring-1 ring-white/15 shadow-soft"
                    >
                      <div className="text-2xl font-semibold text-white">{k.value}</div>
                      <div className="text-slate-200 text-xs tracking-wide uppercase mt-1">{k.label}</div>
                      <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dual Upload + Recent Activity with animated gradient borders */}
          <div className="mt-8 grid lg:grid-cols-3 gap-6">
            {/* Dual Upload */}
            <div className="relative lg:col-span-2 rounded-2xl p-[1px] bg-gradient-to-r from-sky-400/35 to-emerald-400/35">
              <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
                <h2 className="font-semibold mb-4">Upload PO and Invoice</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* PO Dropzone */}
                  <div
                    onDragOver={(e)=>e.preventDefault()}
                    onDrop={(e)=>onDrop('po', e)}
                    className="rounded-xl border-2 border-dashed border-white/15 p-6 text-center bg-white/5"
                  >
                    <div className="text-sm text-slate-200 mb-3">Purchase Order (PDF/Image)</div>
                    <button onClick={()=>poInputRef.current?.click()} className="px-4 py-2 rounded border border-white/10 hover:bg-white/10 transition">Select PO</button>
                    <input ref={poInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e)=>onBrowse('po', e)} />
                    {poFile && <div className="mt-3 text-xs text-slate-300 truncate">{poFile.name}</div>}
                  </div>
                  {/* Invoice Dropzone */}
                  <div
                    onDragOver={(e)=>e.preventDefault()}
                    onDrop={(e)=>onDrop('inv', e)}
                    className="rounded-xl border-2 border-dashed border-white/15 p-6 text-center bg-white/5"
                  >
                    <div className="text-sm text-slate-200 mb-3">Invoice (PDF/Image)</div>
                    <button onClick={()=>invInputRef.current?.click()} className="px-4 py-2 rounded border border-white/10 hover:bg-white/10 transition">Select Invoice</button>
                    <input ref={invInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e)=>onBrowse('inv', e)} />
                    {invFile && <div className="mt-3 text-xs text-slate-300 truncate">{invFile.name}</div>}
                  </div>
                </div>

                {/* Verify bar */}
                <div className="mt-5">
                  <div className="h-2 bg-slate-800 rounded">
                    <motion.div className="h-2 rounded bg-gradient-to-r from-indigo-500 to-emerald-400" initial={{ width: 0 }} animate={{ width: verifying ? `${progress}%` : '0%' }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <button disabled={!(poFile && invFile) || verifying} onClick={handleVerify} className={`px-5 py-2 rounded text-white transition ${ (poFile && invFile) && !verifying ? 'bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400' : 'bg-white/10 text-slate-400 cursor-not-allowed' }`}>{verifying ? 'Verifying…' : 'Verify'}</button>
                    <button onClick={()=>{ setPoFile(null); setInvFile(null); setVerifying(false); setProgress(0); setErrorMsg('') }} className="px-5 py-2 rounded border border-white/10 hover:bg-white/10 transition">Clear</button>
                    {errorMsg && <span className="text-sm text-red-400">{errorMsg}</span>}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">Verify becomes active after selecting both files separately.</div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/35 to-sky-400/35">
              <div className="rounded-[14px] ring-1 ring-white/10 bg-[#0f1530]/80 p-6">
                <h2 className="font-semibold mb-3">Recent activity</h2>
                <ul className="grid gap-3">
                  {recent.map((r, i) => (
                    <motion.li key={r.id} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between rounded-lg px-3 py-2 bg-white/7">
                      <div>
                        <div className="text-sm font-medium">{r.id} • {r.amount != null ? `₹${Number(r.amount).toFixed(2)}` : '—'}</div>
                        <div className="text-xs text-slate-400">{r.vendor || '—'}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${badge(r.status)}`}>{r.status}</span>
                    </motion.li>
                  ))}
                </ul>
                <Link to="/records" className="block mt-3 text-sm text-indigo-300 hover:text-indigo-200">See all records →</Link>
              </div>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Export CSV', desc: 'Download validated data', to: '/exports' },
              { title: 'Email automation', desc: 'Connect Gmail for auto-processing', to: '/settings' },
              { title: 'Bulk upload', desc: 'Upload multiple invoices and POs', to: '/upload' },
              { title: 'Review mismatches', desc: 'Filter and resolve discrepancies', to: '/records' }
            ].map((s) => (
              <button key={s.title} onClick={()=>navigate(s.to)} className="relative rounded-2xl p-[1px] bg-gradient-to-r from-white/20 to-white/5 hover:from-white/30 hover:to-white/10 transition text-left">
                <div className="rounded-[14px] p-4 ring-1 ring-white/10 bg-[#0f1530]/80">
                  <div className="text-lg font-medium">{s.title}</div>
                  <div className="text-sm text-slate-300">{s.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </Page>
  )
}
