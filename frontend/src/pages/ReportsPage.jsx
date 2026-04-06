import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { reportsAPI, transactionsAPI } from '../api/endpoints'
import { formatAmount, formatAmountPDF, formatDate, EXPENSE_CATS, todayISO } from '../api/utils'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'
import { useToast } from '../hooks/useToast'

const NIU = 'M2466666'

export default function ReportsPage() {
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const { show, ToastEl } = useToast()

  const [summary,      setSummary]      = useState(null)
  const [byCat,        setByCat]        = useState([])
  const [byWorker,     setByWorker]     = useState([])
  const [dailyCash,    setDailyCash]    = useState([])
  const [pl,           setPl]           = useState(null)
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [loading,      setLoading]      = useState(true)
  const [expandWorker, setExpandWorker] = useState({})
  const [cashModal,    setCashModal]    = useState(false)
  const [cashDate,     setCashDate]     = useState(todayISO())
  const [openBal,      setOpenBal]      = useState('')
  const [closeBal,     setCloseBal]     = useState('')
  const [cashMode,     setCashMode]     = useState('open')
  const [cashLoading,  setCashLoading]  = useState(false)
  const [cashError,    setCashError]    = useState('')

  const load = async () => {
    setLoading(true)
    const params = {}
    if (dateFrom) params.date_from = dateFrom
    if (dateTo)   params.date_to   = dateTo
    try {
      const [sumRes, catRes, workerRes, cashRes, plRes] = await Promise.all([
        reportsAPI.summary(params),
        reportsAPI.byCategory(params),
        reportsAPI.byWorker(params),
        reportsAPI.dailyCash(),
        reportsAPI.profitLoss(params),
      ])
      setSummary(sumRes.data)
      setByCat(catRes.data)
      setByWorker(workerRes.data)
      setDailyCash(cashRes.data)
      setPl(plRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [dateFrom, dateTo])

  const toggleWorker = (name) => setExpandWorker(prev => ({ ...prev, [name]: !prev[name] }))

  const exportPDF = async () => {
    const { default: jsPDF }     = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const { data: txs } = await transactionsAPI.list({
      limit: 1000,
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo   && { date_to:   dateTo }),
    })

    const doc  = new jsPDF()
    const gold = [201, 168, 76]
    const navy = [11, 29, 58]
    const white = [245, 240, 232]

    doc.setFillColor(...navy)
    doc.rect(0, 0, 220, 36, 'F')
    doc.setTextColor(...gold)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text("Diko's Assurances SARL", 14, 13)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...white)
    doc.text(lang === 'fr' ? 'Rapport Financier' : 'Financial Report', 14, 21)
    doc.text('NIU: ' + NIU + '  |  Douala, Cameroun', 14, 29)
    doc.setTextColor(180, 180, 180)
    doc.text(new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB'), 160, 21)

    if (summary) {
      doc.setTextColor(...navy)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text(lang === 'fr' ? 'Resume' : 'Summary', 14, 48)
      autoTable(doc, {
        startY: 52,
        head: [[lang === 'fr' ? 'Indicateur' : 'Indicator', lang === 'fr' ? 'Valeur' : 'Value']],
        body: [
          [lang === 'fr' ? 'Entrees totales'    : 'Total income',    formatAmountPDF(summary.total_income,   'XAF')],
          [lang === 'fr' ? 'Sorties totales'    : 'Total outflows',  formatAmountPDF(summary.total_expenses, 'XAF')],
          [lang === 'fr' ? 'Solde net'          : 'Net balance',     formatAmountPDF(summary.net_balance,    'XAF')],
          [lang === 'fr' ? 'Depenses personnel' : 'Staff spending',  formatAmountPDF(summary.staff_spending, 'XAF')],
          [lang === 'fr' ? 'TVA collectee'      : 'TVA collected',   formatAmountPDF(summary.tva_collected,  'XAF')],
          [lang === 'fr' ? 'TVA deductible'     : 'TVA deductible',  formatAmountPDF(summary.tva_deductible, 'XAF')],
          [lang === 'fr' ? 'TVA due'            : 'TVA due',         formatAmountPDF(summary.tva_due,        'XAF')],
          [lang === 'fr' ? 'Nb. transactions'   : 'Transactions',    summary.transaction_count.toString()],
        ],
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: navy, textColor: gold, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 240, 232] },
        margin: { left: 14, right: 14 },
      })
    }

    if (pl) {
      let y = (doc.lastAutoTable?.finalY || 90) + 12
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...navy)
      doc.text(lang === 'fr' ? 'Compte de Resultat' : 'Profit & Loss', 14, y)
      autoTable(doc, {
        startY: y + 4,
        head: [[lang === 'fr' ? 'Poste' : 'Item', lang === 'fr' ? 'Montant' : 'Amount']],
        body: [
          ...pl.income_lines.map(l => [l.category, formatAmountPDF(l.total, 'XAF')]),
          [lang === 'fr' ? 'TOTAL ENTREES' : 'TOTAL INCOME', formatAmountPDF(pl.total_income, 'XAF')],
          ['', ''],
          ...pl.expense_lines.map(l => [l.category, formatAmountPDF(l.total, 'XAF')]),
          [lang === 'fr' ? 'TOTAL SORTIES' : 'TOTAL EXPENSES', formatAmountPDF(pl.total_expenses, 'XAF')],
          ['', ''],
          [lang === 'fr' ? 'BENEFICE NET' : 'NET PROFIT', formatAmountPDF(pl.net_profit, 'XAF')],
          ['', ''],
          [lang === 'fr' ? 'TVA collectee' : 'TVA collected',  formatAmountPDF(pl.tva_collected,  'XAF')],
          [lang === 'fr' ? 'TVA deductible': 'TVA deductible', formatAmountPDF(pl.tva_deductible, 'XAF')],
          [lang === 'fr' ? 'TVA DUE'       : 'TVA DUE',        formatAmountPDF(pl.tva_due,        'XAF')],
        ],
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: navy, textColor: gold, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 240, 232] },
        margin: { left: 14, right: 14 },
      })
    }

    let y2 = (doc.lastAutoTable?.finalY || 90) + 12
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...navy)
    doc.text(lang === 'fr' ? 'Detail des transactions' : 'Transaction details', 14, y2)
    autoTable(doc, {
      startY: y2 + 4,
      head: [['Date', 'Reference', 'Description', lang === 'fr' ? 'Categorie' : 'Category', lang === 'fr' ? 'Saisi par' : 'Entered by', 'Type', lang === 'fr' ? 'Montant' : 'Amount', 'TVA']],
      body: txs.map(tx => [
        formatDate(tx.date, lang),
        tx.reference,
        (tx.description || '').slice(0, 30),
        tx.category,
        tx.created_by_user?.full_name || '-',
        tx.type === 'income' ? (lang === 'fr' ? 'Entree' : 'Income') : (lang === 'fr' ? 'Sortie' : 'Expense'),
        (tx.type === 'expense' ? '-' : '+') + formatAmountPDF(tx.amount, tx.currency),
        tx.tva_amount ? formatAmountPDF(tx.tva_amount, tx.currency) : '—',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: navy, textColor: gold, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 246, 240] },
      columnStyles: { 6: { halign: 'right' }, 7: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text("Page " + i + " / " + pageCount + "  |  Diko's Assurances SARL  |  NIU: " + NIU, 14, doc.internal.pageSize.height - 8)
    }

    doc.save('dikos-finance-' + todayISO() + '.pdf')
    show(t('rep_exported_pdf'))
  }

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const { data: txs } = await transactionsAPI.list({
      limit: 1000,
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo   && { date_to:   dateTo }),
    })

    const rows = txs.map(tx => ({
      [lang === 'fr' ? 'Date'          : 'Date']:         tx.date,
      [lang === 'fr' ? 'Reference'     : 'Reference']:    tx.reference,
      [lang === 'fr' ? 'Type'          : 'Type']:         tx.type === 'income' ? (lang === 'fr' ? 'Entree' : 'Income') : (lang === 'fr' ? 'Sortie' : 'Expense'),
      [lang === 'fr' ? 'Categorie'     : 'Category']:     tx.category,
      [lang === 'fr' ? 'Description'   : 'Description']:  tx.description || '',
      [lang === 'fr' ? 'Client'        : 'Client']:       tx.customer?.full_name || '',
      [lang === 'fr' ? 'Collaborateur' : 'Staff']:        tx.worker_name || '',
      [lang === 'fr' ? 'Saisi par'     : 'Entered by']:   tx.created_by_user?.full_name || '',
      [lang === 'fr' ? 'Montant'       : 'Amount']:       tx.type === 'expense' ? -tx.amount : tx.amount,
      [lang === 'fr' ? 'TVA'           : 'TVA']:          tx.tva_amount || 0,
      [lang === 'fr' ? 'Devise'        : 'Currency']:     tx.currency,
      [lang === 'fr' ? 'Mode paiement' : 'Payment']:      tx.payment_method || '',
      [lang === 'fr' ? 'Note'          : 'Note']:         tx.note || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions')

    if (summary) {
      const sumRows = [
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: "Diko's Assurances SARL - NIU: " + NIU, [lang === 'fr' ? 'Valeur' : 'Value']: '' },
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: lang === 'fr' ? 'Entrees totales'    : 'Total income',    [lang === 'fr' ? 'Valeur' : 'Value']: summary.total_income },
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: lang === 'fr' ? 'Sorties totales'    : 'Total outflows',  [lang === 'fr' ? 'Valeur' : 'Value']: summary.total_expenses },
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: lang === 'fr' ? 'Solde net'          : 'Net balance',     [lang === 'fr' ? 'Valeur' : 'Value']: summary.net_balance },
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: lang === 'fr' ? 'Depenses personnel' : 'Staff spending',  [lang === 'fr' ? 'Valeur' : 'Value']: summary.staff_spending },
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: lang === 'fr' ? 'TVA collectee'      : 'TVA collected',   [lang === 'fr' ? 'Valeur' : 'Value']: summary.tva_collected },
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: lang === 'fr' ? 'TVA deductible'     : 'TVA deductible',  [lang === 'fr' ? 'Valeur' : 'Value']: summary.tva_deductible },
        { [lang === 'fr' ? 'Indicateur' : 'Indicator']: lang === 'fr' ? 'TVA due'            : 'TVA due',         [lang === 'fr' ? 'Valeur' : 'Value']: summary.tva_due },
      ]
      const ws2 = XLSX.utils.json_to_sheet(sumRows)
      XLSX.utils.book_append_sheet(wb, ws2, lang === 'fr' ? 'Resume' : 'Summary')
    }

    if (pl) {
      const plRows = [
        { [lang === 'fr' ? 'Poste' : 'Item']: "Diko's Assurances SARL - NIU: " + NIU, [lang === 'fr' ? 'Montant' : 'Amount']: '' },
        ...pl.income_lines.map(l  => ({ [lang === 'fr' ? 'Poste' : 'Item']: l.category, [lang === 'fr' ? 'Montant' : 'Amount']: l.total })),
        { [lang === 'fr' ? 'Poste' : 'Item']: lang === 'fr' ? 'TOTAL ENTREES'  : 'TOTAL INCOME',    [lang === 'fr' ? 'Montant' : 'Amount']: pl.total_income },
        { [lang === 'fr' ? 'Poste' : 'Item']: '',                                                    [lang === 'fr' ? 'Montant' : 'Amount']: '' },
        ...pl.expense_lines.map(l => ({ [lang === 'fr' ? 'Poste' : 'Item']: l.category, [lang === 'fr' ? 'Montant' : 'Amount']: l.total })),
        { [lang === 'fr' ? 'Poste' : 'Item']: lang === 'fr' ? 'TOTAL SORTIES'  : 'TOTAL EXPENSES',  [lang === 'fr' ? 'Montant' : 'Amount']: pl.total_expenses },
        { [lang === 'fr' ? 'Poste' : 'Item']: '',                                                    [lang === 'fr' ? 'Montant' : 'Amount']: '' },
        { [lang === 'fr' ? 'Poste' : 'Item']: lang === 'fr' ? 'BENEFICE NET'   : 'NET PROFIT',      [lang === 'fr' ? 'Montant' : 'Amount']: pl.net_profit },
        { [lang === 'fr' ? 'Poste' : 'Item']: '',                                                    [lang === 'fr' ? 'Montant' : 'Amount']: '' },
        { [lang === 'fr' ? 'Poste' : 'Item']: lang === 'fr' ? 'TVA collectee'  : 'TVA collected',   [lang === 'fr' ? 'Montant' : 'Amount']: pl.tva_collected },
        { [lang === 'fr' ? 'Poste' : 'Item']: lang === 'fr' ? 'TVA deductible' : 'TVA deductible',  [lang === 'fr' ? 'Montant' : 'Amount']: pl.tva_deductible },
        { [lang === 'fr' ? 'Poste' : 'Item']: lang === 'fr' ? 'TVA DUE'        : 'TVA DUE',         [lang === 'fr' ? 'Montant' : 'Amount']: pl.tva_due },
      ]
      const ws3 = XLSX.utils.json_to_sheet(plRows)
      XLSX.utils.book_append_sheet(wb, ws3, lang === 'fr' ? 'Compte de Resultat' : 'P&L')
    }

    XLSX.writeFile(wb, 'dikos-finance-' + todayISO() + '.xlsx')
    show(t('rep_exported_excel'))
  }

  const openCashModal = (mode) => {
    setCashMode(mode)
    setCashDate(todayISO())
    setOpenBal('')
    setCloseBal('')
    setCashError('')
    setCashModal(true)
  }

  const submitCash = async () => {
    setCashError('')
    if (cashMode === 'open' && (!openBal || parseFloat(openBal) < 0)) {
      setCashError(lang === 'fr' ? 'Veuillez saisir un solde valide' : 'Please enter a valid balance')
      return
    }
    if (cashMode === 'close' && (!closeBal || parseFloat(closeBal) < 0)) {
      setCashError(lang === 'fr' ? 'Veuillez saisir un solde valide' : 'Please enter a valid balance')
      return
    }
    setCashLoading(true)
    try {
      if (cashMode === 'open') {
        await reportsAPI.openDay({ date: cashDate, opening_balance: parseFloat(openBal), note: '' })
        show(t('cash_opened'))
      } else {
        await reportsAPI.closeDay(cashDate, { closing_balance: parseFloat(closeBal), note: '' })
        show(t('cash_closed'))
      }
      setCashModal(false)
      load()
    } catch (e) {
      const detail = e.response?.data?.detail
      if (typeof detail === 'string') {
        setCashError(detail)
      } else if (Array.isArray(detail)) {
        setCashError(detail.map(d => d.msg).join(', '))
      } else {
        setCashError(lang === 'fr' ? 'Erreur — verifiez que la caisse est deja ouverte pour cette date' : 'Error — make sure the register is already opened for this date')
      }
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
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <button className="btn btn-outline" onClick={() => openCashModal('open')}>{t('rep_open_cash')}</button>
            <button className="btn btn-outline" onClick={() => openCashModal('close')}>{t('rep_close_cash')}</button>
            <button className="btn btn-outline" onClick={exportExcel}>{t('rep_excel')}</button>
            <button className="btn btn-primary" onClick={exportPDF}>{t('rep_pdf')}</button>
          </div>
        </div>
      </div>

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

      {summary && (
        <div className="summary-grid" style={{ marginBottom:40 }}>
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
            <div className="summary-sub">{summary.transaction_count} {lang === 'fr' ? 'operations' : 'operations'}</div>
          </div>
        </div>
      )}

      {summary && (
        <>
          <div className="section-label">{lang === 'fr' ? 'Recapitulatif TVA (19.25%)' : 'TVA Summary (19.25%)'}</div>
          <div className="summary-grid" style={{ marginBottom:40 }}>
            <div className="summary-card">
              <div className="summary-label">{lang === 'fr' ? 'TVA collectee' : 'TVA collected'}</div>
              <div className="summary-value positive">{formatAmount(summary.tva_collected, 'XAF')}</div>
              <div className="summary-sub">{lang === 'fr' ? 'Sur les entrees' : 'On income'}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">{lang === 'fr' ? 'TVA deductible' : 'TVA deductible'}</div>
              <div className="summary-value negative">{formatAmount(summary.tva_deductible, 'XAF')}</div>
              <div className="summary-sub">{lang === 'fr' ? 'Sur les sorties' : 'On expenses'}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">{lang === 'fr' ? 'TVA due' : 'TVA due'}</div>
              <div className={'summary-value ' + (summary.tva_due >= 0 ? 'gold' : 'negative')}>
                {formatAmount(Math.abs(summary.tva_due), 'XAF')}
              </div>
              <div className="summary-sub">{lang === 'fr' ? 'A reverser a l\'Etat' : 'Payable to tax authority'}</div>
            </div>
          </div>
        </>
      )}

      {pl && (
        <>
          <div className="section-label">{lang === 'fr' ? 'Compte de resultat' : 'Profit & Loss'}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:40 }}>
            <div className="card" style={{ padding:24 }}>
              <div style={{ fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--green)', marginBottom:16 }}>
                {lang === 'fr' ? 'Entrees par categorie' : 'Income by category'}
              </div>
              {pl.income_lines.map(l => (
                <div key={l.category} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--navy-border)' }}>
                  <span style={{ fontSize:13, color:'var(--white-dim)', textTransform:'capitalize' }}>{l.category}</span>
                  <span style={{ fontFamily:'var(--font-serif)', fontSize:15, color:'var(--green)' }}>+{formatAmount(l.total, 'XAF')}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0 0', marginTop:4 }}>
                <span style={{ fontSize:12, letterSpacing:'1px', textTransform:'uppercase', color:'var(--muted)' }}>{lang === 'fr' ? 'Total entrees' : 'Total income'}</span>
                <span style={{ fontFamily:'var(--font-serif)', fontSize:18, color:'var(--green)' }}>+{formatAmount(pl.total_income, 'XAF')}</span>
              </div>
            </div>
            <div className="card" style={{ padding:24 }}>
              <div style={{ fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--red)', marginBottom:16 }}>
                {lang === 'fr' ? 'Sorties par categorie' : 'Expenses by category'}
              </div>
              {pl.expense_lines.map(l => (
                <div key={l.category} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--navy-border)' }}>
                  <span style={{ fontSize:13, color:'var(--white-dim)', textTransform:'capitalize' }}>{l.category}</span>
                  <span style={{ fontFamily:'var(--font-serif)', fontSize:15, color:'var(--red)' }}>-{formatAmount(l.total, 'XAF')}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0 0', marginTop:4 }}>
                <span style={{ fontSize:12, letterSpacing:'1px', textTransform:'uppercase', color:'var(--muted)' }}>{lang === 'fr' ? 'Total sorties' : 'Total expenses'}</span>
                <span style={{ fontFamily:'var(--font-serif)', fontSize:18, color:'var(--red)' }}>-{formatAmount(pl.total_expenses, 'XAF')}</span>
              </div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:40 }}>
            <div className="summary-card" style={{ borderLeft:'3px solid var(--gold)' }}>
              <div className="summary-label">{lang === 'fr' ? 'Benefice net' : 'Net profit'}</div>
              <div className={'summary-value ' + (pl.net_profit >= 0 ? 'gold' : 'negative')}>
                {pl.net_profit >= 0 ? '+' : '-'}{formatAmount(Math.abs(pl.net_profit), 'XAF')}
              </div>
              <div className="summary-sub">
                {lang === 'fr' ? 'Periode : ' + pl.period_from + ' -> ' + pl.period_to : 'Period: ' + pl.period_from + ' -> ' + pl.period_to}
              </div>
            </div>
            <div className="summary-card" style={{ borderLeft:'3px solid var(--gold)' }}>
              <div className="summary-label">{lang === 'fr' ? 'TVA due a l\'Etat' : 'TVA payable'}</div>
              <div className="summary-value gold">{formatAmount(pl.tva_due, 'XAF')}</div>
              <div className="summary-sub">
                {lang === 'fr' ? 'Collectee ' + formatAmount(pl.tva_collected,'XAF') + ' - Deductible ' + formatAmount(pl.tva_deductible,'XAF') : 'Collected ' + formatAmount(pl.tva_collected,'XAF') + ' - Deductible ' + formatAmount(pl.tva_deductible,'XAF')}
              </div>
            </div>
          </div>
        </>
      )}

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
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>{t('dash_loading')}</td></tr>
            ) : byCat.length === 0 ? (
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
                  <td className="right"><span className="td-amount expense">{formatAmount(c.total, 'XAF')}</span></td>
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

      <div className="section-label">{t('rep_by_worker')}</div>
      <div style={{ marginBottom:40 }}>
        {byWorker.length === 0 ? (
          <div className="empty-state"><p>{t('rep_no_data')}</p></div>
        ) : byWorker.map(w => (
          <div key={w.worker_name} className="card" style={{ marginBottom:12, padding:0, overflow:'hidden' }}>
            <div
              onClick={() => toggleWorker(w.worker_name)}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 24px', cursor:'pointer' }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--navy-border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-serif)', fontSize:16, color:'var(--gold)' }}>
                  {w.worker_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontFamily:'var(--font-serif)', fontSize:16, fontWeight:500 }}>{w.worker_name}</div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{w.count} {w.count === 1 ? t('exp_transactions') : t('exp_transactions_pl')}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                <span style={{ fontFamily:'var(--font-serif)', fontSize:18, color:'var(--red)' }}>
                  -{formatAmount(w.total, 'XAF')}
                </span>
                <span style={{ color:'var(--muted)', fontSize:16 }}>{expandWorker[w.worker_name] ? '▲' : '▼'}</span>
              </div>
            </div>
            {expandWorker[w.worker_name] && (
              <div style={{ borderTop:'1px solid var(--navy-border)', padding:'0 24px 16px' }}>
                <table style={{ width:'100%', marginTop:12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign:'left', fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)', paddingBottom:8 }}>{lang === 'fr' ? 'Categorie' : 'Category'}</th>
                      <th style={{ textAlign:'right', fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)', paddingBottom:8 }}>Transactions</th>
                      <th style={{ textAlign:'right', fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)', paddingBottom:8 }}>Total</th>
                      <th style={{ textAlign:'right', fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--muted)', paddingBottom:8 }}>{lang === 'fr' ? 'Part' : 'Share'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {w.categories.map(c => {
                      const def = EXPENSE_CATS[c.category] || EXPENSE_CATS.autre
                      return (
                        <tr key={c.category}>
                          <td style={{ padding:'6px 0' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:8, height:8, background:def.color, flexShrink:0 }} />
                              <span style={{ fontSize:13 }}>{lang === 'fr' ? def.label : def.labelEn}</span>
                            </div>
                          </td>
                          <td style={{ textAlign:'right', fontSize:13, color:'var(--muted)' }}>{c.count}</td>
                          <td style={{ textAlign:'right' }}>
                            <span style={{ fontFamily:'var(--font-serif)', fontSize:14, color:'var(--red)' }}>-{formatAmount(c.total, 'XAF')}</span>
                          </td>
                          <td style={{ textAlign:'right', color:'var(--gold)', fontFamily:'var(--font-serif)', fontSize:14 }}>{c.percent}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="section-label">{t('rep_cash_title')}</div>
      <div style={{ background:'var(--navy-light)', border:'1px solid var(--navy-border)', borderLeft:'3px solid var(--gold)', padding:'14px 20px', marginBottom:20, fontSize:12, color:'var(--white-dim)', lineHeight:1.6 }}>
        <strong style={{ color:'var(--gold)', display:'block', marginBottom:6, fontSize:11, letterSpacing:'1px', textTransform:'uppercase' }}>
          {lang === 'fr' ? 'Comment utiliser le registre de caisse' : 'How to use the cash register'}
        </strong>
        {lang === 'fr'
          ? 'Chaque matin, cliquez "Ouvrir caisse" et saisissez le montant physique en caisse. En fin de journee, cliquez "Cloturer caisse" et saisissez le montant restant.'
          : 'Each morning, click "Open register" and enter the physical cash amount. At end of day, click "Close register" and enter the remaining amount.'
        }
      </div>
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
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <p>{t('rep_cash_empty')}</p>
                  <span>{t('rep_cash_empty_sub')}</span>
                </div>
              </td></tr>
            ) : dailyCash.map(dc => {
              const ecart = dc.closing_balance != null ? dc.closing_balance - dc.opening_balance : null
              return (
                <tr key={dc.id}>
                  <td className="td-serif">{formatDate(dc.date, lang)}</td>
                  <td className="right" style={{ color:'var(--white-dim)' }}>{formatAmount(dc.opening_balance, 'XAF')}</td>
                  <td className="right" style={{ color:'var(--white-dim)' }}>
                    {dc.closing_balance != null ? formatAmount(dc.closing_balance, 'XAF') : '—'}
                  </td>
                  <td className="right">
                    {ecart != null ? (
                      <span style={{ color: ecart >= 0 ? 'var(--green)' : 'var(--red)', fontFamily:'var(--font-serif)', fontSize:16 }}>
                        {ecart >= 0 ? '+' : ''}{formatAmount(ecart, 'XAF')}
                      </span>
                    ) : '—'}
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

      {cashModal && createPortal(
        <div
          style={{ position:'fixed', inset:0, top:0, left:0, right:0, bottom:0, width:'100vw', height:'100vh', background:'rgba(5,10,22,0.88)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px', overflowY:'auto' }}
          onClick={e => e.target === e.currentTarget && setCashModal(false)}
        >
          <div style={{ background:'var(--navy-light)', border:'1px solid var(--navy-border)', width:'100%', maxWidth:480, padding:40, position:'relative' }}>
            <button onClick={() => setCashModal(false)} style={{ position:'absolute', top:16, right:16, background:'none', border:'none', color:'var(--muted)', fontSize:22, cursor:'pointer' }}>x</button>
            <div style={{ fontSize:10, letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--gold)', marginBottom:8 }}>{t('cash_eyebrow')}</div>
            <h2 style={{ fontFamily:'var(--font-serif)', fontSize:28, fontWeight:400, marginBottom:8 }}>
              {cashMode === 'open' ? t('cash_title_open') : t('cash_title_close')}
            </h2>
            <p style={{ fontSize:12, color:'var(--muted)', marginBottom:24, lineHeight:1.6 }}>
              {cashMode === 'open'
                ? (lang === 'fr' ? 'Saisissez le montant physique present en caisse ce matin.' : 'Enter the physical cash amount present in the register this morning.')
                : (lang === 'fr' ? 'Saisissez le montant physique restant en caisse ce soir.' : 'Enter the physical cash amount remaining this evening.')
              }
            </p>
            <div className="form-group">
              <label>{t('cash_date')}</label>
              <input type="date" value={cashDate} onChange={e => setCashDate(e.target.value)} />
            </div>
            {cashMode === 'open' ? (
              <div className="form-group">
                <label>{t('cash_open_bal')}</label>
                <input type="number" value={openBal} onChange={e => setOpenBal(e.target.value)} placeholder={t('cash_open_placeholder')} min="0" autoFocus />
              </div>
            ) : (
              <div className="form-group">
                <label>{t('cash_close_bal')}</label>
                <input type="number" value={closeBal} onChange={e => setCloseBal(e.target.value)} placeholder={t('cash_close_placeholder')} min="0" autoFocus />
              </div>
            )}
            {cashError && (
              <div style={{ background:'var(--red-dim)', border:'1px solid rgba(224,90,78,0.3)', padding:'10px 14px', marginBottom:16, fontSize:13, color:'var(--red)' }}>
                {cashError}
              </div>
            )}
            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={submitCash} disabled={cashLoading}>
                {cashLoading ? t('cash_saving') : cashMode === 'open' ? t('cash_btn_open') : t('cash_btn_close')}
              </button>
              <button className="btn btn-outline" onClick={() => setCashModal(false)}>{t('modal_cancel')}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
