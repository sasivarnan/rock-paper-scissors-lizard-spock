import { createStore } from '@xstate/store-react'
export type Appearance = 'system' | 'light' | 'dark'
export const isAppearance = (value: unknown): value is Appearance =>
  value === 'system' || value === 'light' || value === 'dark'
export const resolveTheme = (preference: Appearance, darkSystem: boolean) =>
  preference === 'system' ? (darkSystem ? 'dark' : 'light') : preference
export const appearanceStore = createStore({
  context: { preference: 'system' as Appearance },
  on: {
    choose: (c, e: { preference: Appearance }) =>
      isAppearance(e.preference) ? { preference: e.preference } : c,
  },
})
export function initializeAppearance() {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  try {
    const saved = localStorage.getItem('hand-to-hand-appearance')
    if (isAppearance(saved)) appearanceStore.trigger.choose({ preference: saved })
  } catch {
    /* Storage may be disabled. */
  }
  const apply = () => {
    const preference = appearanceStore.getSnapshot().context.preference
    const theme = resolveTheme(preference, query.matches)
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#111214' : '#fafafa')
  }
  const subscription = appearanceStore.subscribe(() => {
    apply()
    try {
      localStorage.setItem(
        'hand-to-hand-appearance',
        appearanceStore.getSnapshot().context.preference,
      )
    } catch {
      /* Keep the choice for this session. */
    }
  })
  const sync = (event: StorageEvent) => {
    if (event.key === 'hand-to-hand-appearance' || event.key === null)
      appearanceStore.trigger.choose({
        preference: isAppearance(event.newValue) ? event.newValue : 'system',
      })
  }
  apply()
  query.addEventListener('change', apply)
  window.addEventListener('storage', sync)
  return () => {
    subscription.unsubscribe()
    query.removeEventListener('change', apply)
    window.removeEventListener('storage', sync)
  }
}
