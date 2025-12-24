import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { useUserRole } from '~/contexts/user-role-context'

export const Route = createFileRoute('/_authed/care')({
  component: CareLayout,
})

function CareLayout() {
  const { isRecipient, isCaregiver } = useUserRole()
  const navigate = useNavigate()

  React.useEffect(() => {
    // If user is not a caregiver, redirect to personal view or settings
    if (!isCaregiver) {
      if (isRecipient) {
        navigate({ to: '/my/schedule' })
      } else {
        // Neither role - redirect to settings to enable a role
        navigate({ to: '/settings' })
      }
    }
  }, [isRecipient, isCaregiver, navigate])

  // Don't render children if not a caregiver
  if (!isCaregiver) {
    return null
  }

  // RecipientProvider is already provided by _authed layout
  return <Outlet />
}
