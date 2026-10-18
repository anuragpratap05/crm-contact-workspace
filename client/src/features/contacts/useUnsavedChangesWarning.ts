import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

export function useUnsavedChangesWarning(enabled: boolean) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      enabled && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!enabled) return

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [enabled])

  return blocker
}
