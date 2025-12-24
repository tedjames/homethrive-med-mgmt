import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type DateNavigatorProps = {
  date: Date
  onDateChange: (date: Date) => void
}

export function DateNavigator({ date, onDateChange }: DateNavigatorProps) {
  const goToPrevious = () => {
    const newDate = new Date(date)
    newDate.setDate(date.getDate() - 1)
    onDateChange(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(date)
    newDate.setDate(date.getDate() + 1)
    onDateChange(newDate)
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const isToday = isSameDay(date, new Date())

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={goToPrevious}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={goToNext}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-lg font-semibold">{formatDateFull(date)}</span>
        {!isToday && (
          <button
            onClick={goToToday}
            className="text-xs text-primary hover:underline"
          >
            Go to Today
          </button>
        )}
      </div>
      <div className="w-[84px]" /> {/* Spacer for symmetry */}
    </div>
  )
}

function formatDateFull(date: Date): string {
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

// Compact version for mobile
export function DateNavigatorCompact({ date, onDateChange }: DateNavigatorProps) {
  const goToPrevious = () => {
    const newDate = new Date(date)
    newDate.setDate(date.getDate() - 1)
    onDateChange(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(date)
    newDate.setDate(date.getDate() + 1)
    onDateChange(newDate)
  }

  return (
    <div className="flex items-center justify-between">
      <span className="font-medium">{formatDateShort(date)}</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={goToPrevious}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={goToNext}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
