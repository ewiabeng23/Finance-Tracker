import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { reportsAPI, transactionsAPI } from '../api/endpoints'
import { formatAmount, formatDate, EXPENSE_CATS } from '../api/utils'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'
import TransactionModal from '../components/TransactionModal'
import { useToast } from '../hooks/useToast'

export default function ExpensesPage() {
  const { isManager } = useAuth()
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const { show, ToastEl } = useToast()
  const [byCat,     setByCat]     = useState([])
  const [byWorker,  setByWorker]  = useState([])
  const [expenses,  setExpenses]  = useState([])
  const [catFilter, setCatFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [loading,   setLoading]   = useState(true)

  const load = async () => {
    setLoading(true)
    const [catRes, workerRes, txRes] = await Promise.all([
      reportsAPI.byCategory(),
      reportsAPI.byWorker(),
      transactionsAPI.list({ type: 'expense', limit: 200 }),
    ])
    setByCat(catRes.data)
    setByWorker(workerRes.data)
    setExpenses(txRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async tx => {
    if (!window.confirm(`${t('tx_confirm_del')} ${tx.reference}?`)) return
    await transactionsAPI.delete(tx.id)
    show(t('tx_deleted'), 'success')
    load()
  }

  const totalExp = byCat.reduce((a, c) => a + c.total, 0)
  const filtered = catFilter === 'all' ? expenses : expenses.filter(tx => tx.category === catFilter)

  return (
    <div className="page-content">
      {ToastEl}
      <div className="page-header">
        <div className="page-eyebrow"><span className="eyebrow-line" />{t('exp_eyebrow')}</div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <h1>{t('exp_title')}</h1>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
            + {t('exp_new')}
          </button>
        </div>
      </div>

      <div className="summary-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        <div className="summary-card">
          <div className="summary-label">{t('exp_card_total')}</div>
          <div className="summary-value negative">{formatAmount(totalExp, 'XAF')}</div>
          <div className="summary-sub">{expenses.length} transactions</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">{t('exp_card_top_cat')}</div>
          <div className="summary-value white">
            {byCat[0] ? (lang === 'fr' ? EXPENSE_CATS[byCat[0].category]?.label : EXPENSE_CATS[byCat[0].category]?.labelEn) || byCat[0].category : '--'}
          </div>
          <div className="summary-sub">{byCat[0] ? byCat[0].percent + '% ' + t('exp_of_total') : '--'}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">{t('exp_card_top_worker')}</div>
          <div className="summary-value white">{byWorker[0]?.worker_name || '--'}</div>
          <div className="summary-sub">{byWorker[0] ? formatAmount(byWorker[0].total, 'XAF') : '--'}</div>
        </div>
      </div>

      {byCat.length > 0 && (
        <>
          <div className="section-label">{t('exp_breakdown')}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:40 }}>
            <div className="card" style={{ height:280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCat} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={70} outerRadius={110}>
                    {byCat.map((entry, i) => (
                      <Cell key={i}
                        fill={(EXPENSE_CATS[entry.category]?.color || '#9BA8B5') + 'CC'}
                        stroke={EXPENSE_CATS[entry.category]?.color || '#9BA8B5'}
                        strokeWidth={1.5}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background:'var(--navy-mid)', border:'1px solid var(--navy-border)', fontSize:12 }}
                    formatter={(v, name) => [formatAmount(v,'XAF'), lang === 'fr' ? EXPENSE_CATS[name]?.label : EXPENSE_CATS[name]?.labelEn || name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card" style={{ display:'flex', flexDirection:'column', gap:8, justifyContent:'center' }}>
              {byCat.map(c => {
                const def = EXPENSE_CATS[c.category] || EXPENSE_CATS.autre
                return (
                  <div key={c.category}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', border:'1px solid var(--navy-border)', cursor:'pointer', background: catFilter===c.category ? 'var(--white-faint)' : '' }}
                    onClick={() => setCatFilter(catFilter === c.category ? 'all' : c.category)}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:10, height:10, background:def.color, flexShrink:0 }} />
                      <span style={{ fontSize:12, color:'var(--white-dim)' }}>{lang === 'fr' ? def.label : def.labelEn}</span>
                    </div>
                    <span style={{ fontFamily:'var(--font-serif)', fontSize:18, color:'var(--gold)', fontWeight:500 }}>{c.percent}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {byWorker.length > 0 && (
        <>
          <div className="section-label">{t('exp_by_worker')}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:16, marginBottom:40 }}>
            {byWorker.map(w => (
              <div key={w.worker_name} className="card" style={{ borderLeft:'3px solid var(--gold)', paddingLeft:20 }}>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:18, fontWeight:500, marginBottom:2 }}>{w.worker_name}</div>
                <div style={{ fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)', marginBottom:14 }}>
                  {w.count} {w.count > 1 ? t('exp_transactions_pl') : t('exp_transactions')}
                </div>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:26, color:'var(--red)', fontWeight:500, marginBottom:4 }}>
                  {formatAmount(w.total,'XAF')}
                </div>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:14 }}>
                  {totalExp > 0 ? Math.round(w.total/totalExp*100) + '% ' + t('exp_of_total') : ''}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {w.categories.slice(0,4).map(c => {
                    const def = EXPENSE_CATS[c.category] || EXPENSE_CATS.autre
                    return (
                      <div key={c.category} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:10, color:'var(--muted)', width:72, textTransform:'uppercase', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                          {(lang === 'fr' ? def.label : def.labelEn).slice(0,10)}
                        </span>
                        <div style={{ flex:1, height:3, background:'var(--navy-border)' }}>
                          <div style={{ width:c.percent+'%', height:'100%', background:def.color }} />
                        </div>
                        <span style={{ fontSize:10, color:'var(--muted)', minWidth:28, textAlign:'right' }}>{c.percent}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-label">
        {t('exp_log')}
        {catFilter !== 'all' && (
          <button className="btn btn-outline btn-sm" onClick={() => setCatFilter('all')} style={{ marginLeft:8 }}>
            x {lang === 'fr' ? EXPENSE_CATS[catFilter]?.label : EXPENSE_CATS[catFilter]?.labelEn}
          </button>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('dash_col_date')}</th>
              <th>{t('exp_col_worker')}</th>
              <th>{t('exp_col_desc')}</th>
              <th>{t('dash_col_cat')}</th>
              <th className="right">{t('dash_col_amount')}</th>
              <th className="right">{t('tx_col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>{t('dash_loading')}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <p>{t('exp_empty')}</p>
                  <span>{t('exp_empty_sub')}</span>
                </div>
              </td></tr>
            ) : filtered.map(tx => {
              const def = EXPENSE_CATS[tx.category] || EXPENSE_CATS.autre
              return (
                <tr key={tx.id}>
                  <td className="td-muted">{formatDate(tx.date, lang)}</td>
                  <td><span style={{ color:'var(--gold-dim)', fontSize:13 }}>{tx.worker_name || '--'}</span></td>
                  <td style={{ color:'var(--white-dim)' }}>{tx.description || '--'}</td>
                  <td><span className={`badge ${def.badge}`}>{lang === 'fr' ? def.label : def.labelEn}</span></td>
                  <td className="right"><span className="td-amount expense">-{formatAmount(tx.amount, tx.currency)}</span></td>
                  <td className="right">
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                      {isManager && (
                        <>
                          <button className="btn btn-outline btn-sm" onClick={() => { setEditing(tx); setShowModal(true) }}>{t('tx_edit')}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tx)}>{t('tx_delete')}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <TransactionModal
          initial={editing}
          defaultType="expense"
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); load(); show(t('tx_saved')) }}
        />
      )}
    </div>
  )
}
