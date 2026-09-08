import type { ComponentProps } from 'react'

type DialogProps = Omit<ComponentProps<'dialog'>, 'className'> & { wide?: boolean }

export function Dialog({ wide = false, ...props }: DialogProps) {
  return (
    <dialog
      {...props}
      className={`fixed inset-0 m-auto max-h-[90dvh] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-7 text-ink shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm max-arena:inset-x-0 max-arena:top-auto max-arena:bottom-0 max-arena:m-0 max-arena:w-full max-arena:max-w-none max-arena:rounded-t-3xl max-arena:rounded-b-none max-arena:px-5 max-arena:pt-4 max-arena:pb-[calc(20px+env(safe-area-inset-bottom,0px))] max-arena:before:mx-auto max-arena:before:mb-4 max-arena:before:block max-arena:before:h-1 max-arena:before:w-9 max-arena:before:rounded-full max-arena:before:bg-line max-arena:before:content-[''] ${wide ? 'arena:w-[min(36rem,calc(100vw-2rem))]' : 'arena:w-[min(33rem,calc(100vw-2rem))]'}`}
    />
  )
}
