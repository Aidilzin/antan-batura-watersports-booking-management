import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useAuth } from '../lib/auth'
import { apiErrorMessage } from '../lib/api'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user && (user.role === 'customer' || user.role === 'staff' || user.role === 'admin')) {
    return <Navigate to={user.role === 'customer' ? '/book' : '/desk'} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(email, password)
      let from = (location.state as any)?.from
      if (!from || typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
        from = user.role === 'customer' ? '/book' : '/desk'
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in as operator or admin to manage the fleet and front desk.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
