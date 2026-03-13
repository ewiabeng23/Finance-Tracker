import { useState } from 'react'
import { customersAPI } from '../api/endpoints'

export default function CustomerModal({ onClose, onSaved, initial = null }) {
  const isEdit = !!initial
  const [fullName, setFullName] = useState(initial?.full_name || '')
  const [phone,    setPhone]    = useState(initial?.phone || '')
  const [email,    setEmail]    = useState(initial?.email || '')
  const [address,  setAddress]  = useState(initial?.address || '')
  const [note,     setNote]     = useState(initial?.note || '')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const submit = async () => {
    if (!fullName.trim()) { setError('Le nom est requis'); return }
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

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-eyebrow">{isEdit ? 'Modifier' : 'Nouveau'} client</div>
        <h2>{isEdit ? 'Modifier le client' : 'Ajouter un client'}</h2>

        <div className="form-group">
          <label>Nom complet *</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nom du client ou de l'entreprise" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Téléphone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemple.com" />
          </div>
        </div>
        <div className="form-group">
          <label>Adresse</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Adresse ou ville" />
        </div>
        <div className="form-group">
          <label>Note</label>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Informations complémentaires..." />
        </div>

        {error && <p className="form-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

        <div className="modal-actions">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={loading}>
            {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Ajouter'}
          </button>
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}
