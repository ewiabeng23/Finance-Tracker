import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { reportsAPI, transactionsAPI } from '../api/endpoints'
import { formatAmount, formatDate, getCatBadge, getCatLabel } from '../api/utils'
import { useAuth } from '../context/AuthContext'
import TransactionModal from '../components/TransactionModal'
import { useToast } from '../hooks/useToast'

export default function DashboardPage() {
  const { isManager, user } = useAuth()
  const { show, ToastEl } = useToast()
  const [summary,      setSummary]      = useState(null)
  const [recent,       setRecent]       = useState([])
  const [dailyCash,    setDailyCash]    = useState(null)
  const [showModal,    setShowModal]    = useState(false)
  const [chartData,    setChartData]    = useState([])
  const [loading,      setLoading]      = useState(true)

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
      buildChart(txRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const buildChart = (txs) => {
    const months = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      const label = d.toLocaleDateString('fr-FR', { month: 'short' })
      months[key] = { month: label, Entrées: 0, Sorties: 0 }
    }
    txs.forEach(t => {
      const key = (t.date || '').slice(0, 7)
      if (!months[key]) return
      if (t.type === 'income')  months[key]['Entrées']  += t.amount
      if (t.type === 'expense') months[key]['Sorties'] += t.amount
    })
    // Reload all transactions for chart (recent only fetches 8)
    transactionsAPI.list({ limit: 500 }).then(r => {
      r.data.forEach(t => {
        const key = (t.date || '').slice(0, 7)
        if (!months[key]) return
        if (t.type === 'income')  months[key]['Entrées']  = 0
        if (t.type === 'expense') months[key]['Sorties'] = 0
      })
      r.data.forEach(t => {
        const key = (t.date || '').slice(0, 7)
        if (!months[key]) return
        if (t.type === 'income')  months[key]['Entrées']  += t.amount
        if (t.type === 'expense') months[key]['Sorties'] += t.amount
      })
      setChartData(Object.values(months))
    })
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="page-content" style={{ paddingTop: 80, textAlign: 'center', color: 'var(--muted)' }}>
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontStyle: 'italic' }}>Chargement...</p>
    </div>
  )

  return (
    <div className="page-content">
      {ToastEl}

      {/* Header */}
      <div className="page-header">
        <div className="page-eyebrow"><span className="eyebrow-line" />Gestion Financière — Diko's Assurances SARL</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <h1>Bonjour, <em>{user?.full_name?.split(' ')[0]}</em></h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Nouvelle transaction
          </button>
        </div>
      </div>

      {/* Daily cash banner — manager only */}
      {isManager && dailyCash && (
        <div style={{
          background: 'var(--navy-light)', border: '1px solid var(--navy-border)',
          borderLeft: '3px solid var(--gold)', padding: '14px 22px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 32, flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <span style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}>
              Caisse du jour — {new Date(dailyCash.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginTop: 2 }}>
              Ouverture : <em>{formatAmount(dailyCash.opening_balance, 'XAF')}</em>
              {dailyCash.closing_balance != null && (
                <span style={{ marginLeft: 24 }}>Clôture : <span style={{ color: 'var(--green)' }}>{formatAmount(dailyCash.closing_balance, 'XAF')}</span></span>
              )}
            </div>
          </div>
          {dailyCash.closing_balance == null && (
            <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '1px' }}>Journée en cours</span>
          )}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-label">Entrées totales</div>
            <div className="summary-value positive">{formatAmount(summary.total_income, 'XAF')}</div>
            <div className="summary-sub">{summary.income_count} transactions</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Sorties totales</div>
            <div className="summary-value negative">{formatAmount(summary.total_expenses, 'XAF')}</div>
            <div className="summary-sub">{summary.expense_count} transactions</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Solde net</div>
            <div className={`summary-value ${summary.net_balance >= 0 ? 'gold' : 'negative'}`}>
              {formatAmount(Math.abs(summary.net_balance), 'XAF')}
            </div>
            <div className="summary-sub">{summary.net_balance >= 0 ? 'Excédent' : 'Déficit'}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Dépenses personnel</div>
            <div className="summary-value negative">{formatAmount(summary.staff_spending, 'XAF')}</div>
            <div className="summary-sub">{summary.transaction_count} opérations au total</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ marginBottom: 40 }}>
        <div className="section-label">Aperçu mensuel — 6 derniers mois</div>
        <div className="card" style={{ padding: '20px 20px 10px', height: 230 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <XAxis dataKey="month" tick={{ fill: 'rgba(245,240,232,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(245,240,232,0.45)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
              <Tooltip
                contentStyle={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)', fontSize: 12 }}
                labelStyle={{ color: 'var(--gold)' }}
                formatter={v => formatAmount(v, 'XAF')}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="Entrées"  fill="rgba(76,175,130,0.6)"  radius={[2,2,0,0]} />
              <Bar dataKey="Sorties"  fill="rgba(224,90,78,0.5)"   radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="section-label">Dernières transactions</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Référence</th>
              <th>Description</th>
              <th>Saisi par</th>
              <th>Catégorie</th>
              <th className="right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <p>Aucune transaction</p>
                  <span>Cliquez sur "Nouvelle transaction" pour commencer</span>
                </div>
              </td></tr>
            ) : recent.map(tx => (
              <tr key={tx.id}>
                <td className="td-muted">{formatDate(tx.date)}</td>
                <td className="td-serif">{tx.reference}</td>
                <td>{tx.description || '—'}</td>
                <td className="td-muted">{tx.created_by_user?.full_name || '—'}</td>
                <td><span className={`badge ${getCatBadge(tx.category, tx.type)}`}>{getCatLabel(tx.category, tx.type)}</span></td>
                <td className="right">
                  <span className={`td-amount ${tx.type}`}>
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
          onSaved={() => { setShowModal(false); load(); show('Transaction enregistrée ✓') }}
        />
      )}
    </div>
  )
}
