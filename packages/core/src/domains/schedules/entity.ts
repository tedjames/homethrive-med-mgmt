/**
 * Medication schedule domain entity types.
 */

export type RecurrenceType = 'daily' | 'weekly';

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  recurrence: RecurrenceType;
  timeOfDay: string;
  timezone: string | null;
  daysOfWeek: number[] | null;
  startDate: string;
  endDate: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScheduleInput {
  medicationId: string;
  recurrence: RecurrenceType;
  timeOfDay: string;
  timezone?: string | null;
  daysOfWeek?: number[] | null;
  startDate: string;
  endDate?: string | null;
}

/**
 * Input for creating schedules during medication creation.
 * The medicationId is not known yet (it will be generated), so it's omitted.
 */
export type CreateScheduleForMedicationInput = Omit<CreateScheduleInput, 'medicationId'>;
