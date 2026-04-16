import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Navbar        from './components/Navbar'
import LoginPage     from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import ExpensesPage  from './pages/ExpensesPage'
import CustomersPage from './pages/CustomersPage'
import StaffPage     from './pages/StaffPage'
import ReportsPage   from './pages/ReportsPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ fontFamily:'var(--font-serif)', fontSize:22, fontStyle:'italic', color:'var(--muted)' }}>
        Chargement...
      </p>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function ManagerRoute({ children }) {
  const { user, isManager, loading } = useAuth()
  if (loading) return null
  if (!user)      return <Navigate to="/login" replace />
  if (!isManager) return <Navigate to="/dashboard" replace />
  return children
}

function AppLayout() {
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Navbar />
      <div style={{ flex:1 }}>
        <Routes>
          <Route path="/dashboard"    element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/expenses"     element={<ExpensesPage />} />
          <Route path="/customers"    element={<CustomersPage />} />
          <Route path="/staff"        element={<ManagerRoute><StaffPage /></ManagerRoute>} />
          <Route path="/reports"      element={<ManagerRoute><ReportsPage /></ManagerRoute>} />
          <Route path="*"             element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
      <footer style={{
        borderTop:'1px solid var(--navy-border)', padding:'16px 36px',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        fontSize:11, color:'var(--muted)',
      }}>
        <span>© 2025 Finance Tracker</span>
        <span style={{ fontFamily:'var(--font-serif)', fontStyle:'italic', color:'var(--gold-dim)', fontSize:13 }}>
          Your protection, our commitment.
        </span>
        <span>Courtier agréé — Chanas Assurances S.A.</span>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}
