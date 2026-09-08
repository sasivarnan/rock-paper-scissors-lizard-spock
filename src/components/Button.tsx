import type { ComponentProps } from 'react'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'text' | 'close'
}
const styles = {
  primary:
    'inline-flex min-h-12 min-w-40 items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-on-accent hover:brightness-110 active:brightness-95 dark:bg-blue-600',
  secondary:
    'min-h-11 rounded-lg bg-transparent px-3 py-2 text-sm text-muted hover:bg-soft hover:text-ink',
  text: 'min-h-11 bg-transparent text-sm text-muted hover:text-ink',
  close:
    'grid size-11 shrink-0 place-items-center rounded-full bg-transparent text-2xl text-muted hover:bg-soft hover:text-ink',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return <button {...props} type={type} className={`${styles[variant]} ${className}`} />
}
