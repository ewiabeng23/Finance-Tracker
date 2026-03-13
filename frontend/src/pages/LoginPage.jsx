import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!username || !password) { setError('Veuillez remplir tous les champs'); return }
    setLoading(true); setError('')
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch {
      setError('Identifiants incorrects. Vérifiez votre nom d\'utilisateur et mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 24,
      background: 'radial-gradient(ellipse at 30% 40%, rgba(201,168,76,0.06) 0%, transparent 60%), var(--navy)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 56, height: 56, border: '1.5px solid var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 600, color: 'var(--gold)'
          }}>D</div>
          <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>
            Diko's <em>Assurances</em>
          </h1>
          <p style={{ fontSize: 11, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}>
            Finance Tracker
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>
              Connexion
            </div>
            <h2 style={{ fontSize: '1.6rem' }}>Accéder à votre <em>espace</em></h2>
          </div>

          <form onSubmit={submit}>
            <div className="form-group">
              <label>Nom d'utilisateur</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="manager / kamga / sylvie..."
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--red-dim)', border: '1px solid rgba(224,90,78,0.3)',
                padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--red)'
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px' }} disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--muted)', letterSpacing: '0.5px' }}>
          © 2025 Diko's Assurances SARL — Courtier agréé Chanas Assurances S.A.
        </p>
      </div>
    </div>
  )
}
