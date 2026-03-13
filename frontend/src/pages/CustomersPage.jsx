import { useState, useEffect } from 'react'
import { customersAPI } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import CustomerModal from '../components/CustomerModal'
import { useToast } from '../hooks/useToast'

export default function CustomersPage() {
  const { isManager } = useAuth()
  const { show, ToastEl } = useToast()
  const [customers, setCustomers] = useState([])
  const [search,    setSearch]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)

  const load = () => customersAPI.list(search).then(r => setCustomers(r.data))
  useEffect(() => { load() }, [search])

  return (
    <div className="page-content">
      {ToastEl}
      <div className="page-header">
        <div className="page-eyebrow"><span className="eyebrow-line" />Base clients</div>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <h1>Gestion des <em>clients</em></h1>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}>
            + Nouveau client
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client..." style={{ width: 280 }} />
        </div>
        <span style={{ fontSize:12, color:'var(--muted)' }}>{customers.length} client{customers.length!==1?'s':''}</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:16 }}>
        {customers.length === 0 ? (
          <div className="empty-state" style={{ gridColumn:'1/-1' }}>
            <p>Aucun client trouvé</p>
            <span>Ajoutez votre premier client</span>
          </div>
        ) : customers.map(c => (
          <div key={c.id} className="card card-sm" style={{ borderLeft:'3px solid var(--navy-border)', transition:'border-color .2s', cursor:'default' }}
            onMouseEnter={e => e.currentTarget.style.borderLeftColor='var(--gold-dim)'}
            onMouseLeave={e => e.currentTarget.style.borderLeftColor='var(--navy-border)'}
          >
            {/* Avatar */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <div style={{
                width:40, height:40, borderRadius:'50%', background:'rgba(201,168,76,0.12)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--font-serif)', fontSize:16, fontWeight:600, color:'var(--gold)',
              }}>
                {c.full_name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontFamily:'var(--font-serif)', fontSize:16, fontWeight:500 }}>{c.full_name}</div>
                {c.phone && <div style={{ fontSize:11, color:'var(--muted)' }}>{c.phone}</div>}
              </div>
            </div>
            {c.email   && <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>✉ {c.email}</div>}
            {c.address && <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>📍 {c.address}</div>}
            {c.note    && <div style={{ fontSize:12, color:'var(--muted)', fontStyle:'italic', marginTop:6 }}>{c.note}</div>}
            {isManager && (
              <button className="btn btn-outline btn-sm" style={{ marginTop:14 }}
                onClick={() => { setEditing(c); setShowModal(true) }}>
                Modifier
              </button>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <CustomerModal
          initial={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSaved={() => { setShowModal(false); setEditing(null); load(); show(editing ? 'Client modifié ✓' : 'Client ajouté ✓') }}
        />
      )}
    </div>
  )
}
