import { useEffect, useState, type FormEvent } from 'react'
import { api, apiErrorMessage } from '../../lib/api'
import type { User } from '../../types'
import { Card, CardBody } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { motion, AnimatePresence } from 'framer-motion'

export function StaffManagementPage() {
  const [staffList, setStaffList] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Editing state
  const [editingStaff, setEditingStaff] = useState<User | null>(null)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [password, setPassword] = useState('')

  function fetchStaff() {
    api
      .get('/users/staff')
      .then((res) => setStaffList(res.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setSubmitting(true)
    try {
      if (editingStaff) {
        // Edit flow (PUT)
        await api.put(`/users/staff/${editingStaff.id}`, {
          name,
          email,
          phone: phone || null,
          role,
          password: password || undefined,
        })
        setSuccessMsg(`Successfully updated ${name}!`)
        setEditingStaff(null)
      } else {
        // Create flow (POST)
        await api.post('/users/staff', {
          name,
          email,
          phone: phone || null,
          role,
          password,
        })
        setSuccessMsg(`Successfully hired ${name}!`)
      }
      
      // Reset form
      setName('')
      setEmail('')
      setPhone('')
      setPassword('')
      fetchStaff()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(s: User) {
    setEditingStaff(s)
    setName(s.name)
    setEmail(s.email)
    setPhone(s.phone || '')
    setRole(s.role as 'staff' | 'admin')
    setPassword('')
  }

  function cancelEdit() {
    setEditingStaff(null)
    setName('')
    setEmail('')
    setPhone('')
    setRole('staff')
    setPassword('')
  }

  async function handleDelete(userId: number, staffName: string) {
    if (!window.confirm(`Are you sure you want to revoke access and delete the account for ${staffName}?`)) return
    setError(null)
    setSuccessMsg(null)
    try {
      await api.delete(`/users/staff/${userId}`)
      setSuccessMsg(`Account for ${staffName} has been deleted.`)
      fetchStaff()
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px] max-w-6xl mx-auto">
      {/* Left Column: Staff Directory */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-950">Staff management</h1>
          <p className="mt-1 text-ink-600">Register new hires, edit user roles, or manage access privileges for active operators.</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-700">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-700">
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-lagoon-50" />
            ))}
          </div>
        ) : staffList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink-300 p-8 text-center text-ink-500">
            No staff records found.
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-ink-800 uppercase tracking-wide">Active Staff Directory</h2>
            <div className="grid gap-3">
              <AnimatePresence>
                {staffList.map((s) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-between p-4 rounded-2xl border border-ink-200 bg-white shadow-soft"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-lagoon-50 text-lagoon-600 font-semibold text-sm">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink-950">{s.name}</p>
                          <span
                            className={`text-[9px] font-bold rounded px-1.5 py-0.5 uppercase tracking-wide ${
                              s.role === 'admin'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {s.role}
                          </span>
                        </div>
                        <p className="text-xxs text-ink-500 mt-0.5">
                          {s.email} {s.phone ? `· ${s.phone}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(s)}
                        className="text-xs font-medium text-lagoon-600 hover:text-lagoon-850 hover:bg-lagoon-50 rounded-lg px-2.5 py-1.5 transition-colors border border-transparent hover:border-lagoon-200/50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="text-xs font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg px-2.5 py-1.5 transition-colors border border-transparent hover:border-red-200/50"
                      >
                        Delete Account
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Hire / Edit Staff Form */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardBody className="pt-5 space-y-4">
            <h2 className="font-semibold text-ink-950">
              {editingStaff ? `Edit Operator: ${editingStaff.name}` : 'Add New Staff'}
            </h2>
            <p className="text-xs text-ink-500">
              {editingStaff 
                ? 'Update access permissions, contact details, or set a new password.'
                : 'Create a new authenticated account. Standard staff get access to checkins; admins get reporting and user management.'
              }
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <Input
                label="Full name"
                required
                placeholder="e.g. Ahmad Kamal"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label="Email address"
                type="email"
                required
                placeholder="e.g. ahmad@antanbatura.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Phone number (optional)"
                placeholder="e.g. +60123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-700">Access Level</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('staff')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      role === 'staff'
                        ? 'border-lagoon-500 bg-lagoon-50 text-lagoon-700'
                        : 'border-ink-200 bg-white text-ink-600 hover:bg-surface-sunken'
                    }`}
                  >
                    Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      role === 'admin'
                        ? 'border-lagoon-500 bg-lagoon-50 text-lagoon-700'
                        : 'border-ink-200 bg-white text-ink-600 hover:bg-surface-sunken'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <Input
                label={editingStaff ? 'New Password (optional)' : 'Temporary Password'}
                type="password"
                required={!editingStaff}
                placeholder={editingStaff ? 'Leave blank to keep current' : 'Min. 8 characters'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="flex gap-2">
                {editingStaff && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    className="w-1/3" 
                    onClick={cancelEdit}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" className="flex-1" size="lg" loading={submitting}>
                  {editingStaff ? 'Save Changes' : 'Register Account'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
