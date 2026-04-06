import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { reportsAPI, transactionsAPI } from '../api/endpoints'
import { formatAmount, formatDate, getCatBadge, getCatLabel, todayISO } from '../api/utils'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'
import TransactionModal from '../components/TransactionModal'
import { useToast } from '../hooks/useToast'

function getPeriodDates(period) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  switch (period) {
    case 'today':
      return { from: todayISO(), to: todayISO() }
    case 'week': {
      const day = now.getDay() || 7
      const mon = new Date(now); mon.setDate(d - day + 1)
      const sun = new Date(now); sun.setDate(d - day + 7)
      return { from: mon.toISOString().split('T')[0], to: sun.toISOString().split('T')[0] }
    }
    case 'month':
      return { from: `${y}-${String(m+1).padStart(2,'0')}-01`, to: todayISO() }
    case 'quarter': {
      const q = Math.floor(m / 3)
      const qStart = new Date(y, q * 3, 1)
      return { from: qStart.toISOString().split('T')[0], to: todayISO() }
    }
    case 'year':
      return { from: `${y}-01-01`, to: todayISO() }
    default:
      return { from: '', to: '' }
  }
}

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
  const [period,    setPeriod]    = useState('month')
  const [dateFrom,  setDateFrom]  = useState(getPeriodDates('month').from)
  const [dateTo,    setDateTo]    = useState(getPeriodDates('month').to)

  const handlePeriod = (p) => {
    setPeriod(p)
    const { from, to } = getPeriodDates(p)
    setDateFrom(from)
    setDateTo(to)
  }

  const handleCustomDate = (field, val) => {
    setPeriod('custom')
    if (field === 'from') setDateFrom(val)
    else setDateTo(val)
  }

  const load = async () => {
    setLoading(true)
    const params = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo)   params.date_to   = dateTo
    try {
      const [sumRes, txRes, cashRes] = await Promise.all([
        reportsAPI.summary(params),
        transactionsAPI.list({ limit: 8, ...params }),
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
      const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')
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

  useEffect(() => { load() }, [dateFrom, dateTo, lang])

  const periods = [
    { key: 'today',   labelFr: "Aujourd'hui", labelEn: 'Today' },
    { key: 'week',    labelFr: 'Cette semaine', labelEn: 'This week' },
    { key: 'month',   labelFr: 'Ce mois',       labelEn: 'This month' },
    { key: 'quarter', labelFr: 'Ce trimestre',  labelEn: 'This quarter' },
    { key: 'year',    labelFr: 'Cette année',   labelEn: 'This year' },
  ]

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

      {/* Period filter */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {periods.map(p => (
          <button
            key={p.key}
            onClick={() => handlePeriod(p.key)}
            style={{
              padding:'6px 14px', fontSize:11, letterSpacing:'1px',
              textTransform:'uppercase', cursor:'pointer',
              background: period === p.key ? 'var(--gold)' : 'var(--navy-light)',
              color: period === p.key ? 'var(--navy)' : 'var(--muted)',
              border: period === p.key ? '1px solid var(--gold)' : '1px solid var(--navy-border)',
              fontWeight: period === p.key ? 600 : 400,
              transition:'all 0.2s',
            }}
          >
            {lang === 'fr' ? p.labelFr : p.labelEn}
          </button>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:8 }}>
          <input
            type="date"
            value={dateFrom}
            onChange={e => handleCustomDate('from', e.target.value)}
            style={{ width:140, fontSize:11, padding:'6px 10px', background:'var(--navy-light)', border:'1px solid var(--navy-border)', color:'var(--white-dim)' }}
          />
          <span style={{ color:'var(--muted)', fontSize:12 }}>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => handleCustomDate('to', e.target.value)}
            style={{ width:140, fontSize:11, padding:'6px 10px', background:'var(--navy-light)', border:'1px solid var(--navy-border)', color:'var(--white-dim)' }}
          />
        </div>
      </div>

      {/* Period label */}
      {dateFrom && dateTo && (
        <div style={{ fontSize:11, color:'var(--gold)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:24 }}>
          {lang === 'fr' ? 'Periode : ' : 'Period: '}{dateFrom} → {dateTo}
        </div>
      )}

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
              {t('dash_cash_label')} — {new Date(dailyCash.date + 'T12:00:00').toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { weekday:'long', day:'numeric', month:'long' })}
            </span>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:22, marginTop:2 }}>
              {t('dash_cash_open')} <em>{formatAmount(dailyCash.opening_balance, 'XAF')}</em>
              {dailyCash.closing_balance != null && (
                <span style={{ marginLeft:24 }}>{t('dash_cash_close')} <span style={{ color:'var(--green)' }}>{formatAmount(dailyCash.closing_balance, 'XAF')}</span></span>
              )}
            </div>
          </div>
          {dailyCash.closing_balance == null && (
            <span style={{ fontSize:11, color:'var(--muted)', letterSpacing:'1px' }}>{t('dash_cash_ongoing')}</span>
          )}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-label">{t('dash_card_in')}</div>
            <div className="summary-value positive">{formatAmount(summary.total_income, 'XAF')}</div>
            <div className="summary-sub">{summary.income_count} transactions</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">{t('dash_card_out')}</div>
            <div className="summary-value negative">{formatAmount(summary.total_expenses, 'XAF')}</div>
            <div className="summary-sub">{summary.expense_count} transactions</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">{t('dash_card_bal')}</div>
            <div className={'summary-value ' + (summary.net_balance >= 0 ? 'gold' : 'negative')}>
              {formatAmount(Math.abs(summary.net_balance), 'XAF')}
            </div>
            <div className="summary-sub">{summary.net_balance >= 0 ? t('dash_surplus') : t('dash_deficit')}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">{t('dash_card_staff')}</div>
            <div className="summary-value negative">{formatAmount(summary.staff_spending, 'XAF')}</div>
            <div className="summary-sub">{summary.transaction_count} {lang === 'fr' ? 'operations au total' : 'total operations'}</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ marginBottom:40 }}>
        <div className="section-label">{t('dash_chart_label')}</div>
        <div className="card" style={{ padding:'20px 20px 10px', height:230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top:5, right:20, left:10, bottom:5 }}>
              <XAxis dataKey="month" tick={{ fill:'rgba(245,240,232,0.45)', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'rgba(245,240,232,0.45)', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
              <Tooltip
                contentStyle={{ background:'var(--navy-mid)', border:'1px solid var(--navy-border)', fontSize:12 }}
                labelStyle={{ color:'var(--gold)' }}
                formatter={v => formatAmount(v, 'XAF')}
              />
              <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }} />
              <Bar dataKey={t('chart_income')}   fill="rgba(76,175,130,0.6)"  radius={[2,2,0,0]} />
              <Bar dataKey={t('chart_expenses')} fill="rgba(224,90,78,0.5)"   radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="section-label">{t('dash_recent')}</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('dash_col_date')}</th>
              <th>{t('dash_col_ref')}</th>
              <th>{t('dash_col_desc')}</th>
              <th>{t('dash_col_by')}</th>
              <th>{t('dash_col_cat')}</th>
              <th className="right">{t('dash_col_amount')}</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <p>{t('dash_empty')}</p>
                  <span>{t('dash_empty_sub')}</span>
                </div>
              </td></tr>
            ) : recent.map(tx => (
              <tr key={tx.id}>
                <td className="td-muted">{formatDate(tx.date)}</td>
                <td className="td-serif">{tx.reference}</td>
                <td>{tx.description || '—'}</td>
                <td className="td-muted">{tx.created_by_user?.full_name || '—'}</td>
                <td><span className={'badge ' + getCatBadge(tx.category, tx.type)}>{getCatLabel(tx.category, tx.type, lang)}</span></td>
                <td className="right">
                  <span className={'td-amount ' + tx.type}>
                    {tx.type === 'expense' ? '−' : '+'}{formatAmount(tx.amount, tx.currency)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <TransactionModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); show(t('tx_saved')) }}
        />
      )}
    </div>
  )
}
