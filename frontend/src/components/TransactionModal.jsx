import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { transactionsAPI, customersAPI } from '../api/endpoints'
import { EXPENSE_CATS, INCOME_CATS, CURRENCIES, todayISO, genRef } from '../api/utils'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'

const TVA_RATE = 0.1925

export default function TransactionModal({ onClose, onSaved, initial = null, defaultType = 'income' }) {
  const { isManager, user } = useAuth()
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const isEdit = !!initial

  const [type,             setType]            = useState(initial?.type || defaultType || 'income')
  const [date,             setDate]            = useState(initial?.date || todayISO())
  const [reference,        setReference]       = useState(initial?.reference || genRef())
  const [amount,           setAmount]          = useState(initial?.amount || '')
  const [currency,         setCurrency]        = useState(initial?.currency || 'XAF')
  const [category,         setCategory]        = useState(initial?.category || (defaultType === 'expense' ? 'transport' : 'prime'))
  const [description,      setDescription]     = useState(initial?.description || '')
  const [note,             setNote]            = useState(initial?.note || '')
  const [customerId,       setCustomerId]      = useState(initial?.customer_id || '')
  const [workerName,       setWorkerName]      = useState(initial?.worker_name || '')
  const [paymentMethod,    setPaymentMethod]   = useState(initial?.payment_method || 'cash')
  const [isTvaApplicable,  setIsTvaApplicable] = useState(initial?.is_tva_applicable ?? true)
  const [tvaAmount,        setTvaAmount]       = useState(initial?.tva_amount || 0)
  const [customers,        setCustomers]       = useState([])
  const [loading,          setLoading]         = useState(false)
  const [error,            setError]           = useState('')

  useEffect(() => {
    customersAPI.list().then(r => setCustomers(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) setCategory(type === 'income' ? 'prime' : 'transport')
  }, [type])

  // Auto-calculate TVA when amount changes
  useEffect(() => {
    if (isTvaApplicable && amount && parseFloat(amount) > 0) {
      const computed = parseFloat((parseFloat(amount) * TVA_RATE / (1 + TVA_RATE)).toFixed(2))
      setTvaAmount(computed)
    } else {
      setTvaAmount(0)
    }
  }, [amount, isTvaApplicable])

  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) { setError(t('modal_err_amount')); return }
    if (!description.trim()) { setError(t('modal_err_desc')); return }
    setLoading(true); setError('')
    const payload = {
      reference, date, type, category,
      amount:            parseFloat(amount),
      currency,
      description,
      note:              note || null,
      customer_id:       customerId ? parseInt(customerId) : null,
      worker_name:       type === 'expense' ? (workerName || user?.full_name) : null,
      payment_method:    paymentMethod,
      is_tva_applicable: isTvaApplicable,
      tva_amount:        isTvaApplicable ? tvaAmount : 0,
    }
    try {
      if (isEdit) await transactionsAPI.update(initial.id, payload)
      else        await transactionsAPI.create(payload)
      onSaved()
    } catch (e) {
      setError(e.response?.data?.detail || t('modal_err_save'))
    } finally {
      setLoading(false)
    }
  }

  const catOptions = type === 'income' ? INCOME_CATS : EXPENSE_CATS

  return createPortal(
    <div
      style={{
        position:'fixed', inset:0, top:0, left:0, right:0, bottom:0,
        width:'100vw', height:'100vh',
        background:'rgba(5,10,22,0.88)',
        zIndex:9999,
        display:'flex', alignItems:'flex-start', justifyContent:'center',
        padding:'40px 20px', overflowY:'auto',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:'var(--navy-light)', border:'1px solid var(--navy-border)',
        width:'100%', maxWidth:540, padding:40, position:'relative', margin:'auto',
      }}>
        <button
          onClick={onClose}
          style={{ position:'absolute', top:16, right:16, background:'none', border:'none', color:'var(--muted)', fontSize:22, cursor:'pointer', lineHeight:1 }}
        >x</button>

        <div style={{ fontSize:10, letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--gold)', marginBottom:8 }}>
          {isEdit ? t('modal_edit_eyebrow') : t('modal_new_eyebrow')}
        </div>
        <h2 style={{ fontFamily:'var(--font-serif)', fontSize:28, fontWeight:400, marginBottom:28 }}>
          {isEdit ? t('modal_edit_title') : t('modal_new_title')}
        </h2>

        <div className="form-group">
          <label>{t('modal_type')}</label>
          <div className="type-toggle">
            <button
              className={'type-opt income ' + (type === 'income' ? 'active' : '')}
              onClick={() => setType('income')}
              disabled={isEdit && !isManager}
            >{t('modal_type_in')}</button>
            <button
              className={'type-opt expense ' + (type === 'expense' ? 'active' : '')}
              onClick={() => setType('expense')}
              disabled={isEdit && !isManager}
            >{t('modal_type_out')}</button>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('modal_date')}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>{t('modal_ref')}</label>
            <input value={reference} onChange={e => setReference(e.target.value)} />
          </div>
        </div>

        {type === 'income' && (
          <div className="form-group">
            <label>{t('modal_customer')}</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">{t('modal_customer_placeholder')}</option>
              {customers.filter(c => c.is_active !== false).map(c => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>
        )}

        {type === 'expense' && isManager && (
          <div className="form-group">
            <label>{t('modal_worker')}</label>
            <input
              value={workerName}
              onChange={e => setWorkerName(e.target.value)}
              placeholder={user?.full_name}
            />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>{t('modal_category')}</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {Object.entries(catOptions).map(([k, v]) => (
                <option key={k} value={k}>{lang === 'fr' ? v.label : (v.labelEn || v.label)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{t('modal_currency')}</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>{t('modal_payment_method')}</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option value="cash">{t('modal_payment_cash')}</option>
            <option value="transfer">{t('modal_payment_transfer')}</option>
            <option value="mobile_money">{t('modal_payment_mobile')}</option>
            <option value="cheque">{t('modal_payment_cheque')}</option>
            <option value="card">{t('modal_payment_card')}</option>
          </select>
        </div>

        <div className="form-group">
          <label>{t('modal_amount')}</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" step="0.01" />
        </div>

        {/* TVA section */}
        <div style={{ background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.2)', padding:'16px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: isTvaApplicable ? 12 : 0 }}>
            <label style={{ margin:0, fontSize:12, letterSpacing:'1px', textTransform:'uppercase', color:'var(--gold)' }}>
              {t('modal_tva_label')}
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', margin:0 }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>
                {isTvaApplicable ? t('modal_tva_on') : t('modal_tva_off')}
              </span>
              <div
                onClick={() => setIsTvaApplicable(v => !v)}
                style={{
                  width:36, height:20, borderRadius:10, cursor:'pointer',
                  background: isTvaApplicable ? 'var(--gold)' : 'var(--navy-border)',
                  position:'relative', transition:'background 0.2s',
                }}
              >
                <div style={{
                  position:'absolute', top:2,
                  left: isTvaApplicable ? 18 : 2,
                  width:16, height:16, borderRadius:'50%',
                  background:'var(--white)', transition:'left 0.2s',
                }} />
              </div>
            </label>
          </div>
          {isTvaApplicable && (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div className="form-group" style={{ flex:1, marginBottom:0 }}>
                <label style={{ fontSize:11 }}>{t('modal_tva_amount')} (19.25%)</label>
                <input
                  type="number"
                  value={tvaAmount}
                  onChange={e => setTvaAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div style={{ fontSize:11, color:'var(--muted)', paddingTop:20 }}>
                {t('modal_tva_excl')}:{' '}
                <span style={{ color:'var(--white)', fontFamily:'var(--font-serif)', fontSize:14 }}>
                  {amount ? (parseFloat(amount) - tvaAmount).toLocaleString() : '0'} {currency}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>{t('modal_desc')}</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder={t('modal_desc_placeholder')} />
        </div>

        <div className="form-group">
          <label>{t('modal_note')}</label>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={t('modal_note_placeholder')} />
        </div>

        {error && <p style={{ fontSize:12, color:'var(--red)', marginBottom:12 }}>! {error}</p>}

        <div style={{ display:'flex', gap:12, marginTop:8 }}>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={loading}>
            {loading ? t('modal_saving') : isEdit ? t('modal_update') : t('modal_save')}
          </button>
          <button className="btn btn-outline" onClick={onClose}>{t('modal_cancel')}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
