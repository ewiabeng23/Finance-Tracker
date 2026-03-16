import { useState, useCallback, createElement } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const ToastEl = toast
    ? createElement(
        'div',
        { className: `toast ${toast.type}` },
        createElement('span', null, toast.type === 'success' ? '✓' : '✕'),
        toast.message
      )
    : null

  return { show, ToastEl }
}
