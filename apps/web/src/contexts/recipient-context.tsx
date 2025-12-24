import * as React from 'react'
import { useCareRecipients, useProfile, type CaregiverAccess, type CareRecipient } from '~/lib/api-hooks'

export type Recipient = {
  id: string
  displayName: string
  email: string | null
  timezone: string | null
}

type RecipientContextValue = {
  recipients: Recipient[]
  selectedRecipient: Recipient | null
  selectedRecipientId: string | null
  setSelectedRecipientId: (id: string) => void
  isLoading: boolean
}

const RecipientContext = React.createContext<RecipientContextValue | null>(null)

const STORAGE_KEY = 'homethrive:selectedRecipientId'

export function RecipientProvider({ children }: { children: React.ReactNode }) {
  const { data: careRecipients = [], isLoading: isLoadingRecipients } = useCareRecipients()
  const { data: profile, isLoading: isLoadingProfile } = useProfile()

  // Transform care recipients into Recipient format
  // Only include approved recipients with a care_recipient ID
  const recipients: Recipient[] = React.useMemo(() => {
    return careRecipients
      .filter(
        (r): r is CaregiverAccess & { recipientCareRecipientId: string } =>
          r.status === 'approved' && r.recipientCareRecipientId !== null
      )
      .map((r) => ({
        id: r.recipientCareRecipientId,
        displayName: r.recipientDisplayName || 'Unknown',
        email: r.recipientEmail,
        timezone: r.recipientTimezone,
      }))
  }, [careRecipients])

  const [selectedRecipientId, setSelectedRecipientIdState] = React.useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(STORAGE_KEY)
  })

  // Auto-select first recipient if none selected
  React.useEffect(() => {
    if (recipients.length > 0 && !selectedRecipientId) {
      const firstId = recipients[0].id
      setSelectedRecipientIdState(firstId)
      localStorage.setItem(STORAGE_KEY, firstId)
    }
  }, [recipients, selectedRecipientId])

  // Validate selected recipient still exists
  React.useEffect(() => {
    if (
      selectedRecipientId &&
      recipients.length > 0 &&
      !recipients.find((r) => r.id === selectedRecipientId)
    ) {
      // Selected recipient no longer accessible, reset to first
      const firstId = recipients[0].id
      setSelectedRecipientIdState(firstId)
      localStorage.setItem(STORAGE_KEY, firstId)
    }
  }, [selectedRecipientId, recipients])

  const setSelectedRecipientId = React.useCallback((id: string) => {
    setSelectedRecipientIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const selectedRecipient = React.useMemo(() => {
    return recipients.find((r) => r.id === selectedRecipientId) ?? null
  }, [selectedRecipientId, recipients])

  const isLoading = isLoadingRecipients || isLoadingProfile

  const value = React.useMemo(
    () => ({
      recipients,
      selectedRecipient,
      selectedRecipientId,
      setSelectedRecipientId,
      isLoading,
    }),
    [recipients, selectedRecipient, selectedRecipientId, setSelectedRecipientId, isLoading]
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
