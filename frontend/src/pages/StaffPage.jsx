import { useState, useEffect } from 'react'
import { usersAPI } from '../api/endpoints'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'
import { useToast } from '../hooks/useToast'

function UserModal({ onClose, onSaved }) {
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState('worker')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = async () => {
    if (!fullName.trim()) { setError(t('user_modal_err_name')); return }
    if (!username.trim()) { setError(t('user_modal_err_username')); return }
    if (!password.trim()) { setError(t('user_modal_err_password')); return }
    setLoading(true); setError('')
    try {
      await usersAPI.create({ full_name: fullName, username, password, role })
      onSaved()
    } catch (e) {
      setError(e.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-eyebrow">{t('user_modal_new_eyebrow')}</div>
        <h2>{t('user_modal_new_title')}</h2>
        <div className="form-group">
          <label>{t('user_modal_name')}</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('user_modal_name_placeholder')} autoFocus />
        </div>
        <div className="form-group">
          <label>{t('user_modal_username')}</label>
          <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g,''))} placeholder={t('user_modal_username_placeholder')} />
        </div>
        <div className="form-group">
          <label>{t('user_modal_password')}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('user_modal_password_placeholder')} />
        </div>
        <div className="form-group">
          <label>{t('user_modal_role')}</label>
          <div className="type-toggle">
            <button className={`type-opt income ${role==='worker'?'active':''}`} onClick={() => setRole('worker')}>
              {t('user_modal_role_worker')}
            </button>
            <button className={`type-opt expense ${role==='manager'?'active':''}`} onClick={() => setRole('manager')}
              style={{ color: role==='manager' ? 'var(--gold)' : '' }}>
              {t('user_modal_role_manager')}
            </button>
          </div>
        </div>
        {error && <p className="form-error" style={{ marginBottom:12 }}>⚠ {error}</p>}
        <div className="modal-actions">
          <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={loading}>
            {loading ? t('user_modal_saving') : t('user_modal_create')}
          </button>
          <button className="btn btn-outline" onClick={onClose}>{t('modal_cancel')}</button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ onClose, onSaved, initial }) {
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const [fullName, setFullName] = useState(initial?.full_name || '')
  const [role,     setRole]     = useState(initial?.role || 'worker')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = async () => {
    if (!fullName.trim()) { setError(t('user_modal_err_name')); return }
    setLoading(true); setError('')
    try {
      await usersAPI.update(initial.id, { full_name: fullName, role })
      onSaved()
    } catch (e) {
      setError(e.response?.data?.detail || 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-eyebrow">{t('user_modal_edit_eyebrow')}</div>
        <h2>{t('user_modal_edit_title')}</h2>
        <div className="form-group">
          <label>{t('user_modal_name')}</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label>{t('user_modal_role')}</label>
          <div className="type-toggle">
            <button className={`type-opt income ${role==='worker'?'active':''}`} onClick={() => setRole('worker')}>
              {t('user_modal_role_worker')}
            </button>
            <button className={`type-opt expense ${role==='manager'?'active':''}`} onClick={() => setRole('manager')}
              style={{ color: role==='manager' ? 'var(--gold)' : '' }}>
              {t('user_modal_role_manager')}
            </button>
          </div>
        </div>
        {error && <p className="form-error" style={{ marginBottom:12 }}>⚠ {error}</p>}
        <div className="modal-actions">
          <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={loading}>
            {loading ? t('user_modal_saving') : t('user_modal_update')}
          </button>
          <button className="btn btn-outline" onClick={onClose}>{t('modal_cancel')}</button>
        </div>
      </div>
    </div>
  )
}

export default function StaffPage() {
  const { lang } = useLang()
  const t = k => TR[lang][k]
  const { show, ToastEl } = useToast()
  const [users,     setUsers]     = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [loading,   setLoading]   = useState(true)

  const load = () => {
    setLoading(true)
    usersAPI.list().then(r => { setUsers(r.data); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const handleDeactivate = async u => {
    if (!window.confirm(`${t('staff_deactivate_confirm')} ${u.full_name}?\n${t('staff_deactivate_msg')}`)) return
    await usersAPI.deactivate(u.id)
    show(`${t('staff_deactivated')}: ${u.username}`, 'success')
    load()
  }

  const handleReactivate = async u => {
    await usersAPI.update(u.id, { is_active: true })
    show(`${t('staff_reactivated')}: ${u.username}`, 'success')
    load()
  }

  const active   = users.filter(u => u.is_active)
  const inactive = users.filter(u => !u.is_active)

  return (
    <div className="page-content">
      {ToastEl}
      <div className="page-header">
        <div className="page-eyebrow"><span className="eyebrow-line" />{t('staff_eyebrow')}</div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <h1>{t('staff_title')}</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + {t('staff_new')}
          </button>
        </div>
      </div>

      <div className="summary-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:36 }}>
        <div className="summary-card">
          <div className="summary-label">{t('staff_card_active')}</div>
          <div className="summary-value gold">{active.length}</div>
          <div className="summary-sub">{t('staff_card_active_sub')}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">{t('staff_card_managers')}</div>
          <div className="summary-value white">{active.filter(u=>u.role==='manager').length}</div>
          <div className="summary-sub">{t('staff_card_managers_sub')}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">{t('staff_card_workers')}</div>
          <div className="summary-value white">{active.filter(u=>u.role==='worker').length}</div>
          <div className="summary-sub">{t('staff_card_workers_sub')}</div>
        </div>
      </div>

      {/* Permissions info */}
      <div style={{ background:'var(--navy-light)', border:'1px solid var(--navy-border)', borderLeft:'3px solid var(--gold)', padding:'16px 22px', marginBottom:36 }}>
        <div style={{ fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:10 }}>
          {t('staff_perms_title')}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:6, color:'var(--gold)' }}>{t('staff_role_manager')}</div>
            {t('staff_perms_manager').map(p => (
              <div key={p} style={{ fontSize:12, color:'var(--white-dim)', marginBottom:3, display:'flex', gap:8 }}>
                <span style={{ color:'var(--green)' }}>✓</span>{p}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:6, color:'var(--white-dim)' }}>{t('staff_role_worker')}</div>
            {t('staff_perms_worker_ok').map(p => (
              <div key={p} style={{ fontSize:12, color:'var(--white-dim)', marginBottom:3, display:'flex', gap:8 }}>
                <span style={{ color:'var(--green)' }}>✓</span>{p}
              </div>
            ))}
            {t('staff_perms_worker_no').map(p => (
              <div key={p} style={{ fontSize:12, color:'var(--muted)', marginBottom:3, display:'flex', gap:8 }}>
                <span style={{ color:'var(--red)' }}>✕</span>{p}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active users */}
      <div className="section-label">{t('staff_active')}</div>
      {loading ? (
        <p style={{ color:'var(--muted)', padding:'20px 0' }}>{t('dash_loading')}</p>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16, marginBottom:40 }}>
          {active.map(u => (
            <div key={u.id} className="card card-sm" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{
                    width:42, height:42, borderRadius:'50%',
                    background: u.role==='manager' ? 'rgba(201,168,76,0.15)' : 'var(--white-faint)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'var(--font-serif)', fontSize:16, fontWeight:600,
                    color: u.role==='manager' ? 'var(--gold)' : 'var(--white-dim)',
                  }}>
                    {u.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:16, fontWeight:500 }}>{u.full_name}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>@{u.username}</div>
                  </div>
                </div>
                <span className={`badge ${u.role==='manager' ? 'badge-manager' : 'badge-worker'}`}>
                  {u.role === 'manager' ? t('staff_role_manager') : t('staff_role_worker')}
                </span>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(u.role === 'manager'
                  ? [t('staff_access_read'), t('staff_access_write'), t('staff_access_delete'), t('staff_access_admin')]
                  : [t('staff_access_read'), t('staff_access_write')]
                ).map(p => (
                  <span key={p} style={{ fontSize:10, letterSpacing:'1px', padding:'2px 8px', background:'var(--white-faint)', color:'var(--white-dim)' }}>{p}</span>
                ))}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button className="btn btn-outline btn-sm" onClick={() => { setEditing(u); setEditModal(true) }}>{t('staff_edit')}</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(u)}>{t('staff_deactivate')}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inactive users */}
      {inactive.length > 0 && (
        <>
          <div className="section-label">{t('staff_inactive')}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16, marginBottom:40 }}>
            {inactive.map(u => (
              <div key={u.id} className="card card-sm" style={{ opacity:0.55 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:16 }}>{u.full_name}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>@{u.username}</div>
                  </div>
                  <span style={{ fontSize:10, color:'var(--red)', letterSpacing:'1px', textTransform:'uppercase' }}>{t('staff_disabled_label')}</span>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => handleReactivate(u)}>{t('staff_reactivate')}</button>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <UserModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); show(t('staff_created')) }}
        />
      )}
      {editModal && editing && (
        <EditModal
          initial={editing}
          onClose={() => { setEditModal(false); setEditing(null) }}
          onSaved={() => { setEditModal(false); setEditing(null); load(); show(t('staff_updated')) }}
        />
      )}
    </div>
  )
}
