import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useRecipient } from '~/contexts/recipient-context'
import { getScheduleForDays, type DaySchedule } from '~/lib/mock-data'
import { ScheduleFeed } from '~/components/schedule-feed'
import { CurrentRecipientBanner } from '~/components/current-recipient-banner'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/ui/blur-fade'
import { ArrowUp, UserPlus } from 'lucide-react'

export const Route = createFileRoute('/_authed/care/schedule')({
  component: CareSchedule,
})

const INITIAL_DAYS = 7
const LOAD_MORE_DAYS = 7

function CareSchedule() {
  const { selectedRecipient, selectedRecipientId, recipients } = useRecipient()
  const [days, setDays] = React.useState<DaySchedule[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [daysLoaded, setDaysLoaded] = React.useState(0)
  const [showScrollTop, setShowScrollTop] = React.useState(false)
  const loadMoreRef = React.useRef<HTMLDivElement>(null)

  // Load initial days
  React.useEffect(() => {
    if (selectedRecipientId) {
      const today = new Date()
      const initialDays = getScheduleForDays(selectedRecipientId, today, INITIAL_DAYS)
      setDays(initialDays)
      setDaysLoaded(INITIAL_DAYS)
    } else {
      setDays([])
      setDaysLoaded(0)
    }
  }, [selectedRecipientId])

  // Simulate loading more days (will be replaced with React Query)
  const loadMoreDays = React.useCallback(() => {
    if (!selectedRecipientId || isLoading) return

    setIsLoading(true)

    // Simulate API delay
    setTimeout(() => {
      const today = new Date()
      const startDate = new Date(today)
      startDate.setDate(today.getDate() + daysLoaded)

      const moreDays = getScheduleForDays(selectedRecipientId, startDate, LOAD_MORE_DAYS)
      setDays((prev) => [...prev, ...moreDays])
      setDaysLoaded((prev) => prev + LOAD_MORE_DAYS)
      setIsLoading(false)
    }, 1000)
  }, [selectedRecipientId, isLoading, daysLoaded])

  // Intersection Observer for infinite scroll
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && daysLoaded > 0) {
          loadMoreDays()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [loadMoreDays, isLoading, daysLoaded])

  // Scroll to top button visibility
  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 200)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle marking a dose as taken/untaken
  const handleToggleDose = (doseId: string, isTaken: boolean) => {
    setDays((prev) =>
      prev.map((day) => ({
        ...day,
        morning: day.morning.map((dose) =>
          dose.doseId === doseId
            ? { ...dose, isTaken, takenAt: isTaken ? new Date().toISOString() : null }
            : dose
        ),
        afternoon: day.afternoon.map((dose) =>
          dose.doseId === doseId
            ? { ...dose, isTaken, takenAt: isTaken ? new Date().toISOString() : null }
            : dose
        ),
        evening: day.evening.map((dose) =>
          dose.doseId === doseId
            ? { ...dose, isTaken, takenAt: isTaken ? new Date().toISOString() : null }
            : dose
        ),
      }))
    )
  }

  // No recipients - show onboarding
  if (recipients.length === 0) {
    return <NoRecipientsView />
  }

  // No selected recipient
  if (!selectedRecipient) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Please select a care recipient</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <CurrentRecipientBanner />

      <div>
        <h1 className="font-['Gambarino'] text-4xl">Schedule</h1>
        <p className="hidden text-sm text-muted-foreground md:block">
          Medication schedule for {selectedRecipient.displayName}
        </p>
      </div>

      <ScheduleFeed days={days} onToggle={handleToggleDose} isLoading={isLoading} />

      {/* Intersection observer trigger */}
      <div ref={loadMoreRef} className="h-4" />

      {/* Scroll to top button */}
      {showScrollTop && (
        <BlurFade className="fixed bottom-24 right-4 z-50 md:bottom-8">
          <Button
            onClick={scrollToTop}
            size="icon"
            variant="outline"
            className="size-12 rounded-full bg-white shadow-lg"
            aria-label="Scroll to top"
          >
            <ArrowUp className="size-6 text-violet-400" />
          </Button>
        </BlurFade>
      )}
    </div>
  )
}

function NoRecipientsView() {
  return (
    <Empty className="min-h-[400px]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserPlus />
        </EmptyMedia>
        <EmptyTitle>No Care Recipients</EmptyTitle>
        <EmptyDescription>
          Request access to a care recipient or wait for an invitation to start managing their medications.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>Request Access</Button>
      </EmptyContent>
    </Empty>
  )
}
