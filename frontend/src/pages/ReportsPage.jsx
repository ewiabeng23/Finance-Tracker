import { useState, useEffect } from 'react'
import { reportsAPI, transactionsAPI } from '../api/endpoints'
import { formatAmount, formatDate, EXPENSE_CATS, INCOME_CATS, todayISO } from '../api/utils'
import { useToast } from '../hooks/useToast'

export default function ReportsPage() {
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
  const [cashMode,  setCashMode]  = useState('open') // 'open' | 'close'
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

  // ── PDF Export ─────────────────────────────────
  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const { data: txs } = await transactionsAPI.list({ limit: 1000, ...(dateFrom && { date_from: dateFrom }), ...(dateTo && { date_to: dateTo }) })

    const doc = new jsPDF()
    const gold = [201, 168, 76]
    const navy = [11, 29, 58]

    // Header
    doc.setFillColor(...navy)
    doc.rect(0, 0, 220, 30, 'F')
    doc.setTextColor(...gold)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text("Diko's Assurances SARL", 14, 14)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Rapport Financier — Finance Tracker', 14, 22)
    doc.setTextColor(150, 150, 150)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 150, 22)

    // Summary box
    doc.setTextColor(...navy)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Résumé', 14, 42)
    if (summary) {
      const rows = [
        ['Entrées totales',    formatAmount(summary.total_income,   'XAF')],
        ['Sorties totales',    formatAmount(summary.total_expenses, 'XAF')],
        ['Solde net',          formatAmount(summary.net_balance,    'XAF')],
        ['Dépenses personnel', formatAmount(summary.staff_spending, 'XAF')],
        ['Nb. transactions',   summary.transaction_count.toString()],
      ]
      autoTable(doc, {
        startY: 46, head: [['Indicateur', 'Valeur']], body: rows,
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: navy, textColor: gold, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 240, 232] },
        margin: { left: 14, right: 14 },
      })
    }

    // Transactions table
    let y = doc.lastAutoTable?.finalY + 12 || 100
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Détail des transactions', 14, y)
    autoTable(doc, {
      startY: y + 4,
      head: [['Date', 'Référence', 'Description', 'Catégorie', 'Saisi par', 'Type', 'Montant']],
      body: txs.map(tx => [
        formatDate(tx.date),
        tx.reference,
        (tx.description || '').slice(0, 30),
        tx.category,
        tx.created_by_user?.full_name || '—',
        tx.type === 'income' ? 'Entrée' : 'Sortie',
        (tx.type === 'expense' ? '-' : '+') + formatAmount(tx.amount, tx.currency),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: navy, textColor: gold, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 246, 240] },
      columnStyles: { 6: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Page ${i} / ${pageCount}  —  Diko's Assurances SARL  —  Courtier agréé Chanas Assurances S.A.`, 14, doc.internal.pageSize.height - 8)
    }

    doc.save(`dikos-finance-rapport-${todayISO()}.pdf`)
    show('Rapport PDF téléchargé ✓')
  }

  // ── Excel Export ───────────────────────────────
  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const { data: txs } = await transactionsAPI.list({ limit: 1000, ...(dateFrom && { date_from: dateFrom }), ...(dateTo && { date_to: dateTo }) })

    const rows = txs.map(tx => ({
      'Date':         tx.date,
      'Référence':    tx.reference,
      'Type':         tx.type === 'income' ? 'Entrée' : 'Sortie',
      'Catégorie':    tx.category,
      'Description':  tx.description || '',
      'Client':       tx.customer?.full_name || '',
      'Collaborateur':tx.worker_name || '',
      'Saisi par':    tx.created_by_user?.full_name || '',
      'Montant':      tx.type === 'expense' ? -tx.amount : tx.amount,
      'Devise':       tx.currency,
      'Note':         tx.note || '',
    }))

    const ws   = XLSX.utils.json_to_sheet(rows)
    const wb   = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions')

    // Summary sheet
    if (summary) {
      const sumRows = [
        { Indicateur: 'Entrées totales',    Valeur: summary.total_income },
        { Indicateur: 'Sorties totales',    Valeur: summary.total_expenses },
        { Indicateur: 'Solde net',          Valeur: summary.net_balance },
        { Indicateur: 'Dépenses personnel', Valeur: summary.staff_spending },
      ]
      const ws2 = XLSX.utils.json_to_sheet(sumRows)
      XLSX.utils.book_append_sheet(wb, ws2, 'Résumé')
    }

    XLSX.writeFile(wb, `dikos-finance-${todayISO()}.xlsx`)
    show('Fichier Excel téléchargé ✓')
  }

  // ── Daily cash submit ──────────────────────────
  const submitCash = async () => {
    setCashLoading(true)
    try {
      if (cashMode === 'open') {
        await reportsAPI.openDay({ date: cashDate, opening_balance: parseFloat(openBal), note: '' })
        show('Caisse ouverte ✓')
      } else {
        await reportsAPI.closeDay(cashDate, { closing_balance: parseFloat(closeBal) })
        show('Caisse clôturée ✓')
      }
      setCashModal(false); setOpenBal(''); setCloseBal(''); load()
    } catch (e) {
      show(e.response?.data?.detail || 'Erreur', 'error')
    } finally {
      setCashLoading(false)
    }
  }

  const allCats = { ...INCOME_CATS, ...EXPENSE_CATS }

  return (
    <div className="page-content">
      {ToastEl}

      <div className="page-header">
        <div className="page-eyebrow"><span className="eyebrow-line" />Analyse & exports</div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <h1>Rapports <em>financiers</em></h1>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-outline" onClick={() => { setCashMode('open'); setCashModal(true) }}>
              Ouvrir caisse
            </button>
            <button className="btn btn-outline" onClick={() => { setCashMode('close'); setCashModal(true) }}>
              Clôturer caisse
            </button>
            <button className="btn btn-outline" onClick={exportExcel}>⬇ Excel</button>
            <button className="btn btn-primary" onClick={exportPDF}>⬇ PDF</button>
          </div>
        </div>
      </div>

      {/* Date filter */}
      <div style={{ display:'flex', gap:16, marginBottom:36, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div className="form-group" style={{ marginBottom:0 }}>
          <label>Du</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width:180 }} />
        </div>
        <div className="form-group" style={{ marginBottom:0 }}>
          <label>Au</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width:180 }} />
        </div>
        {(dateFrom || dateTo) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setDateFrom(''); setDateTo('') }}>
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* KPI cards */}
      {summary && (
        <div className="summary-grid" style={{ marginBottom:40 }}>
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
            <div className="summary-sub">{summary.transaction_count} opérations</div>
          </div>
        </div>
      )}

      {/* Category breakdown table */}
      <div className="section-label">Dépenses par catégorie</div>
      <div className="table-wrap" style={{ marginBottom:40 }}>
        <table>
          <thead>
            <tr>
              <th>Catégorie</th>
              <th className="right">Transactions</th>
              <th className="right">Total</th>
              <th className="right">% du total</th>
              <th style={{ width:200 }}>Proportion</th>
            </tr>
          </thead>
          <tbody>
            {byCat.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><p>Aucune donnée</p></div></td></tr>
            ) : byCat.map(c => {
              const def = EXPENSE_CATS[c.category] || EXPENSE_CATS.autre
              return (
                <tr key={c.category}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, background:def.color, flexShrink:0 }} />
                      <span>{def.label}</span>
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

      {/* Worker breakdown table */}
      <div className="section-label">Dépenses par collaborateur</div>
      <div className="table-wrap" style={{ marginBottom:40 }}>
        <table>
          <thead>
            <tr>
              <th>Collaborateur</th>
              <th className="right">Transactions</th>
              <th className="right">Total dépensé</th>
              <th>Catégorie principale</th>
            </tr>
          </thead>
          <tbody>
            {byWorker.length === 0 ? (
              <tr><td colSpan={4}><div className="empty-state"><p>Aucune donnée</p></div></td></tr>
            ) : byWorker.map(w => {
              const topCat = w.categories[0]
              const def    = topCat ? (EXPENSE_CATS[topCat.category] || EXPENSE_CATS.autre) : null
              return (
                <tr key={w.worker_name}>
                  <td><span style={{ fontFamily:'var(--font-serif)', fontSize:15, fontWeight:500 }}>{w.worker_name}</span></td>
                  <td className="right td-muted">{w.count}</td>
                  <td className="right"><span className="td-amount expense">{formatAmount(w.total,'XAF')}</span></td>
                  <td>
                    {def && <span className={`badge ${def.badge}`}>{def.label}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Daily cash register */}
      <div className="section-label">Registre de caisse — 30 derniers jours</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th className="right">Ouverture</th>
              <th className="right">Clôture</th>
              <th className="right">Écart</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {dailyCash.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><p>Aucune caisse enregistrée</p><span>Cliquez sur "Ouvrir caisse" pour commencer</span></div></td></tr>
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
                      ? <span className="badge badge-income">Clôturée</span>
                      : <span style={{ fontSize:10, color:'var(--gold)', letterSpacing:'1px', textTransform:'uppercase' }}>En cours</span>
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
            <div className="modal-eyebrow">Caisse journalière</div>
            <h2>{cashMode === 'open' ? 'Ouvrir la caisse' : 'Clôturer la caisse'}</h2>

            <div className="form-group">
              <label>Date</label>
              <input type="date" value={cashDate} onChange={e => setCashDate(e.target.value)} />
            </div>

            {cashMode === 'open' ? (
              <div className="form-group">
                <label>Solde d'ouverture (XAF)</label>
                <input type="number" value={openBal} onChange={e => setOpenBal(e.target.value)} placeholder="Montant en caisse ce matin" min="0" />
              </div>
            ) : (
              <div className="form-group">
                <label>Solde de clôture (XAF)</label>
                <input type="number" value={closeBal} onChange={e => setCloseBal(e.target.value)} placeholder="Montant en caisse ce soir" min="0" />
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-primary" style={{ flex:1 }} onClick={submitCash} disabled={cashLoading}>
                {cashLoading ? 'Enregistrement...' : cashMode === 'open' ? 'Ouvrir la caisse' : 'Clôturer la journée'}
              </button>
              <button className="btn btn-outline" onClick={() => setCashModal(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
