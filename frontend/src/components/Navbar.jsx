import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS_MANAGER = [
  { to: '/dashboard',    label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/expenses',     label: 'Dépenses' },
  { to: '/customers',    label: 'Clients' },
  { to: '/staff',        label: 'Personnel' },
  { to: '/reports',      label: 'Rapports' },
]

const NAV_LINKS_WORKER = [
  { to: '/dashboard',    label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/customers',    label: 'Clients' },
]

export default function Navbar() {
  const { user, logout, isManager } = useAuth()
  const { pathname } = useLocation()
  const links = isManager ? NAV_LINKS_MANAGER : NAV_LINKS_WORKER

  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 36px', borderBottom: '1px solid var(--navy-border)',
      background: 'var(--navy)', position: 'sticky', top: 0, zIndex: 100,
      height: '62px',
    }}>
      {/* Logo */}
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
        <div style={{
          width: 36, height: 36, border: '1.5px solid var(--gold)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, color: 'var(--gold)'
        }}>D</div>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 600, lineHeight: 1.1 }}>
            Diko's Assurances
          </div>
          <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}>
            Finance Tracker
          </div>
        </div>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {links.map(({ to, label }) => (
          <Link key={to} to={to} style={{
            padding: '6px 14px', fontSize: 11, letterSpacing: '1.2px',
            textTransform: 'uppercase', textDecoration: 'none',
            color: pathname.startsWith(to) ? 'var(--gold)' : 'var(--muted)',
            borderBottom: pathname.startsWith(to) ? '2px solid var(--gold)' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>{label}</Link>
        ))}
      </div>

      {/* User + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{user?.full_name}</div>
          <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>
            {user?.role}
          </div>
        </div>
        <button onClick={logout} className="btn btn-outline btn-sm">
          Déconnexion
        </button>
      </div>
    </nav>
  )
}
