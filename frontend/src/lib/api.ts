import axios from 'axios'

export const TOKEN_KEY = 'antan_token'

export const api = axios.create({
  baseURL: '/api',
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('auth-unauthorized'))
    }
    return Promise.reject(error)
  },
)

/** Pulls a human-readable message out of Laravel's validation/error shape. */
export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (data?.errors) {
      const first = Object.values(data.errors)[0]
      if (Array.isArray(first)) return first[0] as string
    }
    if (data?.message) return data.message as string
  }
  return 'Something went wrong. Please try again.'
}
