import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Pill } from 'lucide-react'
import { useRecipient } from '~/contexts/recipient-context'
import { getMedicationsForRecipient, type MockMedication } from '~/lib/mock-data'
import { MedicationCard } from '~/components/medication-card'
import { AddMedicationSheet, type MedicationFormData } from '~/components/add-medication-sheet'
import { EditMedicationDialog } from '~/components/edit-medication-dialog'
import { CurrentRecipientBanner } from '~/components/current-recipient-banner'
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

export const Route = createFileRoute('/_authed/care/medications')({
  component: CareMedications,
})

function CareMedications() {
  const { selectedRecipient, selectedRecipientId, recipients } = useRecipient()
  const [showInactive, setShowInactive] = React.useState(false)
  const [addSheetOpen, setAddSheetOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [selectedMedication, setSelectedMedication] = React.useState<MockMedication | null>(null)
  const [medications, setMedications] = React.useState<MockMedication[]>([])

  // Load medications for the selected recipient
  React.useEffect(() => {
    if (selectedRecipientId) {
      const recipientMeds = getMedicationsForRecipient(selectedRecipientId, showInactive)
      setMedications(recipientMeds)
    } else {
      setMedications([])
    }
  }, [selectedRecipientId, showInactive])

  const handleAddMedication = (data: MedicationFormData) => {
    console.log('Adding medication:', data)
  }

  const handleMedicationClick = (medication: MockMedication) => {
    setSelectedMedication(medication)
    setEditDialogOpen(true)
  }

  const handleSaveMedication = (updatedMedication: MockMedication) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === updatedMedication.id ? updatedMedication : m))
    )
    console.log('Saving medication:', updatedMedication)
  }

  // No recipients - show message
  if (recipients.length === 0) {
    return (
      <Empty className="min-h-[400px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Pill />
          </EmptyMedia>
          <EmptyTitle>No Care Recipients</EmptyTitle>
          <EmptyDescription>
            Request access to a care recipient or wait for an invitation to start managing their medications.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  // No selected recipient
  if (!selectedRecipient) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Please select a care recipient</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <CurrentRecipientBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Gambarino'] text-4xl">Medications</h1>
          <p className="hidden text-sm text-muted-foreground md:block">
            Manage medications for {selectedRecipient.displayName}
          </p>
        </div>
        <Button onClick={() => setAddSheetOpen(true)}>
          <Plus className="mr-2 size-4" />
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

      {medications.length === 0 ? (
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
              />
            </BlurFade>
          ))}
        </div>
      )}

      <AddMedicationSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        onSubmit={handleAddMedication}
      />

      <EditMedicationDialog
        medication={selectedMedication}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveMedication}
      />
    </div>
  )
}
