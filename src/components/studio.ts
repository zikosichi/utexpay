import { useSyncExternalStore } from 'react'

// Review mode. `/` ships clean: only the chosen default of each section, no version rails,
// panels or pickers, and no saved choices from localStorage or version params from the URL.
// `/?studio` brings every control back on the same components, for reviews with the client.
// The prerendered HTML is always the clean page; studio mode switches on after hydration.

export function isStudio() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('studio')
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

export function useStudio() {
  return useSyncExternalStore(subscribe, isStudio, () => false)
}
