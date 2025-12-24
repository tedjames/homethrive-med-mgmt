import * as React from 'react'
import { useOnboarding } from './onboarding-context'

type UserRoles = {
  isRecipient: boolean
  isCaregiver: boolean
}

type UserRoleContextType = UserRoles & {
  setIsRecipient: (value: boolean) => void
  setIsCaregiver: (value: boolean) => void
}

const UserRoleContext = React.createContext<UserRoleContextType | null>(null)

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const { status } = useOnboarding()

  // Initialize from onboarding status
  const [isRecipient, setIsRecipient] = React.useState(status?.isRecipient ?? false)
  const [isCaregiver, setIsCaregiver] = React.useState(status?.isCaregiver ?? false)

  // Update when status changes
  React.useEffect(() => {
    if (status) {
      setIsRecipient(status.isRecipient)
      setIsCaregiver(status.isCaregiver)
    }
  }, [status])

  const value = React.useMemo(
    () => ({
      isRecipient,
      isCaregiver,
      setIsRecipient,
      setIsCaregiver,
    }),
    [isRecipient, isCaregiver]
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
