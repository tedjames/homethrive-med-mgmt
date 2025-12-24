import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowUp, Loader2, Pill, Plus } from 'lucide-react'
import {
  useProfile,
  useDaysSchedule,
  useMarkDoseTaken,
  useUnmarkDoseTaken,
  useMedicationsWithSchedules,
  useCreateMedication,
  type DaySchedule,
} from '~/lib/api-hooks'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/ui/blur-fade'
import { ScheduleFeed } from '~/components/schedule-feed'
import { AddMedicationSheet, type MedicationFormData } from '~/components/add-medication-sheet'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty'

export const Route = createFileRoute('/_authed/my/schedule')({
  component: MySchedule,
})

const INITIAL_DAYS = 7
const LOAD_MORE_DAYS = 7

function MySchedule() {
  const { data: profile, isLoading: profileLoading } = useProfile()
  const [daysToLoad, setDaysToLoad] = React.useState(INITIAL_DAYS)
  const [showScrollTop, setShowScrollTop] = React.useState(false)
  const [localDays, setLocalDays] = React.useState<DaySchedule[]>([])
  const [addSheetOpen, setAddSheetOpen] = React.useState(false)
  const loadMoreRef = React.useRef<HTMLDivElement>(null)

  const myRecipientId = profile?.id

  const { data: medications = [], isLoading: medicationsLoading } = useMedicationsWithSchedules(
    myRecipientId
  )
  // Use the recipient's timezone for proper date grouping (per ADR-005)
  const timezone = profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  const { days: apiDays, isLoading: dosesLoading } = useDaysSchedule(
    myRecipientId,
    timezone,
    daysToLoad
  )
  const markDoseTaken = useMarkDoseTaken()
  const unmarkDoseTaken = useUnmarkDoseTaken()
  const createMedication = useCreateMedication()

  const handleAddMedication = (data: MedicationFormData) => {
    if (!myRecipientId) return

    createMedication.mutate(
      {
        recipientId: myRecipientId,
        name: data.name,
        instructions: data.instructions || null,
        schedules: data.schedules.map((s) => ({
          recurrence: s.recurrence,
          timeOfDay: s.timeOfDay,
          daysOfWeek: s.recurrence === 'weekly' ? s.daysOfWeek : null,
          startDate: s.startDate,
        })),
      },
      {
        onSuccess: () => setAddSheetOpen(false),
      }
    )
  }

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
    if (!myRecipientId) return

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
      markDoseTaken.mutate({ doseId, recipientId: myRecipientId })
    } else {
      unmarkDoseTaken.mutate({ doseId, recipientId: myRecipientId })
    }
  }

  if (profileLoading || medicationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Show empty state if no medications exist
  if (medications.length === 0) {
    return (
      <div className="space-y-6 pb-20 md:pb-0">
        <div>
          <h1 className="font-['Gambarino'] text-4xl">My Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Your upcoming medication schedule
          </p>
        </div>

        <Empty className="min-h-[300px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Pill />
            </EmptyMedia>
            <EmptyTitle>No medications yet</EmptyTitle>
            <EmptyDescription>
              Add your first medication to see your schedule.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setAddSheetOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add Medication
            </Button>
          </EmptyContent>
        </Empty>

        <AddMedicationSheet
          open={addSheetOpen}
          onOpenChange={setAddSheetOpen}
          onSubmit={handleAddMedication}
          isLoading={createMedication.isPending}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="font-['Gambarino'] text-4xl">My Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Your upcoming medication schedule
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
