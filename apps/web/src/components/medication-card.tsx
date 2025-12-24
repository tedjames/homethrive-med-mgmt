import { type MedicationWithSchedules, type Schedule } from '~/lib/api-hooks'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Calendar } from 'lucide-react'

type MedicationCardProps = {
  medication: MedicationWithSchedules
  onClick: (medication: MedicationWithSchedules) => void
  showActiveBadge?: boolean
}

export function MedicationCard({ medication, onClick, showActiveBadge }: MedicationCardProps) {
  return (
    <Card
      className="flex h-full cursor-pointer flex-col transition-colors hover:bg-muted/50"
      onClick={() => onClick(medication)}
    >
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            {medication.name}
            {!medication.isActive && (
              <Badge variant="secondary" className="text-muted-foreground">
                Inactive
              </Badge>
            )}
            {showActiveBadge && medication.isActive && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                Active
              </Badge>
            )}
          </CardTitle>
          {medication.instructions && (
            <p className="text-sm text-muted-foreground">{medication.instructions}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Schedules</h4>
          {medication.schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center gap-4 rounded-md border bg-muted/50 p-3"
            >
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-muted-foreground" />
                <span>{formatTime(schedule.timeOfDay)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                <span>{formatScheduleSummary(schedule)} from {formatStartDate(schedule.startDate)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}

function formatScheduleSummary(schedule: Schedule): string {
  if (schedule.recurrence === 'daily') {
    return 'Daily'
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const days = schedule.daysOfWeek?.sort().map((d) => dayNames[d - 1]) ?? []

  if (days.length === 7) {
    return 'Every day'
  }

  if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) {
    return 'Weekdays'
  }

  if (days.length === 2 && days.includes('Sat') && days.includes('Sun')) {
    return 'Weekends'
  }

  return days.join(', ')
}

function formatStartDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
