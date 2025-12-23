import { createStart } from '@tanstack/react-start'

// SPA mode - minimal start instance (no server middleware)
export const startInstance = createStart(() => {
  return {}
})
