import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

/** Sends a signed-in user to the right home screen for their role. */
export function RoleRedirect() {
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    if (user && user.role !== 'customer' && user.role !== 'staff' && user.role !== 'admin') {
      logout()
    }
  }, [user, logout])

  if (loading) return null
  if (!user) return <Navigate to="/book" replace />

  if (user.role === 'customer') {
    return <Navigate to="/book" replace />
  }
  if (user.role === 'staff' || user.role === 'admin') {
    return <Navigate to="/desk" replace />
  }

  return null
}
