import * as React from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiRequest } from '~/lib/api'

export type OnboardingStatus = {
  hasCompletedOnboarding: boolean
  displayName: string | null
  timezone: string | null
  isRecipient: boolean
  isCaregiver: boolean
}

type OnboardingContextType = {
  status: OnboardingStatus | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const OnboardingContext = React.createContext<OnboardingContextType | null>(null)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth()
  const [status, setStatus] = React.useState<OnboardingStatus | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchStatus = React.useCallback(async () => {
    if (!isSignedIn) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const data = await apiRequest<OnboardingStatus>(
        '/onboarding/status',
        { method: 'GET' },
        getToken
      )
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [getToken, isSignedIn])

  React.useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const value = React.useMemo(
    () => ({
      status,
      isLoading,
      error,
      refetch: fetchStatus,
    }),
    [status, isLoading, error, fetchStatus]
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = React.useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}
