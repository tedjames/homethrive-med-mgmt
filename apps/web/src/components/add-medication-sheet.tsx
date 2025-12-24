import * as React from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScheduleBuilder, createDefaultSchedule, type ScheduleFormData } from './schedule-builder'

type AddMedicationSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: MedicationFormData) => void
  isLoading?: boolean
}

export type MedicationFormData = {
  name: string
  instructions: string
  schedules: ScheduleFormData[]
}

export function AddMedicationSheet({ open, onOpenChange, onSubmit, isLoading }: AddMedicationSheetProps) {
  const [name, setName] = React.useState('')
  const [instructions, setInstructions] = React.useState('')
  const [schedules, setSchedules] = React.useState<ScheduleFormData[]>([createDefaultSchedule()])

  const resetForm = () => {
    setName('')
    setInstructions('')
    setSchedules([createDefaultSchedule()])
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name,
      instructions,
      schedules,
    })
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

  const isValid = name.trim() && schedules.every((s) => {
    if (s.recurrence === 'weekly' && s.daysOfWeek.length === 0) return false
    return s.timeOfDay && s.startDate
  })

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>Add Medication</SheetTitle>
            <SheetDescription>
              Add a new medication with its schedule. Medications must have at least one schedule.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 px-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="name">Medication Name</Label>
              <Input
                id="name"
                placeholder="e.g., Metformin, Vitamin D"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions (optional)</Label>
              <Textarea
                id="instructions"
                placeholder="e.g., Take with food, Do not crush"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
              />
            </div>

            <Separator />

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

          <SheetFooter className="flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!isValid || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Medication'
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
