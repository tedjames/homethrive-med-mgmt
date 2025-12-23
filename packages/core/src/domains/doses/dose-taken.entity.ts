/**
 * Persisted taken dose event types.
 */

export interface DoseTaken {
  id: string;
  recipientId: string;
  medicationId: string;
  scheduleId: string;
  scheduledFor: Date;
  takenAt: Date;
  takenByUserId: string;
}

export interface MarkDoseTakenInput {
  scheduleId: string;
  scheduledFor: Date;
  takenAt: Date;
  takenByUserId: string;
  recipientId: string;
  medicationId: string;
}
