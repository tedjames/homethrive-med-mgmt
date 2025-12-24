import * as React from 'react'
import confetti from 'canvas-confetti'
import { type MockDose, formatTime, formatDaysOfWeek } from '~/lib/mock-data'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

type DoseCardProps = {
  dose: MockDose
  onToggle: (doseId: string, isTaken: boolean) => void
}

export function DoseCard({ dose, onToggle }: DoseCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null)

  const fireConfetti = () => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    // Position confetti at the checkbox (left side with padding + half checkbox width)
    const x = rect.left + 16 + 10 // p-4 (16px) + half of checkbox (10px)
    const y = rect.top + rect.height / 2
    confetti({
      particleCount: 50,
      spread: 60,
      origin: {
        x: x / window.innerWidth,
        y: y / window.innerHeight,
      },
    })
  }

  const handleToggle = () => {
    // Only fire confetti when marking as taken, not when unchecking
    if (!dose.isTaken) {
      fireConfetti()
    }
    onToggle(dose.doseId, !dose.isTaken)
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        'flex cursor-pointer items-start gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30',
        dose.isTaken && 'bg-muted/50 hover:bg-muted/40'
      )}
      onClick={handleToggle}
    >
      <Checkbox
        checked={dose.isTaken}
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={handleToggle}
        className="mt-0.5 size-5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-medium text-foreground">
            {formatTime(dose.timeOfDay)}
          </span>
          <span
            className={cn(
              'text-base font-medium',
              dose.isTaken && 'text-muted-foreground line-through'
            )}
          >
            {dose.medicationName}
          </span>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {dose.recurrence === 'daily' ? (
            <span>Daily</span>
          ) : (
            <span>{dose.daysOfWeek ? formatDaysOfWeek(dose.daysOfWeek) : 'Weekly'}</span>
          )}
          {dose.instructions && (
            <>
              <span className="mx-1">•</span>
              <span>{dose.instructions}</span>
            </>
          )}
        </div>
        {dose.isTaken && dose.takenAt && (
          <div className="mt-1 text-xs text-muted-foreground">
            Taken at {formatTakenTime(dose.takenAt)}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTakenTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
