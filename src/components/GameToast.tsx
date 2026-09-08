import { useEffect } from 'react'
import { useSelector } from '@xstate/store-react'
import { gameStore } from '../game/store'
export function GameToast() {
  const notification = useSelector(gameStore, (s) => s.context.notification)
  useEffect(() => {
    if (!notification || notification.persistent) return
    const timer = window.setTimeout(
      () => gameStore.trigger.dismissNotification({ id: notification.id }),
      5000,
    )
    return () => clearTimeout(timer)
  }, [notification])
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-60 w-[min(28rem,calc(100vw-1.75rem))] -translate-x-1/2 bottom-[max(20px,env(safe-area-inset-bottom,0px))] max-arena:bottom-[calc(var(--controls-height,148px)+12px)]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {notification && (
        <div
          key={notification.id}
          data-win={notification.kind === 'win'}
          className="group/toast pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-ink shadow-xl animate-[toast-arrive_240ms_ease-out] data-[win=true]:border-accent/50"
        >
          <span
            className="text-2xl text-muted group-data-[win=true]/toast:text-accent"
            aria-hidden="true"
          >
            {notification.kind === 'win'
              ? '✦'
              : notification.kind === 'retry'
                ? '↻'
                : notification.kind === 'draw'
                  ? '='
                  : '✓'}
          </span>
          <div className="flex-1">
            <strong className="block text-base leading-snug font-semibold">
              {notification.title}
            </strong>
            <p className="mt-1 text-sm leading-relaxed text-muted">{notification.description}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => gameStore.trigger.dismissNotification({ id: notification.id })}
            className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-full bg-transparent text-xl text-muted hover:bg-soft"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
