import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'
import clsx from 'clsx'

interface FieldWrapProps {
  label?: string
  error?: string
  hint?: string
}

const fieldBase =
  'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-950 placeholder:text-ink-400 transition-colors focus-ring focus-visible:border-lagoon-400'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldWrapProps>(
  function Input({ label, error, hint, className, id, ...props }, ref) {
    return (
      <label className="block" htmlFor={id}>
        {label && <span className="mb-1.5 block text-sm font-medium text-ink-800">{label}</span>}
        <input
          ref={ref}
          id={id}
          className={clsx(fieldBase, error && 'border-red-300 focus-visible:border-red-400', className)}
          {...props}
        />
        {hint && !error && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
        {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
      </label>
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldWrapProps>(
  function Select({ label, error, hint, className, id, children, ...props }, ref) {
    return (
      <label className="block" htmlFor={id}>
        {label && <span className="mb-1.5 block text-sm font-medium text-ink-800">{label}</span>}
        <select
          ref={ref}
          id={id}
          className={clsx(fieldBase, 'appearance-none bg-no-repeat', error && 'border-red-300', className)}
          {...props}
        >
          {children}
        </select>
        {hint && !error && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
        {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
      </label>
    )
  },
)
