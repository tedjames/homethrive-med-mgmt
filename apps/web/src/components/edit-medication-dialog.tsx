import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScheduleBuilder, createDefaultSchedule, type ScheduleFormData } from './schedule-builder'
import { type MockMedication } from '~/lib/mock-data'

type EditMedicationDialogProps = {
  medication: MockMedication | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (medication: MockMedication) => void
}

export function EditMedicationDialog({
  medication,
  open,
  onOpenChange,
  onSave,
}: EditMedicationDialogProps) {
  const [name, setName] = React.useState('')
  const [instructions, setInstructions] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)
  const [schedules, setSchedules] = React.useState<ScheduleFormData[]>([])

  // Sync form state when medication changes
  React.useEffect(() => {
    if (medication) {
      setName(medication.name)
      setInstructions(medication.instructions || '')
      setIsActive(medication.isActive)
      setSchedules(
        medication.schedules.map((s) => ({
          recurrence: s.recurrence,
          daysOfWeek: s.daysOfWeek || [],
          timeOfDay: s.timeOfDay,
          startDate: s.startDate,
        }))
      )
    }
  }, [medication])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!medication) return

    onSave({
      ...medication,
      name,
      instructions: instructions || null,
      isActive,
      schedules: schedules.map((s, index) => ({
        id: medication.schedules[index]?.id || `new-${index}`,
        recurrence: s.recurrence,
        timeOfDay: s.timeOfDay,
        startDate: s.startDate,
        ...(s.recurrence === 'weekly' ? { daysOfWeek: s.daysOfWeek } : {}),
      })),
    })
    toast.success('Medication updated', {
      description: `${name} has been saved successfully.`,
    })
    onOpenChange(false)
  }

  const handleAddSchedule = () => {
    setSchedules([...schedules, createDefaultSchedule()])
  }

  const handleRemoveSchedule = (index: number) => {
    if (schedules.length > 1) {
      setSchedules(schedules.filter((_, i) => i !== index))
    }
  }

  const handleScheduleChange = (index: number, schedule: ScheduleFormData) => {
    const newSchedules = [...schedules]
    newSchedules[index] = schedule
    setSchedules(newSchedules)
  }

  const isValid =
    name.trim() &&
    schedules.length > 0 &&
    schedules.every((s) => {
      if (s.recurrence === 'weekly' && s.daysOfWeek.length === 0) return false
      return s.timeOfDay && s.startDate
    })

  if (!medication) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{medication.name}</DialogTitle>
            <DialogDescription>
              Update medication details, schedules, or change its status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Status Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="active-switch" className="text-base">
                  Active
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isActive
                    ? 'This medication is currently active'
                    : 'This medication is deactivated'}
                </p>
              </div>
              <Switch
                id="active-switch"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <Separator />

            {/* Medication Details */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Medication Name</Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., Metformin, Vitamin D"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-instructions">Instructions (optional)</Label>
                <Textarea
                  id="edit-instructions"
                  placeholder="e.g., Take with food, Do not crush"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Schedules */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Schedules</Label>
                <Button type="button" variant="ghost" size="sm" onClick={handleAddSchedule}>
                  <Plus className="mr-1 size-4" />
                  Add Schedule
                </Button>
              </div>

              {schedules.map((schedule, index) => (
                <div key={index} className="space-y-4 rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Schedule {index + 1}</span>
                    {schedules.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveSchedule(index)}
                      >
                        <Trash2 className="size-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  <ScheduleBuilder
                    value={schedule}
                    onChange={(s) => handleScheduleChange(index, s)}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
