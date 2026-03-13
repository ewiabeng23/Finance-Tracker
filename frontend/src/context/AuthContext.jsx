import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('dikos_token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/auth/me')
        .then(r => setUser(r.data))
        .catch(() => { localStorage.removeItem('dikos_token'); delete api.defaults.headers.common['Authorization'] })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    localStorage.setItem('dikos_token', data.access_token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('dikos_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  const isManager = user?.role === 'manager'
  const isWorker  = user?.role === 'worker'

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isManager, isWorker }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
