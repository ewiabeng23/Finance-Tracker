import { useState, useEffect } from 'react'
import { reportsAPI, transactionsAPI } from '../api/endpoints'
import { formatAmount, formatDate, EXPENSE_CATS, todayISO } from '../api/utils'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'
import { useToast } from '../hooks/useToast'

export default function ReportsPage() {
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const { show, ToastEl } = useToast()
  const [summary,   setSummary]   = useState(null)
  const [byCat,     setByCat]     = useState([])
  const [byWorker,  setByWorker]  = useState([])
  const [dailyCash, setDailyCash] = useState([])
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [loading,   setLoading]   = useState(true)
  const [cashModal, setCashModal] = useState(false)
  const [cashDate,  setCashDate]  = useState(todayISO())
  const [openBal,   setOpenBal]   = useState('')
  const [closeBal,  setCloseBal]  = useState('')
  const [cashMode,  setCashMode]  = useState('open')
  const [cashLoading, setCashLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const params = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo)   params.date_to   = dateTo
    const [sumRes, catRes, workerRes, cashRes] = await Promise.all([
      reportsAPI.summary(params),
      reportsAPI.byCategory(params),
      reportsAPI.byWorker(params),
      reportsAPI.dailyCash(),
    ])
    setSummary(sumRes.data)
    setByCat(catRes.data)
    setByWorker(workerRes.data)
    setDailyCash(cashRes.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [dateFrom, dateTo])

  const exportPDF = async () => {
    const { default: jsPDF }     = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const { data: txs } = await transactionsAPI.list({ limit:1000, ...(dateFrom && { date_from:dateFrom }), ...(dateTo && { date_to:dateTo }) })

    const doc   = new jsPDF()
    const gold  = [201,168,76]
    const navy  = [11,29,58]

    doc.setFillColor(...navy)
    doc.rect(0,0,220,30,'F')
    doc.setTextColor(...gold)
    doc.setFontSize(18)
    doc.setFont('helvetica','bold')
    doc.text("Diko's Assurances SARL", 14, 14)
    doc.setFontSize(10)
    doc.setFont('helvetica','normal')
    doc.text(lang === 'fr' ? 'Rapport Financier — Finance Tracker' : 'Financial Report — Finance Tracker', 14, 22)
    doc.setTextColor(150,150,150)
    doc.text(new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB'), 150, 22)

    doc.setTextColor(...navy)
    doc.setFontSize(11)
    doc.setFont('helvetica','bold')
    doc.text(lang === 'fr' ? 'Résumé' : 'Summary', 14, 42)

    if (summary) {
      const rows = [
        [lang === 'fr' ? 'Entrées totales'    : 'Total income',    formatAmount(summary.total_income,   'XAF')],
        [lang === 'fr' ? 'Sorties totales'    : 'Total outflows',  formatAmount(summary.total_expenses, 'XAF')],
        [lang === 'fr' ? 'Solde net'          : 'Net balance',     formatAmount(summary.net_balance,    'XAF')],
        [lang === 'fr' ? 'Dépenses personnel' : 'Staff spending',  formatAmount(summary.staff_spending, 'XAF')],
        [lang === 'fr' ? 'Nb. transactions'   : 'Transactions',    summary.transaction_count.toString()],
      ]
      autoTable(doc, {
        startY:46,
        head: [[lang === 'fr' ? 'Indicateur' : 'Indicator', lang === 'fr' ? 'Valeur' : 'Value']],
        body: rows,
        styles:{ fontSize:10, cellPadding:4 },
        headStyles:{ fillColor:navy, textColor:gold, fontStyle:'bold' },
        alternateRowStyles:{ fillColor:[245,240,232] },
        margin:{ left:14, right:14 },
      })
    }

    let y = doc.lastAutoTable?.finalY + 12 || 100
    doc.setFont('helvetica','bold')
    doc.setFontSize(11)
    doc.text(lang === 'fr' ? 'Détail des transactions' : 'Transaction details', 14, y)
    autoTable(doc, {
      startY: y + 4,
      head: [[
        lang === 'fr' ? 'Date' : 'Date',
        lang === 'fr' ? 'Référence' : 'Reference',
        lang === 'fr' ? 'Description' : 'Description',
        lang === 'fr' ? 'Catégorie' : 'Category',
        lang === 'fr' ? 'Saisi par' : 'Entered by',
        lang === 'fr' ? 'Type' : 'Type',
        lang === 'fr' ? 'Montant' : 'Amount',
      ]],
      body: txs.map(tx => [
        formatDate(tx.date),
        tx.reference,
        (tx.description || '').slice(0,30),
        tx.category,
        tx.created_by_user?.full_name || '—',
        tx.type === 'income' ? (lang === 'fr' ? 'Entrée' : 'Income') : (lang === 'fr' ? 'Sortie' : 'Expense'),
        (tx.type === 'expense' ? '-' : '+') + formatAmount(tx.amount, tx.currency),
      ]),
      styles:{ fontSize:8, cellPadding:3 },
      headStyles:{ fillColor:navy, textColor:gold, fontStyle:'bold' },
      alternateRowStyles:{ fillColor:[248,246,240] },
      columnStyles:{ 6:{ halign:'right' } },
      margin:{ left:14, right:14 },
    })

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150,150,150)
      doc.text(`Page ${i} / ${pageCount}  —  Diko's Assurances SARL`, 14, doc.internal.pageSize.height - 8)
    }

    doc.save(`dikos-finance-${todayISO()}.pdf`)
    show(t('rep_exported_pdf'))
  }

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const { data: txs } = await transactionsAPI.list({ limit:1000, ...(dateFrom && { date_from:dateFrom }), ...(dateTo && { date_to:dateTo }) })

    const rows = txs.map(tx => ({
      [lang === 'fr' ? 'Date' : 'Date']:               tx.date,
      [lang === 'fr' ? 'Référence' : 'Reference']:     tx.reference,
      [lang === 'fr' ? 'Type' : 'Type']:               tx.type === 'income' ? (lang === 'fr' ? 'Entrée' : 'Income') : (lang === 'fr' ? 'Sortie' : 'Expense'),
      [lang === 'fr' ? 'Catégorie' : 'Category']:      tx.category,
      [lang === 'fr' ? 'Description' : 'Description']: tx.description || '',
      [lang === 'fr' ? 'Client' : 'Client']:           tx.customer?.full_name || '',
      [lang === 'fr' ? 'Collaborateur' : 'Staff']:     tx.worker_name || '',
      [lang === 'fr' ? 'Saisi par' : 'Entered by']:    tx.created_by_user?.full_name || '',
      [lang === 'fr' ? 'Montant' : 'Amount']:          tx.type === 'expense' ? -tx.amount : tx.amount,
      [lang === 'fr' ? 'Devise' : 'Currency']:         tx.currency,
      [lang === 'fr' ? 'Note' : 'Note']:               tx.note || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, lang === 'fr' ? 'Transactions' : 'Transactions')

    if (summary) {
      const sumRows = [
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: lang === 'fr' ? 'Entrées totales'    : 'Total income',   [lang === 'fr' ? 'Valeur' : 'Value']: summary.total_income },
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: lang === 'fr' ? 'Sorties totales'    : 'Total outflows', [lang === 'fr' ? 'Valeur' : 'Value']: summary.total_expenses },
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: lang === 'fr' ? 'Solde net'          : 'Net balance',    [lang === 'fr' ? 'Valeur' : 'Value']: summary.net_balance },
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: lang === 'fr' ? 'Dépenses personnel' : 'Staff spending', [lang === 'fr' ? 'Valeur' : 'Value']: summary.staff_spending },
      ]
      const ws2 = XLSX.utils.json_to_sheet(sumRows)
      XLSX.utils.book_append_sheet(wb, ws2, lang === 'fr' ? 'Résumé' : 'Summary')
    }

    XLSX.writeFile(wb, `dikos-finance-${todayISO()}.xlsx`)
    show(t('rep_exported_excel'))
  }

  const submitCash = async () => {
    setCashLoading(true)
    try {
      if (cashMode === 'open') {
        await reportsAPI.openDay({ date:cashDate, opening_balance:parseFloat(openBal), note:'' })
        show(t('cash_opened'))
      } else {
        await reportsAPI.closeDay(cashDate, { closing_balance:parseFloat(closeBal) })
        show(t('cash_closed'))
      }
      setCashModal(false); setOpenBal(''); setCloseBal(''); load()
    } catch (e) {
      show(e.response?.data?.detail || 'Erreur', 'error')
    } finally {
      setCashLoading(false)
    }
  }

  return (
    <div className="page-content">
      {ToastEl}

      <div className="page-header">
        <div className="page-eyebrow"><span className="eyebrow-line" />{t('rep_eyebrow')}</div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <h1>{t('rep_title')}</h1>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-outline" onClick={() => { setCashMode('open'); setCashModal(true) }}>{t('rep_open_cash')}</button>
            <button className="btn btn-outline" onClick={() => { setCashMode('close'); setCashModal(true) }}>{t('rep_close_cash')}</button>
            <button className="btn btn-outline" onClick={exportExcel}>{t('rep_excel')}</button>
            <button className="btn btn-primary" onClick={exportPDF}>{t('rep_pdf')}</button>
          </div>
        </div>
      </div>

      {/* Date filter */}
      <div style={{ display:'flex', gap:16, marginBottom:36, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div className="form-group" style={{ marginBottom:0 }}>
          <label>{t('rep_date_from')}</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width:180 }} />
        </div>
        <div className="form-group" style={{ marginBottom:0 }}>
          <label>{t('rep_date_to')}</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width:180 }} />
        </div>
        {(dateFrom || dateTo) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setDateFrom(''); setDateTo('') }}>
            {t('rep_reset')}
          </button>
        )}
      </div>

      {/* KPI cards */}
      {summary && (
        <div className="summary-grid" style={{ marginBottom:40 }}>
          <div className="summary-card">
            <div className="summary-label">{t('dash_card_in')}</div>
            <div className="summary-value positive">{formatAmount(summary.total_income,'XAF')}</div>
            <div className="summary-sub">{summary.income_count} transactions</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">{t('dash_card_out')}</div>
            <div className="summary-value negative">{formatAmount(summary.total_expenses,'XAF')}</div>
            <div className="summary-sub">{summary.expense_count} transactions</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">{t('dash_card_bal')}</div>
            <div className={`summary-value ${summary.net_balance >= 0 ? 'gold' : 'negative'}`}>
              {formatAmount(Math.abs(summary.net_balance),'XAF')}
            </div>
            <div className="summary-sub">{summary.net_balance >= 0 ? t('dash_surplus') : t('dash_deficit')}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">{t('dash_card_staff')}</div>
            <div className="summary-value negative">{formatAmount(summary.staff_spending,'XAF')}</div>
            <div className="summary-sub">{summary.transaction_count} {lang === 'fr' ? 'opérations' : 'operations'}</div>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      <div className="section-label">{t('rep_by_cat')}</div>
      <div className="table-wrap" style={{ marginBottom:40 }}>
        <table>
          <thead>
            <tr>
              <th>{t('rep_col_cat')}</th>
              <th className="right">{t('rep_col_txs')}</th>
              <th className="right">{t('rep_col_total')}</th>
              <th className="right">{t('rep_col_pct')}</th>
              <th style={{ width:200 }}>{t('rep_col_bar')}</th>
            </tr>
          </thead>
          <tbody>
            {byCat.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><p>{t('rep_no_data')}</p></div></td></tr>
            ) : byCat.map(c => {
              const def = EXPENSE_CATS[c.category] || EXPENSE_CATS.autre
              return (
                <tr key={c.category}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, background:def.color, flexShrink:0 }} />
                      <span>{lang === 'fr' ? def.label : def.labelEn}</span>
                    </div>
                  </td>
                  <td className="right td-muted">{c.count}</td>
                  <td className="right"><span className="td-amount expense">{formatAmount(c.total,'XAF')}</span></td>
                  <td className="right" style={{ color:'var(--gold)', fontFamily:'var(--font-serif)', fontSize:16 }}>{c.percent}%</td>
                  <td>
                    <div style={{ height:4, background:'var(--navy-border)', borderRadius:2 }}>
                      <div style={{ width:c.percent+'%', height:'100%', background:def.color, borderRadius:2 }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Worker breakdown */}
      <div className="section-label">{t('rep_by_worker')}</div>
      <div className="table-wrap" style={{ marginBottom:40 }}>
        <table>
          <thead>
            <tr>
              <th>{t('rep_col_worker')}</th>
              <th className="right">{t('rep_col_txs')}</th>
              <th className="right">{t('rep_col_total')}</th>
              <th>{t('rep_col_top_cat')}</th>
            </tr>
          </thead>
          <tbody>
            {byWorker.length === 0 ? (
              <tr><td colSpan={4}><div className="empty-state"><p>{t('rep_no_data')}</p></div></td></tr>
            ) : byWorker.map(w => {
              const topCat = w.categories[0]
              const def    = topCat ? (EXPENSE_CATS[topCat.category] || EXPENSE_CATS.autre) : null
              return (
                <tr key={w.worker_name}>
                  <td><span style={{ fontFamily:'var(--font-serif)', fontSize:15, fontWeight:500 }}>{w.worker_name}</span></td>
                  <td className="right td-muted">{w.count}</td>
                  <td className="right"><span className="td-amount expense">{formatAmount(w.total,'XAF')}</span></td>
                  <td>{def && <span className={`badge ${def.badge}`}>{lang === 'fr' ? def.label : def.labelEn}</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Daily cash register */}
      <div className="section-label">{t('rep_cash_title')}</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('dash_col_date')}</th>
              <th className="right">{t('rep_cash_open_col')}</th>
              <th className="right">{t('rep_cash_close_col')}</th>
              <th className="right">{t('rep_cash_ecart')}</th>
              <th>{t('rep_cash_status')}</th>
            </tr>
          </thead>
          <tbody>
            {dailyCash.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><p>{t('rep_cash_empty')}</p><span>{t('rep_cash_empty_sub')}</span></div></td></tr>
            ) : dailyCash.map(dc => {
              const ecart = dc.closing_balance != null ? dc.closing_balance - dc.opening_balance : null
              return (
                <tr key={dc.id}>
                  <td className="td-serif">{formatDate(dc.date)}</td>
                  <td className="right" style={{ color:'var(--white-dim)' }}>{formatAmount(dc.opening_balance,'XAF')}</td>
                  <td className="right" style={{ color:'var(--white-dim)' }}>{dc.closing_balance != null ? formatAmount(dc.closing_balance,'XAF') : '—'}</td>
                  <td className="right">
                    {ecart != null
                      ? <span style={{ color: ecart >= 0 ? 'var(--green)' : 'var(--red)', fontFamily:'var(--font-serif)', fontSize:16 }}>
                          {ecart >= 0 ? '+' : ''}{formatAmount(ecart,'XAF')}
                        </span>
                      : '—'}
                  </td>
                  <td>
                    {dc.closing_balance != null
                      ? <span className="badge badge-income">{t('rep_cash_closed')}</span>
                      : <span style={{ fontSize:10, color:'var(--gold)', letterSpacing:'1px', textTransform:'uppercase' }}>{t('rep_cash_ongoing')}</span>
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Cash modal */}
      {cashModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCashModal(false)}>
          <div className="modal">
            <button className="modal-close" onClick={() => setCashModal(false)}>×</button>
            <div className="modal-eyebrow">{t('cash_eyebrow')}</div>
            <h2>{cashMode === 'open' ? t('cash_title_open') : t('cash_title_close')}</h2>
            <div className="form-group">
              <label>{t('cash_date')}</label>
              <input type="date" value={cashDate} onChange={e => setCashDate(e.target.value)} />
            </div>
            {cashMode === 'open' ? (
              <div className="form-group">
                <label>{t('cash_open_bal')}</label>
                <input type="number" value={openBal} onChange={e => setOpenBal(e.target.value)} placeholder={t('cash_open_placeholder')} min="0" />
              </div>
            ) : (
              <div className="form-group">
                <label>{t('cash_close_bal')}</label>
                <input type="number" value={closeBal} onChange={e => setCloseBal(e.target.value)} placeholder={t('cash_close_placeholder')} min="0" />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex:1 }} onClick={submitCash} disabled={cashLoading}>
                {cashLoading ? t('cash_saving') : cashMode === 'open' ? t('cash_btn_open') : t('cash_btn_close')}
              </button>
              <button className="btn btn-outline" onClick={() => setCashModal(false)}>{t('modal_cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
