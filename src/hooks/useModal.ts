import { useEffect, useRef } from 'react'

export function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'

    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      trigger?.focus()
    }
  }, [open])

  return ref
}
