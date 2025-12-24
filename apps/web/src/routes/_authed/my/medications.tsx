import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Pill, Loader2 } from 'lucide-react'
import {
  useProfile,
  useMedicationsWithSchedules,
  useCreateMedication,
  useUpdateMedication,
  useDeactivateMedication,
  useReactivateMedication,
  useDeleteMedication,
  useUpdateSchedule,
  useEndSchedule,
  useAddSchedule,
  type MedicationWithSchedules,
} from '~/lib/api-hooks'
import { MedicationCard } from '~/components/medication-card'
import { AddMedicationSheet, type MedicationFormData } from '~/components/add-medication-sheet'
import { EditMedicationDialog } from '~/components/edit-medication-dialog'
import { type ScheduleFormData } from '~/components/schedule-builder'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/ui/blur-fade'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty'

export const Route = createFileRoute('/_authed/my/medications')({
  component: MyMedications,
})

function MyMedications() {
  const { data: profile, isLoading: profileLoading } = useProfile()
  const [showInactive, setShowInactive] = React.useState(false)
  const [addSheetOpen, setAddSheetOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [selectedMedication, setSelectedMedication] = React.useState<MedicationWithSchedules | null>(null)

  const myRecipientId = profile?.id

  const { data: medications = [], isLoading: medicationsLoading } = useMedicationsWithSchedules(
    myRecipientId,
    { includeInactive: showInactive }
  )
  const createMedication = useCreateMedication()
  const updateMedication = useUpdateMedication()
  const deactivateMedication = useDeactivateMedication()
  const reactivateMedication = useReactivateMedication()
  const deleteMedication = useDeleteMedication()
  const updateSchedule = useUpdateSchedule()
  const endSchedule = useEndSchedule()
  const addSchedule = useAddSchedule()

  // Keep selectedMedication in sync with medications array
  // This ensures the dialog updates when schedules are added/updated/ended
  React.useEffect(() => {
    if (selectedMedication && medications.length > 0) {
      const updated = medications.find((m) => m.id === selectedMedication.id)
      if (updated) {
        // Compare schedules to detect any changes (add, update, end)
        const currentSchedulesKey = JSON.stringify(selectedMedication.schedules.map((s) => s.updatedAt).sort())
        const updatedSchedulesKey = JSON.stringify(updated.schedules.map((s) => s.updatedAt).sort())
        if (currentSchedulesKey !== updatedSchedulesKey || updated.schedules.length !== selectedMedication.schedules.length) {
          setSelectedMedication(updated)
        }
      }
    }
  }, [medications, selectedMedication])

  const handleAddMedication = (data: MedicationFormData) => {
    if (!myRecipientId) return

    createMedication.mutate(
      {
        recipientId: myRecipientId,
        name: data.name,
        instructions: data.instructions || null,
        schedules: data.schedules.map((s) => ({
          recurrence: s.recurrence,
          timeOfDay: s.timeOfDay,
          daysOfWeek: s.recurrence === 'weekly' ? s.daysOfWeek : null,
          startDate: s.startDate,
          dosageNotes: s.dosageNotes || null,
        })),
      },
      {
        onSuccess: () => setAddSheetOpen(false),
      }
    )
  }

  const handleMedicationClick = (medication: MedicationWithSchedules) => {
    setSelectedMedication(medication)
    setEditDialogOpen(true)
  }

  const handleSaveMedication = (updatedMedication: MedicationWithSchedules) => {
    if (!myRecipientId) return

    updateMedication.mutate({
      id: updatedMedication.id,
      recipientId: myRecipientId,
      name: updatedMedication.name,
      instructions: updatedMedication.instructions,
    })
  }

  const handleDeactivateMedication = (medication: MedicationWithSchedules) => {
    if (!myRecipientId) return

    deactivateMedication.mutate({
      id: medication.id,
      recipientId: myRecipientId,
    })
  }

  const handleReactivateMedication = (medication: MedicationWithSchedules) => {
    if (!myRecipientId) return

    reactivateMedication.mutate({
      id: medication.id,
      recipientId: myRecipientId,
    })
  }

  const handleDeleteMedication = (medication: MedicationWithSchedules) => {
    if (!myRecipientId) return

    deleteMedication.mutate(
      {
        id: medication.id,
        recipientId: myRecipientId,
      },
      {
        onSuccess: () => {
          setEditDialogOpen(false)
          setSelectedMedication(null)
        },
      }
    )
  }

  const handleUpdateSchedule = (scheduleId: string, data: ScheduleFormData) => {
    if (!myRecipientId) return

    updateSchedule.mutate({
      scheduleId,
      recipientId: myRecipientId,
      recurrence: data.recurrence,
      timeOfDay: data.timeOfDay,
      daysOfWeek: data.recurrence === 'weekly' ? data.daysOfWeek : null,
      startDate: data.startDate,
      dosageNotes: data.dosageNotes || null,
    })
  }

  const handleEndSchedule = (scheduleId: string) => {
    if (!myRecipientId) return

    endSchedule.mutate({
      scheduleId,
      recipientId: myRecipientId,
    })
  }

  const handleAddSchedule = (medicationId: string, data: ScheduleFormData) => {
    if (!myRecipientId) return

    addSchedule.mutate({
      medicationId,
      recipientId: myRecipientId,
      recurrence: data.recurrence,
      timeOfDay: data.timeOfDay,
      daysOfWeek: data.recurrence === 'weekly' ? data.daysOfWeek : null,
      startDate: data.startDate,
      dosageNotes: data.dosageNotes || null,
    })
  }

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Gambarino'] text-4xl">My Medications</h1>
          <p className="text-sm text-muted-foreground">
            Manage your medications and schedules
          </p>
        </div>
        <Button onClick={() => setAddSheetOpen(true)} disabled={createMedication.isPending}>
          {createMedication.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Plus className="mr-2 size-4" />
          )}
          Add Medication
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="show-inactive"
          checked={showInactive}
          onCheckedChange={setShowInactive}
        />
        <Label htmlFor="show-inactive" className="cursor-pointer">
          Show inactive medications
        </Label>
      </div>

      {medicationsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : medications.length === 0 ? (
        <Empty className="min-h-[300px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Pill />
            </EmptyMedia>
            <EmptyTitle>No medications yet</EmptyTitle>
            <EmptyDescription>
              Add your first medication to start tracking doses.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setAddSheetOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add Medication
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {medications.map((medication, index) => (
            <BlurFade key={medication.id} delay={index * 0.05}>
              <MedicationCard
                medication={medication}
                onClick={handleMedicationClick}
                showActiveBadge={showInactive}
              />
            </BlurFade>
          ))}
        </div>
      )}

      <AddMedicationSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        onSubmit={handleAddMedication}
        isLoading={createMedication.isPending}
      />

      <EditMedicationDialog
        medication={selectedMedication}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveMedication}
        onDeactivate={handleDeactivateMedication}
        onReactivate={handleReactivateMedication}
        onDelete={handleDeleteMedication}
        onUpdateSchedule={handleUpdateSchedule}
        onEndSchedule={handleEndSchedule}
        onAddSchedule={handleAddSchedule}
        isSaving={updateMedication.isPending}
        isDeactivating={deactivateMedication.isPending}
        isReactivating={reactivateMedication.isPending}
        isDeleting={deleteMedication.isPending}
        isUpdatingSchedule={updateSchedule.isPending}
        isEndingSchedule={endSchedule.isPending}
        isAddingSchedule={addSchedule.isPending}
      />
    </div>
  )
}
