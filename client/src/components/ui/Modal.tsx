import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer: ReactNode
  wide?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-slate-900/40" />
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel
          className={`w-full rounded-lg bg-white shadow-xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}
        >
          <div className="border-b border-slate-200 px-5 py-4">
            <DialogTitle className="text-base font-semibold text-slate-900">{title}</DialogTitle>
            {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">{children}</div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
            {footer}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
