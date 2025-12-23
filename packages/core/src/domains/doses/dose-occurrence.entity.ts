/**
 * Computed dose occurrence types.
 */

export interface DoseOccurrence {
  doseId: string;
  scheduleId: string;
  medicationId: string;
  recipientId: string;
  medicationName: string;
  scheduledFor: Date;
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
