import { Toggle } from './Toggle'
import { useSyncExternalStore } from 'react'
import { useSelector } from '@xstate/store-react'
import { appearanceStore, resolveTheme } from '../game/appearance'

function subscribeSystemTheme(onChange: () => void) {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const systemIsDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export function AppearanceControl({ compact = false }: { compact?: boolean }) {
  const preference = useSelector(appearanceStore, (s) => s.context.preference)
  const darkSystem = useSyncExternalStore(subscribeSystemTheme, systemIsDark, () => false)
  const dark = resolveTheme(preference, darkSystem) === 'dark'
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted">
      <span className={compact ? 'hidden' : undefined}>Appearance</span>
      <Toggle
        label="Dark mode"
        checked={dark}
        title={`${dark ? 'Dark' : 'Light'} mode${preference === 'system' ? ' · following your device' : ''}. Switch to ${dark ? 'light' : 'dark'} mode.`}
        onChange={() => appearanceStore.trigger.choose({ preference: dark ? 'light' : 'dark' })}
      >
        {dark ? '☾' : '☀'}
      </Toggle>
    </div>
  )
}
