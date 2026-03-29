import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { transactionsAPI, customersAPI } from '../api/endpoints'
import { EXPENSE_CATS, INCOME_CATS, CURRENCIES, todayISO, genRef } from '../api/utils'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'

const TVA_RATE     = 0.1925
const SUPABASE_URL = 'https://jolguqquqzipepgubsur.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvbGd1cXF1cXppcGVwZ3Vic3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NzA0MDMsImV4cCI6MjA4OTE0NjQwM30.pBcDqtJrhxROUrRZNFt4HIjjEMzGfMkbp_IC5JxNwxE'

async function uploadReceipt(file) {
  const ext      = file.name.split('.').pop()
  const filename = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext
  const res = await fetch(SUPABASE_URL + '/storage/v1/object/receipts/' + filename, {
    method:  'POST',
    headers: {
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type':  file.type,
      'x-upsert':      'true',
    },
    body: file,
  })
  if (!res.ok) throw new Error('Upload failed')
  return SUPABASE_URL + '/storage/v1/object/public/receipts/' + filename
}

export default function TransactionModal({ onClose, onSaved, initial = null, defaultType = 'income' }) {
  const { isManager, user } = useAuth()
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const isEdit = !!initial

  const [type,             setType]             = useState(initial?.type || defaultType || 'income')
  const [date,             setDate]             = useState(initial?.date || todayISO())
  const [reference,        setReference]        = useState(initial?.reference || genRef())
  const [amount,           setAmount]           = useState(initial?.amount || '')
  const [currency,         setCurrency]         = useState(initial?.currency || 'XAF')
  const [category,         setCategory]         = useState(initial?.category || (defaultType === 'expense' ? 'transport' : 'prime'))
  const [description,      setDescription]      = useState(initial?.description || '')
  const [note,             setNote]             = useState(initial?.note || '')
  const [customerId,       setCustomerId]       = useState(initial?.customer_id || '')
  const [workerName,       setWorkerName]       = useState(initial?.worker_name || '')
  const [paymentMethod,    setPaymentMethod]    = useState(initial?.payment_method || 'cash')
  const [isTvaApplicable,  setIsTvaApplicable]  = useState(initial?.is_tva_applicable ?? true)
  const [tvaAmount,        setTvaAmount]        = useState(initial?.tva_amount || 0)
  const [tvaManual,        setTvaManual]        = useState(false)
  const [attachmentUrl,    setAttachmentUrl]    = useState(initial?.attachment_url || '')
  const [uploadFile,       setUploadFile]       = useState(null)
  const [uploadPreview,    setUploadPreview]    = useState(initial?.attachment_url || '')
  const [uploading,        setUploading]        = useState(false)
  const [customers,        setCustomers]        = useState([])
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')

  useEffect(() => {
    customersAPI.list().then(r => setCustomers(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit) setCategory(type === 'income' ? 'prime' : 'transport')
  }, [type])

  useEffect(() => {
    if (!tvaManual && isTvaApplicable && amount && parseFloat(amount) > 0) {
      setTvaAmount(parseFloat((parseFloat(amount) * TVA_RATE).toFixed(2)))
    }
    if (!isTvaApplicable) setTvaAmount(0)
  }, [amount, isTvaApplicable, tvaManual])

  const handleTvaChange = (val) => {
    setTvaManual(true)
    setTvaAmount(parseFloat(val) || 0)
  }

  const handleAmountChange = (val) => {
    setAmount(val)
    setTvaManual(false)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadFile(file)
    if (file.type.startsWith('image/')) {
      setUploadPreview(URL.createObjectURL(file))
    } else {
      setUploadPreview('pdf')
    }
  }

  const removeAttachment = () => {
    setUploadFile(null)
    setUploadPreview('')
    setAttachmentUrl('')
  }

  const openAttachment = () => {
    if (attachmentUrl) window.open(attachmentUrl)
  }

  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) { setError(t('modal_err_amount')); return }
    if (!description.trim()) { setError(t('modal_err_desc')); return }

    // Block workers from submitting past dates on new transactions
    if (!isManager && !isEdit && date < todayISO()) {
      setError(lang === 'fr' ? 'Les collaborateurs ne peuvent pas saisir une date passee' : 'Staff cannot record transactions with a past date')
      return
    }

    setLoading(true); setError('')

    let finalUrl = attachmentUrl
    if (uploadFile) {
      setUploading(true)
      try {
        finalUrl = await uploadReceipt(uploadFile)
        setAttachmentUrl(finalUrl)
      } catch (e) {
        setError(lang === 'fr' ? 'Erreur chargement fichier' : 'File upload failed')
        setLoading(false); setUploading(false); return
      }
      setUploading(false)
    }

    const payload = {
      reference, date, type, category,
      amount:            parseFloat(amount),
      currency,
      description,
      note:              note || null,
      customer_id:       customerId ? parseInt(customerId) : null,
      worker_name:       type === 'expense' ? (workerName || user?.full_name) : null,
      payment_method:    paymentMethod,
      tva_amount:        isTvaApplicable ? tvaAmount : 0,
      is_tva_applicable: isTvaApplicable,
      attachment_url:    finalUrl || null,
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
            <label>
              {t('modal_date')}
              {!isManager && !isEdit && (
                <span style={{ fontSize:10, color:'var(--muted)', marginLeft:8 }}>
                  {lang === 'fr' ? '(aujourd\'hui uniquement)' : '(today only)'}
                </span>
              )}
            </label>
            <input
              type="date"
              value={date}
              min={!isManager && !isEdit ? todayISO() : undefined}
              max={!isManager && !isEdit ? todayISO() : undefined}
              onChange={e => setDate(e.target.value)}
            />
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
          <input
            type="number"
            value={amount}
            onChange={e => handleAmountChange(e.target.value)}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>

        <div style={{
          background:'var(--navy)', border:'1px solid var(--navy-border)',
          borderLeft:'3px solid var(--gold)', padding:'16px 20px', marginBottom:20,
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: isTvaApplicable ? 14 : 0 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:500, marginBottom:2 }}>
                {lang === 'fr' ? 'TVA applicable (19.25%)' : 'TVA applicable (19.25%)'}
              </div>
              {!isTvaApplicable && (
                <div style={{ fontSize:11, color:'var(--muted)' }}>
                  {lang === 'fr' ? 'Cette transaction est hors TVA' : 'This transaction is exempt from TVA'}
                </div>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>
                {isTvaApplicable ? (lang === 'fr' ? 'Oui' : 'Yes') : (lang === 'fr' ? 'Non' : 'No')}
              </span>
              <div
                onClick={() => { setIsTvaApplicable(!isTvaApplicable); setTvaManual(false) }}
                style={{
                  width:36, height:20, borderRadius:10,
                  background: isTvaApplicable ? 'var(--gold)' : 'var(--navy-border)',
                  position:'relative', cursor:'pointer', transition:'background 0.2s',
                }}
              >
                <div style={{
                  position:'absolute', top:2,
                  left: isTvaApplicable ? 18 : 2,
                  width:16, height:16, borderRadius:'50%',
                  background:'var(--white)', transition:'left 0.2s',
                }} />
              </div>
            </div>
          </div>

          {isTvaApplicable && (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, color:'var(--muted)', marginBottom:6 }}>
                  {lang === 'fr' ? 'Montant TVA' : 'TVA amount'}
                  {!tvaManual && amount && parseFloat(amount) > 0 && (
                    <span style={{ color:'var(--gold)', marginLeft:8 }}>
                      {lang === 'fr' ? '(calcule automatiquement)' : '(auto-calculated)'}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  value={tvaAmount}
                  onChange={e => handleTvaChange(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  style={{ width:'100%' }}
                />
              </div>
              {amount && parseFloat(amount) > 0 && (
                <div style={{ fontSize:11, color:'var(--muted)', textAlign:'center', minWidth:80 }}>
                  <div style={{ color:'var(--gold)', fontFamily:'var(--font-serif)', fontSize:15 }}>
                    {((tvaAmount / parseFloat(amount)) * 100).toFixed(1)}%
                  </div>
                  <div>{lang === 'fr' ? 'du montant' : 'of amount'}</div>
                </div>
              )}
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

        <div className="form-group">
          <label>{lang === 'fr' ? 'Piece justificative (optionnel)' : 'Receipt / attachment (optional)'}</label>
          {!uploadPreview ? (
            <label style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              border:'1px dashed var(--navy-border)', padding:'18px 20px',
              cursor:'pointer', color:'var(--muted)', fontSize:13,
              transition:'border-color 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--navy-border)'}
            >
              <span style={{ fontSize:20 }}>&#128206;</span>
              <span>{lang === 'fr' ? 'Cliquez pour joindre une photo ou un PDF' : 'Click to attach a photo or PDF'}</span>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                style={{ display:'none' }}
              />
            </label>
          ) : (
            <div style={{ position:'relative', border:'1px solid var(--navy-border)', padding:12 }}>
              {uploadPreview === 'pdf' ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 4px' }}>
                  <span style={{ fontSize:24 }}>&#128196;</span>
                  <span style={{ fontSize:13, color:'var(--white-dim)' }}>{uploadFile?.name || 'PDF attachment'}</span>
                </div>
              ) : (
                <img
                  src={uploadPreview}
                  alt="receipt"
                  style={{ width:'100%', maxHeight:200, objectFit:'cover' }}
                />
              )}
              <button
                onClick={removeAttachment}
                style={{
                  position:'absolute', top:8, right:8,
                  background:'rgba(224,90,78,0.85)', border:'none',
                  color:'white', width:24, height:24, borderRadius:'50%',
                  cursor:'pointer', fontSize:14, lineHeight:1,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}
              >x</button>
              {attachmentUrl && !uploadFile && (
                <button
                  onClick={openAttachment}
                  style={{ display:'block', marginTop:8, fontSize:11, color:'var(--gold)', background:'none', border:'none', cursor:'pointer', padding:0 }}
                >
                  {lang === 'fr' ? 'Voir le fichier actuel' : 'View current file'}
                </button>
              )}
            </div>
          )}
        </div>

        {error && <p style={{ fontSize:12, color:'var(--red)', marginBottom:12 }}>! {error}</p>}

        <div style={{ display:'flex', gap:12, marginTop:8 }}>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={loading || uploading}>
            {uploading ? (lang === 'fr' ? 'Chargement...' : 'Uploading...') : loading ? t('modal_saving') : isEdit ? t('modal_update') : t('modal_save')}
          </button>
          <button className="btn btn-outline" onClick={onClose}>{t('modal_cancel')}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
