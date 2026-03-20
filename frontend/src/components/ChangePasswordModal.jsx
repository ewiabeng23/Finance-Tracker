import { useState } from 'react'
import { createPortal } from 'react-dom'
import { authAPI } from '../api/endpoints'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'

export default function ChangePasswordModal({ onClose }) {
  const { lang } = useLang()
  const t = k => TR[lang][k]

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const [success,         setSuccess]         = useState(false)

  const submit = async () => {
    setError('')
    if (!currentPassword)        { setError(t('pwd_err_current')); return }
    if (newPassword.length < 6)  { setError(t('pwd_err_length'));  return }
    if (newPassword !== confirmPassword) { setError(t('pwd_err_match')); return }
    setLoading(true)
    try {
      await authAPI.changePassword({ current_password: currentPassword, new_password: newPassword })
      setSuccess(true)
      setTimeout(onClose, 1800)
    } catch (e) {
      setError(e.response?.data?.detail || t('pwd_err_save'))
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      style={{
        position:'fixed', inset:0,
        width:'100vw', height:'100vh',
        background:'rgba(5,10,22,0.88)',
        zIndex:9999,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'40px 20px',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background:'var(--navy-light)', border:'1px solid var(--navy-border)',
        width:'100%', maxWidth:420, padding:40, position:'relative',
      }}>
        <button
          onClick={onClose}
          style={{ position:'absolute', top:16, right:16, background:'none', border:'none', color:'var(--muted)', fontSize:22, cursor:'pointer', lineHeight:1 }}
        >x</button>

        <div style={{ fontSize:10, letterSpacing:'2.5px', textTransform:'uppercase', color:'var(--gold)', marginBottom:8 }}>
          {t('pwd_eyebrow')}
        </div>
        <h2 style={{ fontFamily:'var(--font-serif)', fontSize:26, fontWeight:400, marginBottom:28 }}>
          {t('pwd_title')}
        </h2>

        {success ? (
          <p style={{ color:'var(--green)', fontSize:14, textAlign:'center', padding:'20px 0' }}>
            ✓ {t('pwd_success')}
          </p>
        ) : (
          <>
            <div className="form-group">
              <label>{t('pwd_current')}</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="form-group">
              <label>{t('pwd_new')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="form-group">
              <label>{t('pwd_confirm')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p style={{ fontSize:12, color:'var(--red)', marginBottom:12 }}>! {error}</p>}

            <div style={{ display:'flex', gap:12, marginTop:8 }}>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={loading}>
                {loading ? t('pwd_saving') : t('pwd_save')}
              </button>
              <button className="btn btn-outline" onClick={onClose}>{t('modal_cancel')}</button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
