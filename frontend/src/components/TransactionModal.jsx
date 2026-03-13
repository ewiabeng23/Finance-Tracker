import { useState, useEffect } from 'react'
import { transactionsAPI, customersAPI } from '../api/endpoints'
import { EXPENSE_CATS, INCOME_CATS, CURRENCIES, todayISO, genRef } from '../api/utils'
import { useAuth } from '../context/AuthContext'

export default function TransactionModal({ onClose, onSaved, initial = null }) {
  const { isManager, user } = useAuth()
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

  // Auto-set category default when type changes
  useEffect(() => {
    if (!isEdit) setCategory(type === 'income' ? 'prime' : 'transport')
  }, [type])

  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) { setError('Veuillez saisir un montant valide'); return }
    if (!description.trim()) { setError('La description est requise'); return }
    setLoading(true); setError('')
    const payload = {
      reference, date, type, category,
      amount: parseFloat(amount), currency, description, note: note || null,
      customer_id: customerId ? parseInt(customerId) : null,
      worker_name: type === 'expense' ? (workerName || user?.full_name) : null,
    }
    try {
      if (isEdit) {
        await transactionsAPI.update(initial.id, payload)
      } else {
        await transactionsAPI.create(payload)
      }
      onSaved()
    } catch (e) {
      setError(e.response?.data?.detail || 'Erreur lors de la sauvegarde')
    } finally {
      setLoading(false)
    }
  }

  const catOptions = type === 'income' ? INCOME_CATS : EXPENSE_CATS

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-eyebrow">{isEdit ? 'Modifier' : 'Nouvelle'} transaction</div>
        <h2>{isEdit ? 'Modifier le mouvement' : 'Enregistrer un mouvement'}</h2>

        {/* Type toggle — workers can always pick type */}
        <div className="form-group">
          <label>Type de mouvement</label>
          <div className="type-toggle">
            <button
              className={`type-opt income ${type === 'income' ? 'active' : ''}`}
              onClick={() => setType('income')}
              disabled={isEdit && !isManager}
            >↑ Entrée</button>
            <button
              className={`type-opt expense ${type === 'expense' ? 'active' : ''}`}
              onClick={() => setType('expense')}
              disabled={isEdit && !isManager}
            >↓ Sortie</button>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Référence</label>
            <input value={reference} onChange={e => setReference(e.target.value)} placeholder="TX-0001" />
          </div>
        </div>

        {/* Income: pick client customer */}
        {type === 'income' && (
          <div className="form-group">
            <label>Client</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="">— Sélectionner un client —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Expense: pick worker */}
        {type === 'expense' && (
          <div className="form-group">
            <label>Collaborateur</label>
            <input
              value={workerName}
              onChange={e => setWorkerName(e.target.value)}
              placeholder={user?.full_name}
            />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Catégorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {Object.entries(catOptions).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Devise</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Montant</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" step="0.01" />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Détail de la transaction" />
        </div>

        <div className="form-group">
          <label>Note (optionnel)</label>
          <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Remarques..." />
        </div>

        {error && <p className="form-error" style={{ marginBottom: 12 }}>⚠ {error}</p>}

        <div className="modal-actions">
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={loading}>
            {loading ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Enregistrer'}
          </button>
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}
