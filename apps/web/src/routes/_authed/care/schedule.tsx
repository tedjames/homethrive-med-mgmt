import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useRecipient } from '~/contexts/recipient-context'
import { useDaysSchedule, useMarkDoseTaken, useUnmarkDoseTaken, type DaySchedule } from '~/lib/api-hooks'
import { ScheduleFeed } from '~/components/schedule-feed'
import { CurrentRecipientBanner } from '~/components/current-recipient-banner'
import { RequestAccessDialog } from '~/components/request-access-dialog'
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
import { ArrowUp, UserPlus, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/_authed/care/schedule')({
  component: CareSchedule,
})

const INITIAL_DAYS = 7
const LOAD_MORE_DAYS = 7

function CareSchedule() {
  const { selectedRecipient, selectedRecipientId, recipients, isLoading: recipientsLoading } = useRecipient()
  const [daysToLoad, setDaysToLoad] = React.useState(INITIAL_DAYS)
  const [showScrollTop, setShowScrollTop] = React.useState(false)
  const [localDays, setLocalDays] = React.useState<DaySchedule[]>([])
  const loadMoreRef = React.useRef<HTMLDivElement>(null)

  // Use recipient's timezone for proper cross-timezone support (ADR-005)
  // Falls back to browser timezone if recipient timezone is not set
  const timezone = selectedRecipient?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  const { days: apiDays, isLoading: dosesLoading } = useDaysSchedule(
    selectedRecipientId ?? undefined,
    timezone,
    daysToLoad
  )
  const markDoseTaken = useMarkDoseTaken()
  const unmarkDoseTaken = useUnmarkDoseTaken()

  // Reset when recipient changes
  React.useEffect(() => {
    setDaysToLoad(INITIAL_DAYS)
    setLocalDays([])
  }, [selectedRecipientId])

  // Sync API data to local state for optimistic updates
  // Only sync when not loading to prevent clearing data during "load more"
  React.useEffect(() => {
    if (!dosesLoading) {
      setLocalDays(apiDays)
    }
  }, [apiDays, dosesLoading])

  // Load more days
  const loadMoreDays = React.useCallback(() => {
    if (dosesLoading) return
    setDaysToLoad((prev) => prev + LOAD_MORE_DAYS)
  }, [dosesLoading])

  // Track if we should load more when loading finishes (for cases where user scrolled while loading)
  const shouldLoadMoreRef = React.useRef(false)

  // Intersection Observer for infinite scroll
  React.useEffect(() => {
    const currentRef = loadMoreRef.current
    if (!currentRef) return

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries[0]?.isIntersecting ?? false

        if (isIntersecting && localDays.length > 0) {
          if (dosesLoading) {
            // Mark that we should load more when loading finishes
            shouldLoadMoreRef.current = true
          } else {
            loadMoreDays()
          }
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    observer.observe(currentRef)
    return () => observer.disconnect()
  }, [loadMoreDays, dosesLoading, localDays.length])

  // Handle deferred load more (when user scrolled while loading)
  React.useEffect(() => {
    if (!dosesLoading && shouldLoadMoreRef.current) {
      shouldLoadMoreRef.current = false
      loadMoreDays()
    }
  }, [dosesLoading, loadMoreDays])

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

  // Handle marking a dose as taken/untaken with optimistic update
  const handleToggleDose = (doseId: string, isTaken: boolean) => {
    if (!selectedRecipientId) return

    // Optimistic update
    setLocalDays((prev) =>
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

    // Call API
    if (isTaken) {
      markDoseTaken.mutate({ doseId, recipientId: selectedRecipientId })
    } else {
      unmarkDoseTaken.mutate({ doseId, recipientId: selectedRecipientId })
    }
  }

  // Loading recipients
  if (recipientsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
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

      <ScheduleFeed
        days={localDays}
        timezone={timezone}
        onToggle={handleToggleDose}
        isLoading={dosesLoading}
        onLoadMore={loadMoreDays}
        loadMoreRef={loadMoreRef}
      />

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
  const [dialogOpen, setDialogOpen] = React.useState(false)

  return (
    <>
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
          <Button onClick={() => setDialogOpen(true)}>
            <UserPlus className="mr-2 size-4" />
            Request Access
          </Button>
        </EmptyContent>
      </Empty>

      <RequestAccessDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
