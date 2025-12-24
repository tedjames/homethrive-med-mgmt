import * as React from 'react'
import { MOCK_RECIPIENTS, type MockRecipient } from '~/lib/mock-data'

type RecipientContextValue = {
  recipients: MockRecipient[]
  selectedRecipient: MockRecipient | null
  selectedRecipientId: string | null
  setSelectedRecipientId: (id: string) => void
}

const RecipientContext = React.createContext<RecipientContextValue | null>(null)

const STORAGE_KEY = 'homethrive:selectedRecipientId'

export function RecipientProvider({ children }: { children: React.ReactNode }) {
  const [selectedRecipientId, setSelectedRecipientIdState] = React.useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEY) || (MOCK_RECIPIENTS[0]?.id ?? null)
  })

  const setSelectedRecipientId = React.useCallback((id: string) => {
    setSelectedRecipientIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const selectedRecipient = React.useMemo(() => {
    return MOCK_RECIPIENTS.find((r) => r.id === selectedRecipientId) ?? null
  }, [selectedRecipientId])

  const value = React.useMemo(
    () => ({
      recipients: MOCK_RECIPIENTS,
      selectedRecipient,
      selectedRecipientId,
      setSelectedRecipientId,
    }),
    [selectedRecipient, selectedRecipientId, setSelectedRecipientId]
  )

  return <RecipientContext.Provider value={value}>{children}</RecipientContext.Provider>
}

export function useRecipient() {
  const context = React.useContext(RecipientContext)
  if (!context) {
    throw new Error('useRecipient must be used within a RecipientProvider')
  }
  return context
}
