import { type MockMedication, formatTime, formatScheduleSummary } from '~/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Calendar } from 'lucide-react'

type MedicationCardProps = {
  medication: MockMedication
  onClick: (medication: MockMedication) => void
}

export function MedicationCard({ medication, onClick }: MedicationCardProps) {
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
                <span>{formatScheduleSummary(schedule)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
