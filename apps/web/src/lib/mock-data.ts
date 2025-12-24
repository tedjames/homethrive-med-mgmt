// Mock data for Phase 0 - UI Design
// This file mirrors API response shapes and will be replaced with real API calls in Phase 3

export type MockRecipient = {
  id: string
  displayName: string
  timezone: string
}

export type MockSchedule = {
  id: string
  recurrence: 'daily' | 'weekly'
  timeOfDay: string
  daysOfWeek?: number[]
  startDate: string
}

export type MockMedication = {
  id: string
  recipientId: string
  name: string
  instructions: string | null
  isActive: boolean
  schedules: MockSchedule[]
}

export type MockDose = {
  doseId: string
  scheduleId: string
  medicationId: string
  medicationName: string
  instructions: string | null
  scheduledFor: string
  timeOfDay: string
  recurrence: 'daily' | 'weekly'
  daysOfWeek?: number[]
  isTaken: boolean
  takenAt: string | null
}

export const MOCK_RECIPIENTS: MockRecipient[] = [
  { id: '1', displayName: 'Mom', timezone: 'America/New_York' },
  { id: '2', displayName: 'Dad', timezone: 'America/New_York' },
  { id: 'self', displayName: 'Me', timezone: 'America/New_York' },
]

export const MOCK_MEDICATIONS: MockMedication[] = [
  {
    id: '1',
    recipientId: '1',
    name: 'Metformin',
    instructions: 'Take with breakfast',
    isActive: true,
    schedules: [
      { id: 's1', recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-12-01' },
    ],
  },
  {
    id: '2',
    recipientId: '1',
    name: 'Vitamin D',
    instructions: null,
    isActive: true,
    schedules: [
      { id: 's2', recurrence: 'weekly', timeOfDay: '14:00', daysOfWeek: [1, 3, 5], startDate: '2024-12-01' },
    ],
  },
  {
    id: '3',
    recipientId: '1',
    name: 'Lipitor',
    instructions: null,
    isActive: true,
    schedules: [
      { id: 's3', recurrence: 'daily', timeOfDay: '20:00', startDate: '2024-12-01' },
    ],
  },
  {
    id: '4',
    recipientId: '1',
    name: 'Aspirin',
    instructions: 'Take with water',
    isActive: false,
    schedules: [
      { id: 's4', recurrence: 'daily', timeOfDay: '09:00', startDate: '2024-11-01' },
    ],
  },
  {
    id: '5',
    recipientId: '2',
    name: 'Blood Pressure Med',
    instructions: 'Take in the morning',
    isActive: true,
    schedules: [
      { id: 's5', recurrence: 'daily', timeOfDay: '07:00', startDate: '2024-12-01' },
    ],
  },
  // Personal medications (for "My" pages)
  {
    id: '6',
    recipientId: 'self',
    name: 'Multivitamin',
    instructions: 'Take with food',
    isActive: true,
    schedules: [
      { id: 's6', recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-12-01' },
    ],
  },
  {
    id: '7',
    recipientId: 'self',
    name: 'Fish Oil',
    instructions: null,
    isActive: true,
    schedules: [
      { id: 's7', recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-12-01' },
    ],
  },
  {
    id: '8',
    recipientId: 'self',
    name: 'Allergy Med',
    instructions: 'Take before bed',
    isActive: true,
    schedules: [
      { id: 's8', recurrence: 'daily', timeOfDay: '21:00', startDate: '2024-12-01' },
    ],
  },
  {
    id: '9',
    recipientId: 'self',
    name: 'Calcium',
    instructions: null,
    isActive: true,
    schedules: [
      { id: 's9', recurrence: 'weekly', timeOfDay: '12:00', daysOfWeek: [1, 4], startDate: '2024-12-01' },
    ],
  },
]

// Helper to generate dose ID
function generateDoseId(scheduleId: string, scheduledFor: string): string {
  return `v1:${scheduleId}:${scheduledFor}`
}

// Generate mock doses for today
const today = new Date()
const todayISO = today.toISOString().split('T')[0]

export const MOCK_DOSES: MockDose[] = [
  {
    doseId: generateDoseId('s1', `${todayISO}T13:00:00Z`),
    scheduleId: 's1',
    medicationId: '1',
    medicationName: 'Metformin',
    instructions: 'Take with breakfast',
    scheduledFor: `${todayISO}T13:00:00Z`,
    timeOfDay: '08:00',
    recurrence: 'daily',
    isTaken: false,
    takenAt: null,
  },
  {
    doseId: generateDoseId('s2', `${todayISO}T19:00:00Z`),
    scheduleId: 's2',
    medicationId: '2',
    medicationName: 'Vitamin D',
    instructions: null,
    scheduledFor: `${todayISO}T19:00:00Z`,
    timeOfDay: '14:00',
    recurrence: 'weekly',
    daysOfWeek: [1, 3, 5],
    isTaken: true,
    takenAt: `${todayISO}T19:05:00Z`,
  },
  {
    doseId: generateDoseId('s3', `${todayISO}T01:00:00Z`),
    scheduleId: 's3',
    medicationId: '3',
    medicationName: 'Lipitor',
    instructions: null,
    scheduledFor: `${todayISO}T01:00:00Z`,
    timeOfDay: '20:00',
    recurrence: 'daily',
    isTaken: false,
    takenAt: null,
  },
  {
    doseId: generateDoseId('s5', `${todayISO}T12:00:00Z`),
    scheduleId: 's5',
    medicationId: '5',
    medicationName: 'Blood Pressure Med',
    instructions: 'Take in the morning',
    scheduledFor: `${todayISO}T12:00:00Z`,
    timeOfDay: '07:00',
    recurrence: 'daily',
    isTaken: false,
    takenAt: null,
  },
]

// Helper to get medications for a recipient
export function getMedicationsForRecipient(recipientId: string, showInactive = false) {
  return MOCK_MEDICATIONS.filter(
    (m) => m.recipientId === recipientId && (showInactive || m.isActive)
  )
}

// Helper to get doses for a recipient on a specific date
export function getDosesForRecipient(recipientId: string, _date: Date) {
  // For mock data, we just filter by recipient via medication
  const recipientMedIds = MOCK_MEDICATIONS
    .filter((m) => m.recipientId === recipientId)
    .map((m) => m.id)

  return MOCK_DOSES.filter((d) => recipientMedIds.includes(d.medicationId))
}

// Helper to format time from 24h to 12h
export function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

// Helper to get time period
export function getTimePeriod(time24: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(time24.split(':')[0], 10)
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

// Helper to format days of week
export function formatDaysOfWeek(days: number[]): string {
  const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((d) => dayNames[d]).join(', ')
}

// Helper to format schedule summary
export function formatScheduleSummary(schedule: MockSchedule): string {
  if (schedule.recurrence === 'daily') {
    return 'Daily'
  }
  if (schedule.daysOfWeek) {
    return formatDaysOfWeek(schedule.daysOfWeek)
  }
  return 'Weekly'
}

// Type for a day's doses grouped by time period
export type DaySchedule = {
  date: Date
  dateString: string
  morning: MockDose[]
  afternoon: MockDose[]
  evening: MockDose[]
}

// Generate mock doses for a specific date with some variety
function generateDosesForDate(recipientId: string, date: Date): MockDose[] {
  const dateISO = date.toISOString().split('T')[0]
  const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, etc.
  const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek // Convert to ISO (1 = Monday, 7 = Sunday)

  const recipientMeds = MOCK_MEDICATIONS.filter(
    (m) => m.recipientId === recipientId && m.isActive
  )

  const doses: MockDose[] = []

  for (const med of recipientMeds) {
    for (const schedule of med.schedules) {
      // Check if this schedule applies to this day
      let applies = false
      if (schedule.recurrence === 'daily') {
        applies = true
      } else if (schedule.recurrence === 'weekly' && schedule.daysOfWeek) {
        applies = schedule.daysOfWeek.includes(isoDayOfWeek)
      }

      if (applies) {
        const scheduledFor = `${dateISO}T${schedule.timeOfDay}:00Z`
        // Randomly mark some past doses as taken for variety
        const isPast = new Date(scheduledFor) < new Date()
        const isTaken = isPast && Math.random() > 0.3

        doses.push({
          doseId: generateDoseId(schedule.id, scheduledFor),
          scheduleId: schedule.id,
          medicationId: med.id,
          medicationName: med.name,
          instructions: med.instructions,
          scheduledFor,
          timeOfDay: schedule.timeOfDay,
          recurrence: schedule.recurrence,
          daysOfWeek: schedule.daysOfWeek,
          isTaken,
          takenAt: isTaken ? `${dateISO}T${schedule.timeOfDay}:05:00Z` : null,
        })
      }
    }
  }

  return doses
}

// Get schedule for multiple days (for infinite scroll)
export function getScheduleForDays(recipientId: string, startDate: Date, numDays: number): DaySchedule[] {
  const days: DaySchedule[] = []

  for (let i = 0; i < numDays; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)

    const doses = generateDosesForDate(recipientId, date)

    // Group by time period
    const morning = doses.filter(d => getTimePeriod(d.timeOfDay) === 'morning')
      .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))
    const afternoon = doses.filter(d => getTimePeriod(d.timeOfDay) === 'afternoon')
      .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))
    const evening = doses.filter(d => getTimePeriod(d.timeOfDay) === 'evening')
      .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))

    days.push({
      date,
      dateString: date.toISOString().split('T')[0],
      morning,
      afternoon,
      evening,
    })
  }

  return days
}
