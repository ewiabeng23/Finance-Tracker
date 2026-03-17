import { useState, useEffect } from 'react'
import { transactionsAPI, customersAPI } from '../api/endpoints'
import { EXPENSE_CATS, INCOME_CATS, CURRENCIES, todayISO, genRef } from '../api/utils'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'

export default function TransactionModal({ onClose, onSaved, initial = null }) {
  const { isManager, user } = useAuth()
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const isEdit = !!initial

  const [type,        setType]        = useState(initial?.type || 'income')
  const [date,        setDate]        = useState(initial?.date || todayISO())
  const [reference,   setReference]   = useState(initial?.reference || genRef())
  const [amount,      setAmount]      = useState(initial?.amount || '')
  const [currency,    setCurrency]    = useState(initial?.currency || 'XAF')
  const [category,    setCategory]    = useState(initial?.category || 'prime')
  const [description, setDescription] = useState(initial?.description || '')
  const [note,        setNote]        = useState(initial?.note || '')
  const [customerId,  setCustomerId]  = useState(initial?.customer_id || '')
  const [workerName,  setWorkerName]  = useState(initial?.worker_name || '')
  const [customers,   setCustomers]   = useState([])
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  useEffect(() => {
    customersAPI.list().then(r => setCustomers(r.data))
  }, [])

  useEffect(() => {
    if (!isEdit) setCategory(type === 'income' ? 'prime' : 'transport')
  }, [type])

  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) { setError(t('modal_err_amount')); return }
    if (!description.trim()) { setError(t('modal_err_desc')); return }
    setLoading(true); setError('')
    const payload = {
      reference, date, type, category,
      amount: parseFloat(amount), currency, description, note: note || null,
      customer_id: customerId ? parseInt(customerId) : null,
      worker_name: type === 'expense' ? (workerName || user?.full_name) : null,
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

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-eyebrow">{isEdit ? t('modal_edit_eyebrow') : t('modal_new_eyebrow')}</div>
        <h2>{isEdit ? t('modal_edit_title') : t('modal_new_title')}</h2>

        <div className="form-group">
          <label>{t('modal_type')}</label>
          <div className="type-toggle">
            <button
              className={`type-opt income ${type === 'income' ? 'active' : ''}`}
              onClick={() => setType('income')}
              disabled={isEdit && !isManager}
            >{t('modal_type_in')}</button>
            <button
              className={`type-opt expense ${type === 'expense' ? 'active' : ''}`}
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
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>
        )}

        {type === 'expense' && (
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
                <option key={k} value={k}>{lang === 'fr' ? v.label : v.labelEn}</option>
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
          <label>{t('modal_amount')}</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" step="0.01" />
        </div>

        <div className="form-group">
          <label>{t('modal_desc')}</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder={t('modal_desc_placeholder')} />
        </div>

        <div className="form-group">
          <label>{t('modal_note')}</label>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={t('modal_note_placeholder')} />
        </div>

        {error && <p className="form-error" style={{ marginBottom:12 }}>⚠ {error}</p>}

        <div className="modal-actions">
          <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={loading}>
            {loading ? t('modal_saving') : isEdit ? t('modal_update') : t('modal_save')}
          </button>
          <button className="btn btn-outline" onClick={onClose}>{t('modal_cancel')}</button>
        </div>
      </div>
    </div>
  )
}
