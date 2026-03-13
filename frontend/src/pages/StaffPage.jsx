import { useState, useEffect } from 'react'
import { usersAPI } from '../api/endpoints'
import { useToast } from '../hooks/useToast'

const ROLES = { manager: 'Manager', worker: 'Collaborateur' }

function UserModal({ onClose, onSaved, initial = null }) {
  const isEdit = !!initial
  const [fullName, setFullName] = useState(initial?.full_name || '')
  const [username, setUsername] = useState(initial?.username || '')
  const [password, setPassword] = useState('')
  const [role,     setRole]     = useState(initial?.role || 'worker')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = async () => {
    if (!fullName.trim()) { setError('Le nom est requis'); return }
    if (!isEdit && !username.trim()) { setError("Le nom d'utilisateur est requis"); return }
    if (!isEdit && !password.trim()) { setError('Le mot de passe est requis'); return }
    setLoading(true); setError('')
    try {
      if (isEdit) {
        const payload = { full_name: fullName, role }
        await usersAPI.update(initial.id, payload)
      } else {
        await usersAPI.create({ full_name: fullName, username, password, role })
      }
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
        <div className="modal-eyebrow">{isEdit ? 'Modifier' : 'Nouveau'} collaborateur</div>
        <h2>{isEdit ? 'Modifier le compte' : 'Créer un compte'}</h2>

        <div className="form-group">
          <label>Nom complet *</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Prénom Nom" autoFocus />
        </div>

        {!isEdit && (
          <>
            <div className="form-group">
              <label>Nom d'utilisateur *</label>
              <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g,''))} placeholder="ex: kamga" />
            </div>
            <div className="form-group">
              <label>Mot de passe *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 caractères" />
            </div>
          </>
        )}

        <div className="form-group">
          <label>Rôle</label>
          <div className="type-toggle">
            <button className={`type-opt income ${role==='worker'?'active':''}`} onClick={() => setRole('worker')}>
              Collaborateur
            </button>
            <button className={`type-opt expense ${role==='manager'?'active':''}`} onClick={() => setRole('manager')} style={{ color: role==='manager' ? 'var(--gold)' : '' }}>
              Manager
            </button>
          </div>
        </div>

        {error && <p className="form-error" style={{ marginBottom:12 }}>⚠ {error}</p>}

        <div className="modal-actions">
          <button className="btn btn-primary" style={{ flex:1 }} onClick={submit} disabled={loading}>
            {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le compte'}
          </button>
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

export default function StaffPage() {
  const { show, ToastEl } = useToast()
  const [users,     setUsers]     = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [loading,   setLoading]   = useState(true)

  const load = () => {
    setLoading(true)
    usersAPI.list().then(r => { setUsers(r.data); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const handleDeactivate = async (u) => {
    if (!window.confirm(`Désactiver le compte de ${u.full_name} ?\nIl ne pourra plus se connecter.`)) return
    await usersAPI.deactivate(u.id)
    show(`Compte ${u.username} désactivé`, 'success')
    load()
  }

  const handleReactivate = async (u) => {
    await usersAPI.update(u.id, { is_active: true })
    show(`Compte ${u.username} réactivé`, 'success')
    load()
  }

  const active   = users.filter(u => u.is_active)
  const inactive = users.filter(u => !u.is_active)

  return (
    <div className="page-content">
      {ToastEl}

      <div className="page-header">
        <div className="page-eyebrow"><span className="eyebrow-line" />Gestion des accès</div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <h1>Comptes <em>personnel</em></h1>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
            + Nouveau compte
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:36 }}>
        <div className="summary-card">
          <div className="summary-label">Comptes actifs</div>
          <div className="summary-value gold">{active.length}</div>
          <div className="summary-sub">Peuvent se connecter</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Managers</div>
          <div className="summary-value white">{active.filter(u=>u.role==='manager').length}</div>
          <div className="summary-sub">Accès complet</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Collaborateurs</div>
          <div className="summary-value white">{active.filter(u=>u.role==='worker').length}</div>
          <div className="summary-sub">Saisie uniquement</div>
        </div>
      </div>

      {/* Role permissions info */}
      <div style={{
        background:'var(--navy-light)', border:'1px solid var(--navy-border)',
        borderLeft:'3px solid var(--gold)', padding:'16px 22px', marginBottom:36,
      }}>
        <div style={{ fontSize:10, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)', marginBottom:10 }}>
          Permissions par rôle
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:6, color:'var(--gold)' }}>Manager</div>
            {['Ajouter, modifier, supprimer toutes les transactions','Gérer les comptes collaborateurs','Voir tous les rapports et analyses','Exporter les données PDF / Excel','Définir le solde journalier'].map(p => (
              <div key={p} style={{ fontSize:12, color:'var(--white-dim)', marginBottom:3, display:'flex', gap:8 }}>
                <span style={{ color:'var(--green)' }}>✓</span>{p}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:6, color:'var(--white-dim)' }}>Collaborateur</div>
            {[
              { txt:'Ajouter des transactions (entrées & sorties)', ok:true },
              { txt:'Ajouter de nouveaux clients', ok:true },
              { txt:'Consulter toutes les transactions', ok:true },
              { txt:'Modifier ou supprimer des transactions', ok:false },
              { txt:'Accéder à la gestion des comptes', ok:false },
            ].map(p => (
              <div key={p.txt} style={{ fontSize:12, color: p.ok ? 'var(--white-dim)' : 'var(--muted)', marginBottom:3, display:'flex', gap:8 }}>
                <span style={{ color: p.ok ? 'var(--green)' : 'var(--red)' }}>{p.ok ? '✓' : '✕'}</span>{p.txt}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active users */}
      <div className="section-label">Comptes actifs</div>
      {loading ? (
        <p style={{ color:'var(--muted)', padding:'20px 0' }}>Chargement...</p>
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
                  {ROLES[u.role]}
                </span>
              </div>

              {/* Access summary */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {(u.role === 'manager'
                  ? ['Lecture', 'Écriture', 'Suppression', 'Admin']
                  : ['Lecture', 'Écriture']
                ).map(p => (
                  <span key={p} style={{
                    fontSize:10, letterSpacing:'1px', padding:'2px 8px',
                    background:'var(--white-faint)', color:'var(--white-dim)',
                  }}>{p}</span>
                ))}
              </div>

              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button className="btn btn-outline btn-sm" onClick={() => { setEditing(u); setShowModal(true) }}>
                  Modifier
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(u)}>
                  Désactiver
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inactive users */}
      {inactive.length > 0 && (
        <>
          <div className="section-label">Comptes désactivés</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16, marginBottom:40 }}>
            {inactive.map(u => (
              <div key={u.id} className="card card-sm" style={{ opacity:0.55 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-serif)', fontSize:16 }}>{u.full_name}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>@{u.username}</div>
                  </div>
                  <span style={{ fontSize:10, color:'var(--red)', letterSpacing:'1px', textTransform:'uppercase' }}>Désactivé</span>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => handleReactivate(u)}>
                  Réactiver
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <UserModal
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => {
            setShowModal(false); setEditing(null); load()
            show(editing ? 'Compte mis à jour ✓' : 'Compte créé ✓')
          }}
        />
      )}
    </div>
  )
}
