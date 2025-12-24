/**
 * Computed dose occurrence types.
 */

export interface DoseOccurrence {
  doseId: string;
  scheduleId: string;
  medicationId: string;
  recipientId: string;
  medicationName: string;
  instructions: string | null;
  dosageNotes: string | null;
  scheduledFor: Date;
  /** Time of day in HH:mm format */
  timeOfDay: string;
  recurrence: 'daily' | 'weekly';
  /** ISO day of week numbers (1=Mon, 7=Sun), null for daily schedules */
  daysOfWeek: number[] | null;
  status: 'scheduled' | 'taken';
  takenAt: Date | null;
  takenByUserId: string | null;
}

export interface DoseKey {
  scheduleId: string;
  scheduledFor: Date;
}

export interface ListDosesFilters {
  from?: Date;
  to?: Date;
  includeInactive?: boolean;
}
