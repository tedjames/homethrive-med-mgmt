import { SignIn, useAuth } from '@clerk/clerk-react'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed')({
  component: AuthedLayout,
})

function AuthedLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  // Show loading state while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Show sign-in if not authenticated
  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center p-12">
        <SignIn routing="hash" forceRedirectUrl={window.location.href} />
      </div>
    )
  }

  // User is authenticated, render children
  return <Outlet />
}
