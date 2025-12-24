import * as React from 'react'
import { useOnboarding } from './onboarding-context'
import { useUpdateRoles } from '~/lib/api-hooks'

type UserRoles = {
  isRecipient: boolean
  isCaregiver: boolean
}

type UserRoleContextType = UserRoles & {
  setIsRecipient: (value: boolean) => void
  setIsCaregiver: (value: boolean) => void
  isSaving: boolean
}

const UserRoleContext = React.createContext<UserRoleContextType | null>(null)

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const { status, refetch } = useOnboarding()
  const updateRoles = useUpdateRoles()

  // Initialize from onboarding status
  const [isRecipient, setIsRecipientLocal] = React.useState(status?.isRecipient ?? false)
  const [isCaregiver, setIsCaregiverLocal] = React.useState(status?.isCaregiver ?? false)

  // Update when status changes (e.g., initial load or after refetch)
  React.useEffect(() => {
    if (status) {
      setIsRecipientLocal(status.isRecipient)
      setIsCaregiverLocal(status.isCaregiver)
    }
  }, [status])

  // Persist role changes to API
  const setIsRecipient = React.useCallback(
    (value: boolean) => {
      // Optimistic update
      setIsRecipientLocal(value)
      // Persist to API
      updateRoles.mutate(
        { isRecipient: value, isCaregiver },
        {
          onSuccess: () => {
            refetch()
          },
          onError: () => {
            // Revert on error
            setIsRecipientLocal(!value)
          },
        }
      )
    },
    [isCaregiver, updateRoles, refetch]
  )

  const setIsCaregiver = React.useCallback(
    (value: boolean) => {
      // Optimistic update
      setIsCaregiverLocal(value)
      // Persist to API
      updateRoles.mutate(
        { isRecipient, isCaregiver: value },
        {
          onSuccess: () => {
            refetch()
          },
          onError: () => {
            // Revert on error
            setIsCaregiverLocal(!value)
          },
        }
      )
    },
    [isRecipient, updateRoles, refetch]
  )

  const value = React.useMemo(
    () => ({
      isRecipient,
      isCaregiver,
      setIsRecipient,
      setIsCaregiver,
      isSaving: updateRoles.isPending,
    }),
    [isRecipient, isCaregiver, setIsRecipient, setIsCaregiver, updateRoles.isPending]
  )

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  )
}

export function useUserRole() {
  const context = React.useContext(UserRoleContext)
  if (!context) {
    throw new Error('useUserRole must be used within a UserRoleProvider')
  }
  return context
}
