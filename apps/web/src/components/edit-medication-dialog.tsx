import * as React from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type MedicationWithSchedules, type Schedule } from '~/lib/api-hooks'
import { ConfirmDialog } from './confirm-dialog'
import { ScheduleBuilder, createDefaultSchedule, type ScheduleFormData } from './schedule-builder'

type EditMedicationDialogProps = {
  medication: MedicationWithSchedules | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (medication: MedicationWithSchedules) => void
  onDeactivate?: (medication: MedicationWithSchedules) => void
  onReactivate?: (medication: MedicationWithSchedules) => void
  onDelete?: (medication: MedicationWithSchedules) => void
  onUpdateSchedule?: (scheduleId: string, data: ScheduleFormData) => void
  onEndSchedule?: (scheduleId: string) => void
  onAddSchedule?: (medicationId: string, data: ScheduleFormData) => void
  isSaving?: boolean
  isDeactivating?: boolean
  isReactivating?: boolean
  isDeleting?: boolean
  isUpdatingSchedule?: boolean
  isEndingSchedule?: boolean
  isAddingSchedule?: boolean
}

export function EditMedicationDialog({
  medication,
  open,
  onOpenChange,
  onSave,
  onDeactivate,
  onReactivate,
  onDelete,
  onUpdateSchedule,
  onEndSchedule,
  onAddSchedule,
  isSaving,
  isDeactivating,
  isReactivating,
  isDeleting,
  isUpdatingSchedule,
  isEndingSchedule,
  isAddingSchedule,
}: EditMedicationDialogProps) {
  const [name, setName] = React.useState('')
  const [instructions, setInstructions] = React.useState('')
  const [confirmDeactivate, setConfirmDeactivate] = React.useState(false)
  const [confirmReactivate, setConfirmReactivate] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [confirmEndScheduleId, setConfirmEndScheduleId] = React.useState<string | null>(null)

  // Schedule editing state
  const [editingScheduleId, setEditingScheduleId] = React.useState<string | null>(null)
  const [editingScheduleData, setEditingScheduleData] = React.useState<ScheduleFormData | null>(null)
  const [isAddingNewSchedule, setIsAddingNewSchedule] = React.useState(false)
  const [newScheduleData, setNewScheduleData] = React.useState<ScheduleFormData | null>(null)

  // Sync form state when medication changes
  React.useEffect(() => {
    if (medication) {
      setName(medication.name)
      setInstructions(medication.instructions || '')
      // Reset schedule editing state
      setEditingScheduleId(null)
      setEditingScheduleData(null)
      setIsAddingNewSchedule(false)
      setNewScheduleData(null)
    }
  }, [medication])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!medication) return

    onSave({
      ...medication,
      name,
      instructions: instructions || null,
    })
  }

  const handleDeactivate = () => {
    if (!medication || !onDeactivate) return
    onDeactivate(medication)
    setConfirmDeactivate(false)
  }

  const handleReactivate = () => {
    if (!medication || !onReactivate) return
    onReactivate(medication)
    setConfirmReactivate(false)
  }

  const handleDelete = () => {
    if (!medication || !onDelete) return
    onDelete(medication)
    setConfirmDelete(false)
  }

  const handleStartEditSchedule = (schedule: Schedule) => {
    setEditingScheduleId(schedule.id)
    setEditingScheduleData({
      recurrence: schedule.recurrence,
      daysOfWeek: schedule.daysOfWeek ?? [],
      timeOfDay: schedule.timeOfDay,
      startDate: schedule.startDate,
      dosageNotes: schedule.dosageNotes ?? '',
    })
  }

  const handleCancelEditSchedule = () => {
    setEditingScheduleId(null)
    setEditingScheduleData(null)
  }

  const handleSaveSchedule = () => {
    if (!editingScheduleId || !editingScheduleData || !onUpdateSchedule) return
    onUpdateSchedule(editingScheduleId, editingScheduleData)
    setEditingScheduleId(null)
    setEditingScheduleData(null)
  }

  const handleEndSchedule = () => {
    if (!confirmEndScheduleId || !onEndSchedule) return
    onEndSchedule(confirmEndScheduleId)
    setConfirmEndScheduleId(null)
  }

  const handleStartAddSchedule = () => {
    setIsAddingNewSchedule(true)
    setNewScheduleData(createDefaultSchedule())
  }

  const handleCancelAddSchedule = () => {
    setIsAddingNewSchedule(false)
    setNewScheduleData(null)
  }

  const handleSaveNewSchedule = () => {
    if (!medication || !newScheduleData || !onAddSchedule) return
    onAddSchedule(medication.id, newScheduleData)
    setIsAddingNewSchedule(false)
    setNewScheduleData(null)
  }

  // Helper to check if a schedule is active (no endDate or endDate in the future)
  const isScheduleActive = (schedule: Schedule) => {
    if (!schedule.endDate) return true
    const today = new Date().toISOString().split('T')[0]!
    return schedule.endDate > today
  }

  const activeScheduleCount = medication?.schedules.filter(isScheduleActive).length ?? 0

  const isScheduleFormValid = (data: ScheduleFormData | null) => {
    if (!data) return false
    if (data.recurrence === 'weekly' && data.daysOfWeek.length === 0) return false
    return data.timeOfDay && data.startDate
  }

  const isValid = name.trim().length > 0
  const isLoading = isSaving || isDeactivating || isReactivating || isDeleting || isUpdatingSchedule || isEndingSchedule || isAddingSchedule

  if (!medication) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {medication.name}
                {!medication.isActive && (
                  <Badge variant="secondary" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Update medication details or deactivate if no longer needed.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-6">
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
                    disabled={!medication.isActive || isLoading}
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
                    disabled={!medication.isActive || isLoading}
                  />
                </div>
              </div>

              <Separator />

              {/* Schedules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Schedules</Label>
                  {medication.isActive && onAddSchedule && !isAddingNewSchedule && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleStartAddSchedule}
                      disabled={isLoading}
                    >
                      <Plus className="mr-1 size-4" />
                      Add Schedule
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {medication.schedules.map((schedule) => {
                    const isActive = isScheduleActive(schedule)
                    const isEditing = editingScheduleId === schedule.id

                    if (isEditing && editingScheduleData) {
                      // Editing mode
                      return (
                        <div key={schedule.id} className="space-y-4 rounded-lg border bg-muted/30 p-4">
                          <span className="text-sm font-medium">Edit Schedule</span>
                          <ScheduleBuilder
                            value={editingScheduleData}
                            onChange={setEditingScheduleData}
                          />
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleSaveSchedule}
                                disabled={isLoading || !isScheduleFormValid(editingScheduleData)}
                              >
                                {isUpdatingSchedule ? (
                                  <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  'Save Schedule'
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEditSchedule}
                                disabled={isLoading}
                              >
                                Cancel
                              </Button>
                            </div>
                            {onEndSchedule && activeScheduleCount > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setConfirmEndScheduleId(schedule.id)}
                                disabled={isLoading}
                              >
                                <Trash2 className="size-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    }

                    // Display mode
                    return (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between gap-4 rounded-md border bg-muted/50 p-3 text-sm"
                      >
                        <div className="flex items-center gap-4">
                          <span>{formatTime(schedule.timeOfDay)}</span>
                          {schedule.dosageNotes && (
                            <span className="font-medium">
                              {schedule.dosageNotes}
                            </span>
                          )}
                          <span className="text-muted-foreground">
                            {formatScheduleSummary(schedule)}
                          </span>
                          <span className="text-muted-foreground">
                            from {formatStartDate(schedule.startDate)}
                          </span>
                          {!isActive && (
                            <Badge variant="secondary" className="text-muted-foreground">
                              Ended
                            </Badge>
                          )}
                        </div>
                        {medication.isActive && isActive && onUpdateSchedule && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleStartEditSchedule(schedule)}
                            disabled={isLoading || editingScheduleId !== null || isAddingNewSchedule}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        )}
                      </div>
                    )
                  })}

                  {/* Add new schedule form */}
                  {isAddingNewSchedule && newScheduleData && (
                    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <span className="text-sm font-medium">New Schedule</span>
                      <ScheduleBuilder
                        value={newScheduleData}
                        onChange={setNewScheduleData}
                      />
                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveNewSchedule}
                          disabled={isLoading || !isScheduleFormValid(newScheduleData)}
                        >
                          {isAddingSchedule ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            'Add Schedule'
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelAddSchedule}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Deactivate Option (for active medications) */}
              {medication.isActive && onDeactivate && (
                <>
                  <Separator />
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Deactivate Medication</p>
                        <p className="text-xs text-muted-foreground">
                          This will stop tracking doses but keep the history.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmDeactivate(true)}
                        disabled={isLoading}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Reactivate Option (for inactive medications) */}
              {!medication.isActive && onReactivate && (
                <>
                  <Separator />
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Reactivate Medication</p>
                        <p className="text-xs text-muted-foreground">
                          Resume tracking doses for this medication.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setConfirmReactivate(true)}
                        disabled={isLoading}
                      >
                        Reactivate
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Permanently Delete Option (for inactive medications only) */}
              {!medication.isActive && onDelete && (
                <>
                  <Separator />
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Permanently Delete</p>
                        <p className="text-xs text-muted-foreground">
                          Delete this medication and all its dose history. This cannot be undone.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmDelete(true)}
                        disabled={isLoading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              {medication.isActive && (
                <Button type="submit" disabled={!isValid || isLoading}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title="Deactivate Medication"
        description={`Are you sure you want to deactivate ${medication.name}? Doses will no longer be tracked, but historical data will be preserved.`}
        confirmLabel={isDeactivating ? 'Deactivating...' : 'Deactivate'}
        onConfirm={handleDeactivate}
        variant="destructive"
      />

      <ConfirmDialog
        open={confirmReactivate}
        onOpenChange={setConfirmReactivate}
        title="Reactivate Medication"
        description={`Are you sure you want to reactivate ${medication.name}? Doses will start being tracked again.`}
        confirmLabel={isReactivating ? 'Reactivating...' : 'Reactivate'}
        onConfirm={handleReactivate}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Permanently Delete Medication"
        description={`This will permanently delete ${medication.name} and all its dose history. This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Permanently'}
        onConfirm={handleDelete}
        variant="destructive"
      />

      <ConfirmDialog
        open={confirmEndScheduleId !== null}
        onOpenChange={(open) => !open && setConfirmEndScheduleId(null)}
        title="End Schedule"
        description="This will end this schedule. No new doses will be generated, but historical dose records will be preserved."
        confirmLabel={isEndingSchedule ? 'Ending...' : 'End Schedule'}
        onConfirm={handleEndSchedule}
        variant="destructive"
      />
    </>
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

  return days.join(', ')
}

function formatStartDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
