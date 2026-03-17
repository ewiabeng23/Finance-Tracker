import { useState } from 'react'
import { createPortal } from 'react-dom'
import { customersAPI } from '../api/endpoints'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'

export default function CustomerModal({ onClose, onSaved, initial = null }) {
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const isEdit = !!initial

  const [fullName, setFullName] = useState(initial?.full_name || '')
  const [phone,    setPhone]    = useState(initial?.phone || '')
  const [email,    setEmail]    = useState(initial?.email || '')
  const [address,  setAddress]  = useState(initial?.address || '')
  const [note,     setNote]     = useState(initial?.note || '')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = async () => {
    if (!fullName.trim()) { setError(t('cust_modal_err_name')); return }
    setLoading(true); setError('')
    try {
      const payload = { full_name: fullName, phone, email, address, note }
      if (isEdit) await customersAPI.update(initial.id, payload)
      else        await customersAPI.create(payload)
      onSaved()
    } catch (e) {
      setError(e.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh',
        background: 'rgba(5,10,22,0.88)',
        zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '40px 20px', overflowY: 'auto',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--navy-light)', border: '1px solid var(--navy-border)',
        width: '100%', maxWidth: 540, padding: 40, position: 'relative', margin: 'auto',
      }}>
        <button
          onClick={onClose}
          style={{ position:'absolute', top:16, right:16, background:'none', border:'none', color:'var(--muted)', fontSize:22, cursor:'pointer', lineHeight:1 }}
        >×</button>

        <div style={{ fontSize:10, letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--gold)', marginBottom:8 }}>
          {isEdit ? t('cust_modal_edit_eyebrow') : t('cust_modal_new_eyebrow')}
        </div>
        <h2 style={{ fontFamily:'var(--font-serif)', fontSize:28, fontWeight:400, marginBottom:28 }}>
          {isEdit ? t('cust_modal_edit_title') : t('cust_modal_new_title')}
        </h2>

        <div className="form-group">
          <label>{t('cust_modal_name')}</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('cust_modal_name_placeholder')} autoFocus />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>{t('cust_modal_phone')}</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('cust_modal_phone_placeholder')} />
          </div>
          <div className="form-group">
            <label>{t('cust_modal_email')}</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" />
          </div>
        </div>
        <div className="form-group">
          <label>{t('cust_modal_address')}</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder={t('cust_modal_address_placeholder')} />
        </div>
        <div className="form-group">
          <label>{t('cust_modal_note')}</label>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="..." />
        </div>

        {error && <p style={{ fontSize:12, color:'var(--red)', marginBottom:12 }}>⚠ {error}</p>}

        <div style={{ display:'flex', gap:12, marginTop:8 }}>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={loading}>
            {loading ? t('cust_modal_saving') : isEdit ? t('cust_modal_update') : t('cust_modal_add')}
          </button>
          <button className="btn btn-outline" onClick={onClose}>{t('modal_cancel')}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
