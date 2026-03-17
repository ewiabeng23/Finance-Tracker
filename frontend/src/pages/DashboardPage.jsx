import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { reportsAPI, transactionsAPI } from '../api/endpoints'
import { formatAmount, formatDate, getCatBadge, getCatLabel } from '../api/utils'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'
import TransactionModal from '../components/TransactionModal'
import { useToast } from '../hooks/useToast'

export default function DashboardPage() {
  const { isManager, user } = useAuth()
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const { show, ToastEl } = useToast()
  const [summary,   setSummary]   = useState(null)
  const [recent,    setRecent]    = useState([])
  const [dailyCash, setDailyCash] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [chartData, setChartData] = useState([])
  const [loading,   setLoading]   = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [sumRes, txRes, cashRes] = await Promise.all([
        reportsAPI.summary(),
        transactionsAPI.list({ limit: 8 }),
        reportsAPI.dailyCash(),
      ])
      setSummary(sumRes.data)
      setRecent(txRes.data)
      setDailyCash(cashRes.data?.[0] || null)
      buildChart()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const buildChart = async () => {
    const now = new Date()
    const months = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { month:'short' })
      months[key] = { month: label, [t('chart_income')]: 0, [t('chart_expenses')]: 0 }
    }
    try {
      const { data } = await transactionsAPI.list({ limit: 500 })
      data.forEach(tx => {
        const key = (tx.date || '').slice(0, 7)
        if (!months[key]) return
        if (tx.type === 'income')  months[key][t('chart_income')]   += tx.amount
        if (tx.type === 'expense') months[key][t('chart_expenses')] += tx.amount
      })
      setChartData(Object.values(months))
    } catch (e) { console.error(e) }
  }

  useEffect(() => { load() }, [lang])

  if (loading) return (
    <div className="page-content" style={{ paddingTop:80, textAlign:'center', color:'var(--muted)' }}>
      <p style={{ fontFamily:'var(--font-serif)', fontSize:20, fontStyle:'italic' }}>{t('dash_loading')}</p>
    </div>
  )

  return (
    <div className="page-content">
      {ToastEl}

      <div className="page-header">
        <div className="page-eyebrow"><span className="eyebrow-line" />{t('dash_eyebrow')}</div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <h1>{t('dash_greeting')} <em>{user?.full_name?.split(' ')[0]}</em></h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + {t('dash_new_tx')}
          </button>
        </div>
      </div>

      {/* Daily cash banner */}
      {isManager && dailyCash && (
        <div style={{
          background:'var(--navy-light)', border:'1px solid var(--navy-border)',
          borderLeft:'3px solid var(--gold)', padding:'14px 22px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          marginBottom:32, flexWrap:'wrap', gap:12,
        }}>
          <div>
            <span style={{ fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)' }}>
              {t('dash_cash_label')} — {new Date(dailyCash.date + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { weekday:'long', day:'numeric', month:'l
