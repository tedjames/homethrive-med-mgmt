import * as React from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Input } from '@/components/ui/input'

export type ScheduleFormData = {
  recurrence: 'daily' | 'weekly'
  daysOfWeek: number[]
  timeOfDay: string
  startDate: string
  dosageNotes: string
}

type ScheduleBuilderProps = {
  value: ScheduleFormData
  onChange: (value: ScheduleFormData) => void
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
  { value: 7, label: 'S' },
]

export function ScheduleBuilder({ value, onChange }: ScheduleBuilderProps) {
  const handleRecurrenceChange = (recurrence: 'daily' | 'weekly') => {
    onChange({
      ...value,
      recurrence,
      // Reset days of week when switching to daily
      daysOfWeek: recurrence === 'daily' ? [] : value.daysOfWeek,
    })
  }

  const handleDaysChange = (days: string[]) => {
    onChange({
      ...value,
      daysOfWeek: days.map(Number),
    })
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      timeOfDay: e.target.value,
    })
  }

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      startDate: e.target.value,
    })
  }

  const handleDosageNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      dosageNotes: e.target.value,
    })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Frequency</Label>
        <RadioGroup
          value={value.recurrence}
          onValueChange={(v) => handleRecurrenceChange(v as 'daily' | 'weekly')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="daily" id="daily" />
            <Label htmlFor="daily" className="cursor-pointer font-normal">
              Daily
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="weekly" id="weekly" />
            <Label htmlFor="weekly" className="cursor-pointer font-normal">
              Weekly
            </Label>
          </div>
        </RadioGroup>
      </div>

      {value.recurrence === 'weekly' && (
        <div className="space-y-2">
          <Label>Days of Week</Label>
          <ToggleGroup
            type="multiple"
            value={value.daysOfWeek.map(String)}
            onValueChange={handleDaysChange}
            variant="outline"
            className="flex-wrap justify-start gap-1"
          >
            {DAYS_OF_WEEK.map((day, index) => (
              <ToggleGroupItem
                key={`${day.value}-${index}`}
                value={String(day.value)}
                className="size-9 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {day.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="timeOfDay">Time</Label>
          <Input
            id="timeOfDay"
            type="time"
            value={value.timeOfDay}
            onChange={handleTimeChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={value.startDate}
            onChange={handleStartDateChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dosageNotes">Dosage</Label>
        <Input
          id="dosageNotes"
          type="text"
          placeholder="e.g., 2 pills, 500mg"
          value={value.dosageNotes}
          onChange={handleDosageNotesChange}
          maxLength={255}
        />
      </div>
    </div>
  )
}

export function createDefaultSchedule(): ScheduleFormData {
  const today = new Date().toISOString().split('T')[0]
  return {
    recurrence: 'daily',
    daysOfWeek: [],
    timeOfDay: '08:00',
    startDate: today,
    dosageNotes: '',
  }
}
