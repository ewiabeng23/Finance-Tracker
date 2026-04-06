import { useState, useEffect } from 'react'
import { transactionsAPI } from '../api/endpoints'
import { formatAmount, formatAmountPDF, formatDate, getCatBadge, getCatLabel, EXPENSE_CATS, INCOME_CATS } from '../api/utils'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'
import TransactionModal from '../components/TransactionModal'
import { useToast } from '../hooks/useToast'

const NIU = 'M2466666'

export default function TransactionsPage() {
  const { isManager } = useAuth()
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const { show, ToastEl } = useToast()
  const [transactions, setTransactions] = useState([])
  const [filter,       setFilter]       = useState('all')
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState('all')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [editing,      setEditing]      = useState(null)

  const load = async () => {
    setLoading(true)
    const params = {}
    if (filter !== 'all') params.type = filter
    if (search) params.search = search
    if (catFilter !== 'all') params.category = catFilter
    if (dateFrom) params.date_from = dateFrom
    if (dateTo)   params.date_to   = dateTo
    try {
      const { data } = await transactionsAPI.list(params)
      setTransactions(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter, search, catFilter, dateFrom, dateTo])

  const handleDelete = async (tx) => {
    if (!window.confirm(`${t('tx_confirm_del')} ${tx.reference}?`)) return
    await transactionsAPI.delete(tx.id)
    show(t('tx_deleted'), 'success')
    load()
  }

  const txsWithBalance = () => {
    let balance = 0
    return [...transactions].reverse().map(tx => {
      balance += tx.type === 'income' ? tx.amount : -tx.amount
      return { ...tx, runningBalance: balance }
    }).reverse()
  }

  const generateInvoice = async (tx) => {
    const { default: jsPDF } = await import('jspdf')
    const doc   = new jsPDF()
    const gold  = [201, 168, 76]
    const navy  = [11, 29, 58]
    const white = [245, 240, 232]

    doc.setFillColor(...navy)
    doc.rect(0, 0, 220, 48, 'F')
    doc.setFillColor(...gold)
    doc.rect(14, 8, 22, 22, 'F')
    doc.setTextColor(...navy)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('D', 22, 23)
    doc.setTextColor(...white)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text("Diko's Assurances SARL", 42, 16)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(lang === 'fr' ? 'Courtier agree — Chanas Assurances S.A.' : 'Accredited broker — Chanas Assurances S.A.', 42, 24)
    doc.text('Douala, Cameroun', 42, 31)
    doc.setTextColor(...gold)
    doc.text('NIU: ' + NIU, 42, 38)
    doc.setTextColor(...gold)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text(lang === 'fr' ? 'FACTURE' : 'INVOICE', 150, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...white)
    doc.text('N ' + tx.reference, 150, 30)

    doc.setFillColor(240, 237, 228)
    doc.rect(14, 58, 182, 40, 'F')
    doc.setTextColor(...navy)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(lang === 'fr' ? 'FACTURE A' : 'BILLED TO', 20, 68)
    doc.setFont('helvetica', 'normal')
    doc.text(tx.customer?.full_name || '—', 20, 76)
    if (tx.customer?.phone) doc.text(tx.customer.phone, 20, 83)
    if (tx.customer?.email) doc.text(tx.customer.email, 20, 90)
    doc.setFont('helvetica', 'bold')
    doc.text('DATE', 130, 68)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(tx.date, lang), 130, 76)
    doc.setFont('helvetica', 'bold')
    doc.text('REFERENCE', 130, 83)
    doc.setFont('helvetica', 'normal')
    doc.text(tx.reference, 130, 91)

    doc.setFillColor(...navy)
    doc.rect(14, 108, 182, 10, 'F')
    doc.setTextColor(...gold)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('DESCRIPTION', 20, 115)
    doc.text('CATEGORIE', 110, 115)
    doc.text('MONTANT', 165, 115)

    doc.setFillColor(252, 250, 245)
    doc.rect(14, 118, 182, 14, 'F')
    doc.setTextColor(...navy)
    doc.setFont('helvetica', 'normal')
    doc.text(tx.description || '—', 20, 127)
    doc.text(getCatLabel(tx.category, tx.type, lang), 110, 127)
    doc.setFont('helvetica', 'bold')
    doc.text(formatAmountPDF(tx.amount, tx.currency), 165, 127)

    doc.setFillColor(...navy)
    doc.rect(120, 143, 76, 18, 'F')
    doc.setTextColor(...gold)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL', 130, 154)
    doc.text(formatAmountPDF(tx.amount, tx.currency), 165, 154)

    if (tx.tva_amount && tx.tva_amount > 0) {
      doc.setFillColor(245, 240, 232)
      doc.rect(120, 163, 76, 12, 'F')
      doc.setTextColor(...navy)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('TVA (19.25%): ' + formatAmountPDF(tx.tva_amount, tx.currency), 124, 171)
    }

    if (tx.note) {
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.text('Note: ' + tx.note, 14, 185)
    }

    doc.setFillColor(...navy)
    doc.rect(0, 270, 220, 30, 'F')
    doc.setTextColor(...gold)
    doc.setFontSize(9)
    doc.text("Diko's Assurances SARL  |  NIU: " + NIU, 14, 282)
    doc.setTextColor(...white)
    doc.text(lang === 'fr' ? 'Merci pour votre confiance.' : 'Thank you for your business.', 14, 289)
    doc.text((lang === 'fr' ? 'Genere le ' : 'Generated on ') + new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB'), 140, 289)

    doc.save('facture-' + tx.reference + '.pdf')
    show(lang === 'fr' ? 'Facture generee' : 'Invoice generated')
  }

  const generateReceipt = async (tx) => {
    const { default: jsPDF } = await import('jspdf')
    const doc   = new jsPDF()
    const gold  = [201, 168, 76]
    const navy  = [11, 29, 58]
    const white = [245, 240, 232]
    const red   = [224, 90, 78]

    doc.setFillColor(...navy)
    doc.rect(0, 0, 220, 48, 'F')
    doc.setFillColor(...gold)
    doc.rect(14, 8, 22, 22, 'F')
    doc.setTextColor(...navy)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('D', 22, 23)
    doc.setTextColor(...white)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text("Diko's Assurances SARL", 42, 16)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(lang === 'fr' ? 'Courtier agree — Chanas Assurances S.A.' : 'Accredited broker — Chanas Assurances S.A.', 42, 24)
    doc.text('Douala, Cameroun', 42, 31)
    doc.setTextColor(...gold)
    doc.text('NIU: ' + NIU, 42, 38)
    doc.setTextColor(...red)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(lang === 'fr' ? 'RECU DE DEPENSE' : 'EXPENSE RECEIPT', 110, 20)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...white)
    doc.text('N ' + tx.reference, 140, 30)

    doc.setFillColor(240, 237, 228)
    doc.rect(14, 58, 182, 55, 'F')
    doc.setTextColor(...navy)
    doc.setFontSize(10)
    const rows = [
      [lang === 'fr' ? 'Collaborateur' : 'Staff member', tx.worker_name || '—'],
      ['Date', formatDate(tx.date, lang)],
      [lang === 'fr' ? 'Categorie' : 'Category', getCatLabel(tx.category, tx.type, lang)],
      ['Description', tx.description || '—'],
      ['Reference', tx.reference],
    ]
    rows.forEach(([label, value], i) => {
      doc.setFont('helvetica', 'bold')
      doc.text(label, 20, 71 + i * 9)
      doc.setFont('helvetica', 'normal')
      doc.text(value, 90, 71 + i * 9)
    })

    doc.setFillColor(...navy)
    doc.rect(14, 123, 182, 22, 'F')
    doc.setTextColor(...white)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(lang === 'fr' ? 'MONTANT TOTAL' : 'TOTAL AMOUNT', 20, 137)
    doc.setTextColor(...red)
    doc.setFontSize(16)
    doc.text(formatAmountPDF(tx.amount, tx.currency), 130, 137)

    if (tx.tva_amount && tx.tva_amount > 0) {
      doc.setFillColor(245, 240, 232)
      doc.rect(14, 147, 182, 12, 'F')
      doc.setTextColor(...navy)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('TVA (19.25%): ' + formatAmountPDF(tx.tva_amount, tx.currency), 20, 155)
    }

    if (tx.note) {
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.text('Note: ' + tx.note, 14, 168)
    }

    doc.setFillColor(...navy)
    doc.rect(0, 270, 220, 30, 'F')
    doc.setTextColor(...gold)
    doc.setFontSize(9)
    doc.text("Diko's Assurances SARL  |  NIU: " + NIU, 14, 282)
    doc.setTextColor(...white)
    doc.text((lang === 'fr' ? 'Genere le ' : 'Generated on ') + new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB'), 140, 289)

    doc.save('recu-' + tx.reference + '.pdf')
    show(lang === 'fr' ? 'Recu genere' : 'Receipt generated')
  }

  const allCats = { ...INCOME_CATS, ...EXPENSE_CATS }
  const txsBalanced = txsWithBalance()

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

      <div className="filter-bar" style={{ marginBottom:12 }}>
        <div className="filter-tabs">
          {[['all', t('tx_filter_all')], ['income', t('tx_filter_in')], ['expense', t('tx_filter_out')]].map(([v,l]) => (
            <button key={v} className={'filter-tab ' + (filter===v ? 'active' : '')} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <div className="search-wrap">
          <span className="search-icon">&#8981;</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('tx_search')} style={{ width:200 }} />
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

      <div style={{ display:'flex', gap:16, marginBottom:24, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div className="form-group" style={{ marginBottom:0 }}>
          <label style={{ fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)' }}>
            {lang === 'fr' ? 'Du' : 'From'}
          </label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width:160 }} />
        </div>
        <div className="form-group" style={{ marginBottom:0 }}>
          <label style={{ fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)' }}>
            {lang === 'fr' ? 'Au' : 'To'}
          </label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width:160 }} />
        </div>
        {(dateFrom || dateTo) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setDateFrom(''); setDateTo('') }}>
            x {lang === 'fr' ? 'Reinitialiser' : 'Reset'}
          </button>
        )}
        <div style={{ marginLeft:'auto', fontSize:12, color:'var(--muted)' }}>
          {transactions.length} {lang === 'fr' ? 'transaction(s)' : 'transaction(s)'}
        </div>
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
              <th className="right">{lang === 'fr' ? 'Solde' : 'Balance'}</th>
              <th className="right">{t('tx_col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>{t('dash_loading')}</td></tr>
            ) : txsBalanced.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="empty-state">
                  <p>{t('tx_empty')}</p>
                  <span>{t('tx_empty_sub')}</span>
                </div>
              </td></tr>
            ) : txsBalanced.map(tx => (
              <tr key={tx.id}>
                <td className="td-muted">{formatDate(tx.date, lang)}</td>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span className="td-serif">{tx.reference}</span>
                    {tx.attachment_url && (
                      <button
                        onClick={() => window.open(tx.attachment_url)}
                        title={lang === 'fr' ? 'Voir la piece jointe' : 'View attachment'}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:0, fontSize:13, color:'var(--gold)', lineHeight:1 }}
                      >&#128206;</button>
                    )}
                  </div>
                </td>
                <td>
                  {tx.type === 'income'
                    ? <span style={{ color:'var(--white-dim)' }}>{tx.customer?.full_name || '—'}</span>
                    : <span style={{ color:'var(--gold-dim)', fontSize:12 }}>{tx.worker_name || '—'}</span>
                  }
                </td>
                <td style={{ color:'var(--white-dim)', maxWidth:180 }}>{tx.description || '—'}</td>
                <td><span className={'badge ' + getCatBadge(tx.category, tx.type)}>{getCatLabel(tx.category, tx.type, lang)}</span></td>
                <td className="td-muted">{tx.created_by_user?.full_name || '—'}</td>
                <td>
                  <span className={'badge ' + (tx.type === 'income' ? 'badge-income' : 'badge-expense')}>
                    {tx.type === 'income' ? t('tx_badge_in') : t('tx_badge_out')}
                  </span>
                </td>
                <td className="right">
                  <span className={'td-amount ' + tx.type}>
                    {tx.type === 'expense' ? '−' : '+'}{formatAmount(tx.amount, tx.currency)}
                  </span>
                </td>
                <td className="right">
                  <span style={{
                    fontFamily:'var(--font-serif)', fontSize:15, fontWeight:500,
                    color: tx.runningBalance >= 0 ? 'var(--green)' : 'var(--red)'
                  }}>
                    {formatAmount(tx.runningBalance, 'XAF')}
                  </span>
                </td>
                <td className="right">
                  <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                    {tx.type === 'income' && (
                      <button className="btn btn-outline btn-sm" onClick={() => generateInvoice(tx)}>
                        {lang === 'fr' ? 'Facture' : 'Invoice'}
                      </button>
                    )}
                    {tx.type === 'expense' && (
                      <button className="btn btn-outline btn-sm" onClick={() => generateReceipt(tx)}>
                        {lang === 'fr' ? 'Recu' : 'Receipt'}
                      </button>
                    )}
                    {isManager && (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditing(tx); setShowModal(true) }}>{t('tx_edit')}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tx)}>{t('tx_delete')}</button>
                      </>
                    )}
                  </div>
                </td>
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
