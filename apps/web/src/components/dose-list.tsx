import { type MockDose, getTimePeriod } from '~/lib/mock-data'
import { DoseCard } from './dose-card'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
import { Pill } from 'lucide-react'

type DoseListProps = {
  doses: MockDose[]
  onToggle: (doseId: string, isTaken: boolean) => void
}

type TimePeriod = 'morning' | 'afternoon' | 'evening'

const PERIOD_LABELS: Record<TimePeriod, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
}

const PERIOD_ORDER: TimePeriod[] = ['morning', 'afternoon', 'evening']

export function DoseList({ doses, onToggle }: DoseListProps) {
  if (doses.length === 0) {
    return <EmptyDoses />
  }

  // Group doses by time period
  const groupedDoses = doses.reduce<Record<TimePeriod, MockDose[]>>(
    (acc, dose) => {
      const period = getTimePeriod(dose.timeOfDay)
      if (!acc[period]) {
        acc[period] = []
      }
      acc[period].push(dose)
      return acc
    },
    { morning: [], afternoon: [], evening: [] }
  )

  // Sort doses within each period by time
  for (const period of PERIOD_ORDER) {
    groupedDoses[period].sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))
  }

  return (
    <div className="space-y-6">
      {PERIOD_ORDER.map((period) => {
        const periodDoses = groupedDoses[period]
        if (periodDoses.length === 0) return null

        return (
          <section key={period}>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {PERIOD_LABELS[period]}
            </h3>
            <div className="space-y-2">
              {periodDoses.map((dose) => (
                <DoseCard key={dose.doseId} dose={dose} onToggle={onToggle} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function EmptyDoses() {
  return (
    <Empty className="min-h-[300px] border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Pill />
        </EmptyMedia>
        <EmptyTitle>No doses scheduled</EmptyTitle>
        <EmptyDescription>
          There are no medications scheduled for this day.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
