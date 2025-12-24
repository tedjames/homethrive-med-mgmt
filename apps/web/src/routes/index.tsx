import { SignInButton, SignUpButton, useAuth } from '@clerk/clerk-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/ui/blur-fade'
import { HomethriveLogo } from '~/components/homethrive-logo'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()

  // Redirect logged-in users to appropriate page based on role
  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Default redirect to /my/schedule (role checks happen in layout guards)
      navigate({ to: '/my/schedule' })
    }
  }, [isLoaded, isSignedIn, navigate])

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // If signed in, show loading while redirect happens
  if (isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <HomethriveLogo className="h-5 text-foreground" />
          <div className="flex items-center gap-3">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Register</Button>
            </SignUpButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-4">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/background-hero.png')" }}
        />
        {/* White overlay */}
        <div className="absolute inset-0 bg-white/90" />
        {/* Content */}
        <div className="relative mx-auto max-w-2xl text-center">
          <BlurFade delay={0}>
            <h1 className="font-['Gambarino'] text-5xl sm:text-7xl">
              Medication Management Made Simple
            </h1>
          </BlurFade>
          <BlurFade delay={0.15}>
            <p className="mt-6 text-lg text-muted-foreground">
              Track your medications, set reminders, and stay on top of your health.
              Whether managing your own care or helping a loved one, we've got you covered.
            </p>
          </BlurFade>
          <BlurFade delay={0.3}>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <SignUpButton mode="modal">
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Log In
                </Button>
              </SignInButton>
            </div>
          </BlurFade>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Copyright &copy; 2025 Homethrive, Inc.
        </div>
      </footer>
    </div>
  )
}
