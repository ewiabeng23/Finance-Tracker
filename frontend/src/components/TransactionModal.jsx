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
              <th>{t('tx_col_type')}</th>
              <th className="right">{t('dash_col_amount')}</th>
              {isManager && <th className="right">{t('tx_col_actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>{t('dash_loading')}</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={9}>
                <div className="empty-state">
                  <p>{t('tx_empty')}</p>
                  <span>{t('tx_empty_sub')}</span>
                </div>
              </td></tr>
            ) : transactions.map(tx => (
              <tr key={tx.id}>
                <td className="td-muted">{formatDate(tx.date)}</td>
                <td className="td-serif">{tx.reference}</td>
                <td>
                  {tx.type === 'income'
                    ? <span style={{ color:'var(--white-dim)' }}>{tx.customer?.full_name || '—'}</span>
                    : <span style={{ color:'var(--gold-dim)', fontSize:12 }}>{tx.worker_name || '—'}</span>
                  }
                </td>
                <td style={{ color:'var(--white-dim)', maxWidth:200 }}>{tx.description || '—'}</td>
                <td><span className={`badge ${getCatBadge(tx.category, tx.type)}`}>{getCatLabel(tx.category, tx.type)}</span></td>
                <td className="td-muted">{tx.created_by_user?.full_name || '—'}</td>
                <td>
                  <span className={`badge ${tx.type === 'income' ? 'badge-income' : 'badge-expense'}`}>
                    {tx.type === 'income' ? t('tx_badge_in') : t('tx_badge_out')}
                  </span>
                </td>
                <td className="right">
                  <span className={`td-amount ${tx.type}`}>
                    {tx.type === 'expense' ? '−' : '+'}{formatAmount(tx.amount, tx.currency)}
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
