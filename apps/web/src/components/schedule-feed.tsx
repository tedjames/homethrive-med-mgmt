import * as React from 'react'
import { Loader2, Sun, Moon, Coffee } from 'lucide-react'
import { type DaySchedule, type MockDose } from '~/lib/mock-data'
import { BlurFade } from '@/components/ui/blur-fade'
import { DoseCard } from './dose-card'

type ScheduleFeedProps = {
  days: DaySchedule[]
  onToggle: (doseId: string, isTaken: boolean) => void
  isLoading?: boolean
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

export function ScheduleFeed({ days, onToggle, isLoading }: ScheduleFeedProps) {
  return (
    <div className="space-y-8">
      {days.map((day) => (
        <DaySection key={day.dateString} day={day} onToggle={onToggle} />
      ))}

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading more days...</span>
        </div>
      )}
    </div>
  )
}

type DaySectionProps = {
  day: DaySchedule
  onToggle: (doseId: string, isTaken: boolean) => void
}

function DaySection({ day, onToggle }: DaySectionProps) {
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
            {formatDateHeader(day.date)}
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
  doses: MockDose[]
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

function formatDateHeader(date: Date): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (isSameDay(date, today)) {
    return 'Today'
  }
  if (isSameDay(date, tomorrow)) {
    return 'Tomorrow'
  }
  if (isSameDay(date, yesterday)) {
    return 'Yesterday'
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}
