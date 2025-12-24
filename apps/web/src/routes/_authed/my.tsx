import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { useUserRole } from '~/contexts/user-role-context'

export const Route = createFileRoute('/_authed/my')({
  component: MyLayout,
})

function MyLayout() {
  const { isRecipient, isCaregiver } = useUserRole()
  const navigate = useNavigate()

  React.useEffect(() => {
    // If user is not a recipient, redirect to caregiver view or settings
    if (!isRecipient) {
      if (isCaregiver) {
        navigate({ to: '/care/schedule' })
      } else {
        // Neither role - redirect to settings to enable a role
        navigate({ to: '/settings' })
      }
    }
  }, [isRecipient, isCaregiver, navigate])

  // Don't render children if not a recipient
  if (!isRecipient) {
    return null
  }

  return <Outlet />
}
