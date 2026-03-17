import { useState, useEffect } from 'react'
import { transactionsAPI } from '../api/endpoints'
import { formatAmount, formatDate, getCatBadge, getCatLabel, EXPENSE_CATS, INCOME_CATS } from '../api/utils'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'
import TransactionModal from '../components/TransactionModal'
import { useToast } from '../hooks/useToast'

export default function TransactionsPage() {
  const { isManager } = useAuth()
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const { show, ToastEl } = useToast()
  const [transactions, setTransactions] = useState([])
  const [filter,       setFilter]       = useState('all')
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState('all')
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [editing,      setEditing]      = useState(null)

  // Summary stats
  const totalIn  = transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0)
  const totalOut = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0)
  const balance  = totalIn - totalOut

  const load = async () => {
    setLoading(true)
    const params = {}
    if (filter !== 'all') params.type = filter
    if (search) params.search = search
    if (catFilter !== 'all') params.category = catFilter
    const { data } = await transactionsAPI.list(params)
    setTransactions(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [filter, search, catFilter])

  const handleDelete = async (tx) => {
    if (!window.confirm(`${t('tx_confirm_del')} ${tx.reference}?`)) return
    await transactionsAPI.delete(tx.id)
    show(t('tx_deleted'), 'success')
    load()
  }

  // Compute running balance — sorted oldest to newest first, then reverse for display
  const withBalance = () => {
    const sorted = [...transactions].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    let running = 0
    const result = sorted.map(tx => {
      if (tx.type === 'income')  running += tx.amount
      if (tx.type === 'expense') running -= tx.amount
      return { ...tx, runningBalance: running }
    })
    return result.reverse() // show newest first
  }

  const displayTxs = withBalance()
  const allCats = { ...INCOME_CATS, ...EXPENSE_CATS }

  return (
    <div className="page-content">
      {ToastEl}

      <div className="page-header">
        <div className="page-eyebrow"><span className="eyebrow-line" />{t('tx_eyebrow')}</div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <h1>{t('tx_title')}</h1>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
            + {t('tx_new')}
          </button>
        </div>
      </div>

      {/* Money In / Out / Balance summary bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1, background: 'var(--navy-border)',
        border: '1px solid var(--navy-border)', marginBottom: 32,
      }}>
        <div style={{ background: 'var(--navy-light)', padding: '20px 24px' }}>
          <div style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
            {t('dash_card_in')}
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'var(--green)' }}>
            +{formatAmount(totalIn, 'XAF')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            {transactions.filter(t => t.type === 'income').length} transactions
          </div>
        </div>
        <div style={{ background: 'var(--navy-light)', padding: '20px 24px' }}>
          <div style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
            {t('dash_card_out')}
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'var(--red)' }}>
            -{formatAmount(totalOut, 'XAF')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            {transactions.filter(t => t.type === 'expense').length} transactions
          </div>
        </div>
        <div style={{ background: 'var(--navy-light)', padding: '20px 24px', borderLeft: '3px solid var(--gold)' }}>
          <div style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
            {t('dash_card_bal')}
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 500, color: balance >= 0 ? 'var(--gold)' : 'var(--red)' }}>
            {balance >= 0 ? '+' : ''}{formatAmount(balance, 'XAF')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            {balance >= 0 ? t('dash_surplus') : t('dash_deficit')}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-tabs">
          {[['all', t('tx_filter_all')], ['income', t('tx_filter_in')], ['expense', t('tx_filter_out')]].map(([v,l]) => (
            <button key={v} className={`filter-tab ${filter===v?'active':''}`} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('tx_search')} style={{ width:220 }} />
        </div>
        <select
          value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ background:'var(--navy-light)', border:'1px solid var(--navy-border)', padding:'8px 12px', color:'var(--white-dim)', fontFamily:'var(--font-sans)', fontSize:11, letterSpacing:'1px', outline:'none' }}
        >
          <option value="all">{t('tx_all_cats')}</option>
          {Object.entries(allCats).map(([k,v]) => (
            <option key={k} value={k}>{lang === 'fr' ? v.label : v.labelEn}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('dash_col_date')}</th>
              <th>{t('dash_col_ref')}</th>
              <th>{t('tx_col_client')}</th>
              <th>{t('dash_col_desc')}</th>
              <th>{t('dash_col_cat')}</th>
              <th>{t('dash_col_by')}</th>
              <th className="right" style={{ color: 'var(--green)' }}>{t('tx_filter_in')}</th>
              <th className="right" style={{ color: 'var(--red)' }}>{t('tx_filter_out')}</th>
              <th className="right" style={{ color: 'var(--gold)' }}>
                {lang === 'fr' ? 'Solde courant' : 'Running balance'}
              </th>
              {isManager && <th className="right">{t('tx_col_actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>{t('dash_loading')}</td></tr>
            ) : displayTxs.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="empty-state">
                  <p>{t('tx_empty')}</p>
                  <span>{t('tx_empty_sub')}</span>
                </div>
              </td></tr>
            ) : displayTxs.map(tx => (
              <tr key={tx.id}>
                <td className="td-muted">{formatDate(tx.date, lang)}</td>
                <td className="td-serif">{tx.reference}</td>
                <td>
                  {tx.type === 'income'
                    ? <span style={{ color:'var(--white-dim)' }}>{tx.customer?.full_name || '—'}</span>
                    : <span style={{ color:'var(--gold-dim)', fontSize:12 }}>{tx.worker_name || '—'}</span>
                  }
                </td>
                <td style={{ color:'var(--white-dim)', maxWidth:180 }}>{tx.description || '—'}</td>
                <td><span className={`badge ${getCatBadge(tx.category, tx.type)}`}>{getCatLabel(tx.category, tx.type, lang)}</span></td>
                <td className="td-muted">{tx.created_by_user?.full_name || '—'}</td>

                {/* Money IN column */}
                <td className="right">
                  {tx.type === 'income'
                    ? <span style={{ fontFamily:'var(--font-serif)', fontSize:16, fontWeight:500, color:'var(--green)' }}>
                        +{formatAmount(tx.amount, tx.currency)}
                      </span>
                    : <span style={{ color:'var(--muted)' }}>—</span>
                  }
                </td>

                {/* Money OUT column */}
                <td className="right">
                  {tx.type === 'expense'
                    ? <span style={{ fontFamily:'var(--font-serif)', fontSize:16, fontWeight:500, color:'var(--red)' }}>
                        -{formatAmount(tx.amount, tx.currency)}
                      </span>
                    : <span style={{ color:'var(--muted)' }}>—</span>
                  }
                </td>

                {/* Running balance */}
                <td className="right">
                  <span style={{
                    fontFamily:'var(--font-serif)', fontSize:16, fontWeight:500,
                    color: tx.runningBalance >= 0 ? 'var(--gold)' : 'var(--red)'
                  }}>
                    {tx.runningBalance >= 0 ? '+' : ''}{formatAmount(tx.runningBalance, 'XAF')}
                  </span>
                </td>

                {isManager && (
                  <td className="right">
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => { setEditing(tx); setShowModal(true) }}>{t('tx_edit')}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tx)}>{t('tx_delete')}</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <TransactionModal
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); load(); show(editing ? t('tx_updated') : t('tx_saved')) }}
        />
      )}
    </div>
  )
}
