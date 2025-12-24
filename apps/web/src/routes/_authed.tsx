import { useAuth, UserButton } from '@clerk/clerk-react'
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import * as React from 'react'
import { CalendarDays, Loader2, Pill, Settings } from 'lucide-react'
import { HomethriveLogo } from '~/components/homethrive-logo'
import { OnboardingProvider, useOnboarding } from '~/contexts/onboarding-context'
import { RecipientProvider } from '~/contexts/recipient-context'
import { UserRoleProvider, useUserRole } from '~/contexts/user-role-context'
import { RecipientSelector } from '~/components/recipient-selector'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_authed')({
  component: AuthedLayout,
})

function AuthedLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()

  // Redirect to landing page if not authenticated
  React.useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate({ to: '/' })
    }
  }, [isLoaded, isSignedIn, navigate])

  // Show loading state while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Show loading while redirect happens
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    )
  }

  // User is authenticated, render app shell with onboarding guard
  return (
    <OnboardingProvider>
      <OnboardingGuard>
        <UserRoleProvider>
          <RecipientProvider>
            <AppShell />
          </RecipientProvider>
        </UserRoleProvider>
      </OnboardingGuard>
    </OnboardingProvider>
  )
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { status, isLoading } = useOnboarding()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!isLoading && status && !status.hasCompletedOnboarding) {
      navigate({ to: '/onboarding' })
    }
  }, [isLoading, status, navigate])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!status?.hasCompletedOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting to onboarding...</div>
      </div>
    )
  }

  return <>{children}</>
}

function AppShell() {
  const isMobile = useIsMobile()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
          <SidebarTrigger className="md:hidden" />
          <div className="flex flex-1 items-center gap-2">
            <HomethriveLogo className="h-4 text-foreground md:hidden" />
          </div>
          <UserButton afterSignOutUrl="/" />
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
        {isMobile && <MobileNav />}
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppSidebar() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const { setOpenMobile, isMobile } = useSidebar()
  const { isRecipient, isCaregiver } = useUserRole()

  const closeSidebarOnMobile = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  // Navigation items for recipient (personal)
  const myNavItems = [
    { to: '/my/schedule', label: 'My Schedule', icon: CalendarDays },
    { to: '/my/medications', label: 'My Medications', icon: Pill },
  ]

  // Navigation items for caregiver (managing others)
  const caregiverNavItems = [
    { to: '/care/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/care/medications', label: 'Medications', icon: Pill },
  ]

  const settingsItem = { to: '/settings', label: 'Settings', icon: Settings }

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex justify-start">
          <HomethriveLogo className="h-5 text-foreground" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        {/* Caregiver Section - Managing others */}
        {isCaregiver && (
          <>
            <div className="px-2 py-2">
              <RecipientSelector onSelect={closeSidebarOnMobile} />
            </div>
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="px-2 text-xs">
                Caregiving
              </SidebarGroupLabel>
              <SidebarMenu>
                {caregiverNavItems.map((item) => (
                  <SidebarMenuItem key={`care-${item.to}`}>
                    <SidebarMenuButton asChild isActive={currentPath === item.to}>
                      <Link to={item.to} onClick={closeSidebarOnMobile}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
            {isRecipient && <Separator className="my-3" />}
          </>
        )}

        {/* Recipient Section - Personal medications */}
        {isRecipient && (
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="px-2 text-xs">
              Care Guide
            </SidebarGroupLabel>
            <SidebarMenu>
              {myNavItems.map((item) => (
                <SidebarMenuItem key={`my-${item.to}`}>
                  <SidebarMenuButton asChild isActive={currentPath === item.to}>
                    <Link to={item.to} onClick={closeSidebarOnMobile}>
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        <Separator className="my-3" />

        {/* Settings */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={currentPath === settingsItem.to}>
              <Link to={settingsItem.to} onClick={closeSidebarOnMobile}>
                <settingsItem.icon className="size-4" />
                <span>{settingsItem.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground">Medication Manager</div>
        <div className="text-xs text-muted-foreground">Copyright &copy; 2025 Homethrive, Inc.</div>
      </SidebarFooter>
    </Sidebar>
  )
}

function MobileNav() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const { isRecipient, isCaregiver } = useUserRole()

  // Mobile nav shows different items based on role
  // Recipients see personal routes, caregivers see care routes
  const navItems = isRecipient
    ? [
        { to: '/my/schedule', label: 'My Schedule', shortLabel: 'Schedule', icon: CalendarDays },
        { to: '/my/medications', label: 'My Meds', shortLabel: 'Meds', icon: Pill },
        { to: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
      ]
    : [
        { to: '/care/schedule', label: 'Schedule', shortLabel: 'Schedule', icon: CalendarDays },
        { to: '/care/medications', label: 'Meds', shortLabel: 'Meds', icon: Pill },
        { to: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
      ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = currentPath === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className="size-5" />
              <span>{item.shortLabel}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
