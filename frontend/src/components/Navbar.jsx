import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { TR } from '../api/translations'

export default function Navbar() {
  const { user, logout, isManager } = useAuth()
  const { lang, toggleLang } = useLang()
  const { pathname } = useLocation()
  const t = k => TR[lang][k]

  const NAV_LINKS_MANAGER = [
    { to: '/dashboard',    label: t('nav_dashboard') },
    { to: '/transactions', label: t('nav_transactions') },
    { to: '/expenses',     label: t('nav_expenses') },
    { to: '/customers',    label: t('nav_customers') },
    { to: '/staff',        label: t('nav_staff') },
    { to: '/reports',      label: t('nav_reports') },
  ]

  const NAV_LINKS_WORKER = [
    { to: '/dashboard',    label: t('nav_dashboard') },
    { to: '/transactions', label: t('nav_transactions') },
    { to: '/customers',    label: t('nav_customers') },
  ]

  const links = isManager ? NAV_LINKS_MANAGER : NAV_LINKS_WORKER

  return (
    <nav style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 36px', borderBottom:'1px solid var(--navy-border)',
      background:'var(--navy)', position:'sticky', top:0, zIndex:100,
      height:'62px',
    }}>
      {/* Logo */}
      <Link to="/dashboard" style={{ display:'flex', alignItems:'center', gap:12, textDecoration:'none' }}>
        <div style={{
          width:36, height:36, border:'1.5px solid var(--gold)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-serif)', fontSize:17, fontWeight:600, color:'var(--gold)'
        }}>D</div>
        <div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:16, fontWeight:600, lineHeight:1.1 }}>
            Diko's Assurances
          </div>
          <div style={{ fontSize:9, letterSpacing:'2px', textTransform:'uppercase', color:'var(--gold)' }}>
            {t('nav_subtitle')}
          </div>
        </div>
      </Link>

      {/* Nav links */}
      <div style={{ display:'flex', alignItems:'center', gap:2 }}>
        {links.map(({ to, label }) => (
          <Link key={to} to={to} style={{
            padding:'6px 14px', fontSize:11, letterSpacing:'1.2px',
            textTransform:'uppercase', textDecoration:'none',
            color: pathname.startsWith(to) ? 'var(--gold)' : 'var(--muted)',
            borderBottom: pathname.startsWith(to) ? '2px solid var(--gold)' : '2px solid transparent',
            transition:'all 0.2s',
          }}>{label}</Link>
        ))}
      </div>

      {/* Lang toggle + user + logout */}
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>

        {/* FR/EN toggle — same style as insurance site */}
        <div style={{ display:'flex', alignItems:'center', gap:2 }}>
          {['fr','en'].map(l => (
            <button key={l} onClick={() => toggleLang(l)} style={{
              background: lang === l ? 'rgba(201,168,76,0.18)' : 'none',
              border:'none', cursor:'pointer', padding:'4px 8px',
              fontFamily:'var(--font-sans)', fontSize:12, letterSpacing:'1px',
              color: lang === l ? 'var(--white)' : 'var(--muted)',
              transition:'all .2s', textTransform:'uppercase',
            }}>{l}</button>
          ))}
        </div>

        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:13, fontWeight:500 }}>{user?.full_name}</div>
          <div style={{ fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--gold)' }}>
            {user?.role === 'manager' ? t('staff_role_manager') : t('staff_role_worker')}
          </div>
        </div>
        <button onClick={logout} className="btn btn-outline btn-sm">
          {t('nav_logout')}
        </button>
      </div>
    </nav>
  )
}
