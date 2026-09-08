import type { ReactNode } from 'react'

type ToggleProps = {
  label: string
  checked: boolean
  onChange: () => void
  title?: string
  children?: ReactNode
}

export function Toggle({ label, checked, onChange, title, children }: ToggleProps) {
  return (
    <button
      type="button"
      className="group grid min-h-11 min-w-13 place-items-center rounded-lg bg-transparent"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      title={title}
      onClick={onChange}
    >
      <span
        className="relative block h-6.5 w-11.5 rounded-full border border-line bg-soft transition-colors group-aria-checked:border-accent/60 group-aria-checked:bg-accent-soft"
        aria-hidden="true"
      >
        <span className="absolute top-0.5 left-0.5 grid size-5 place-items-center rounded-full bg-surface text-sm leading-none text-muted shadow-sm transition-transform group-aria-checked:translate-x-5 group-aria-checked:text-accent">
          {children}
        </span>
      </span>
    </button>
  )
}
