/**
 * Medication domain entity types.
 */

export interface Medication {
  id: string;
  recipientId: string;
  name: string;
  instructions: string | null;
  isActive: boolean;
  inactiveAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMedicationInput {
  name: string;
  instructions?: string | null;
}

export interface UpdateMedicationInput {
  name?: string;
  instructions?: string | null;
}
