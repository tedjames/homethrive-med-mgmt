import * as React from 'react'
import { Loader2, Sun, Moon, Coffee, ChevronDown } from 'lucide-react'
import { type DaySchedule, type Dose, isToday, isTomorrow, isYesterday } from '~/lib/api-hooks'
import { BlurFade } from '@/components/ui/blur-fade'
import { Button } from '@/components/ui/button'
import { DoseCard } from './dose-card'

type ScheduleFeedProps = {
  days: DaySchedule[]
  /** Recipient's IANA timezone for "Today"/"Tomorrow" determination */
  timezone: string
  onToggle: (doseId: string, isTaken: boolean) => void
  isLoading?: boolean
  onLoadMore?: () => void
  loadMoreRef?: React.RefObject<HTMLDivElement | null>
}

type TimePeriod = 'morning' | 'afternoon' | 'evening'

const PERIOD_CONFIG: Record<TimePeriod, { label: string; icon: React.ReactNode }> = {
  morning: {
    label: 'Morning',
    icon: <Coffee className="size-4 text-violet-400" />,
  },
  afternoon: {
    label: 'Afternoon',
    icon: <Sun className="size-4 text-amber-500" />,
  },
  evening: {
    label: 'Evening',
    icon: <Moon className="size-4 text-sky-500" />,
  },
}

export function ScheduleFeed({ days, timezone, onToggle, isLoading, onLoadMore, loadMoreRef }: ScheduleFeedProps) {
  return (
    <div className="space-y-8">
      {days.map((day) => (
        <DaySection key={day.dateString} day={day} timezone={timezone} onToggle={onToggle} />
      ))}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading more days...</span>
        </div>
      )}

      {/* Intersection observer trigger + Load More fallback */}
      {days.length > 0 && !isLoading && (
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Invisible trigger for IntersectionObserver */}
          <div ref={loadMoreRef} className="h-1 w-full" />

          {/* Manual Load More button as fallback */}
          {onLoadMore && (
            <Button
              variant="outline"
              onClick={onLoadMore}
              className="gap-2"
            >
              <ChevronDown className="size-4" />
              Load More Days
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

type DaySectionProps = {
  day: DaySchedule
  timezone: string
  onToggle: (doseId: string, isTaken: boolean) => void
}

function DaySection({ day, timezone, onToggle }: DaySectionProps) {
  // Calculate delay offsets for staggered animations
  let currentOffset = 0
  const morningOffset = currentOffset
  currentOffset += day.morning.length > 0 ? 1 + day.morning.length : 0
  const afternoonOffset = currentOffset
  currentOffset += day.afternoon.length > 0 ? 1 + day.afternoon.length : 0
  const eveningOffset = currentOffset

  return (
    <section className="space-y-4">
      {/* Day Header */}
      <BlurFade delay={0}>
        <div className="sticky top-14 z-[5] -mx-4 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
          <h2 className="font-['Gambarino'] text-2xl text-foreground">
            {formatDateHeader(day.dateString, timezone)}
          </h2>
        </div>
      </BlurFade>

      {/* Time Periods */}
      <div className="space-y-4">
        {day.morning.length > 0 && (
          <TimePeriodSection
            period="morning"
            doses={day.morning}
            onToggle={onToggle}
            delayOffset={morningOffset}
          />
        )}
        {day.afternoon.length > 0 && (
          <TimePeriodSection
            period="afternoon"
            doses={day.afternoon}
            onToggle={onToggle}
            delayOffset={afternoonOffset}
          />
        )}
        {day.evening.length > 0 && (
          <TimePeriodSection
            period="evening"
            doses={day.evening}
            onToggle={onToggle}
            delayOffset={eveningOffset}
          />
        )}
      </div>
    </section>
  )
}

type TimePeriodSectionProps = {
  period: TimePeriod
  doses: Dose[]
  onToggle: (doseId: string, isTaken: boolean) => void
  delayOffset: number
}

function TimePeriodSection({ period, doses, onToggle, delayOffset }: TimePeriodSectionProps) {
  const config = PERIOD_CONFIG[period]

  return (
    <div className="space-y-2">
      <BlurFade delay={delayOffset * 0.05}>
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {config.icon}
          {config.label}
        </h3>
      </BlurFade>
      <div className="space-y-2">
        {doses.map((dose, index) => (
          <BlurFade key={dose.doseId} delay={(delayOffset + 1 + index) * 0.05}>
            <DoseCard dose={dose} onToggle={onToggle} />
          </BlurFade>
        ))}
      </div>
    </div>
  )
}

/**
 * Format the date header using the recipient's timezone for "Today"/"Tomorrow" determination.
 * @param dateString - The date in YYYY-MM-DD format (already in recipient's timezone)
 * @param timezone - The recipient's IANA timezone
 */
function formatDateHeader(dateString: string, timezone: string): string {
  if (isToday(dateString, timezone)) {
    return 'Today'
  }
  if (isTomorrow(dateString, timezone)) {
    return 'Tomorrow'
  }
  if (isYesterday(dateString, timezone)) {
    return 'Yesterday'
  }

  // Parse the dateString and format for display
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}
