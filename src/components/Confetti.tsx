import type { CSSProperties } from 'react'

export function Confetti() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden motion-reduce:hidden"
      aria-hidden="true"
    >
      {Array.from({ length: 64 }, (_, i) => (
        <i
          key={i}
          style={
            {
              '--x': `${(i * 37) % 101}vw`,
              '--drift': `${((i * 29) % 240) - 120}px`,
              '--delay': `${(i % 8) * 0.08}s`,
              '--turn': `${(i % 2 ? 1 : -1) * (360 + i * 13)}deg`,
              backgroundColor: ['#4d78ff', '#8faaff', '#b7c6ed', '#fafafa', '#8f93a3'][i % 5],
            } as CSSProperties
          }
          className="absolute -top-6 h-3.5 w-2 opacity-0 nth-[3n]:size-2.5 nth-[3n]:rounded-full left-(--x) animate-[confetti-fall_3.2s_var(--delay)_ease-in_forwards]"
        />
      ))}
    </div>
  )
}
