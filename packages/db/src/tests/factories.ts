import type {
  CreateMedicationInput,
  CreateScheduleInput,
  CreateCareRecipientInput,
} from '@homethrive/core';
import { eq } from 'drizzle-orm';

import type { DbClient } from '../connection.js';
import {
  DrizzleCareRecipientRepository,
  DrizzleMedicationRepository,
  DrizzleScheduleRepository,
} from '../repositories/index.js';
import { users } from '../schema/core.js';

export function createDbFactories(db: DbClient) {
  const careRecipients = new DrizzleCareRecipientRepository(db);
  const medications = new DrizzleMedicationRepository(db);
  const schedules = new DrizzleScheduleRepository(db);

  async function createUser(
    clerkUserId: string,
    overrides?: Partial<{ email: string | null; displayName: string | null; imageUrl: string | null }>
  ) {
    const inserted = await db
      .insert(users)
      .values({
        clerkUserId,
        email: overrides?.email,
        displayName: overrides?.displayName,
        imageUrl: overrides?.imageUrl,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted[0]) return inserted[0];

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    return existing[0]!;
  }

  async function createCareRecipient(
    userId: string,
    overrides?: Partial<CreateCareRecipientInput>
  ) {
    await createUser(userId);
    return careRecipients.create(userId, {
      displayName: overrides?.displayName ?? 'Test Recipient',
      timezone: overrides?.timezone,
    });
  }

  async function createMedication(
    userId: string,
    recipientId: string,
    overrides?: Partial<CreateMedicationInput>
  ) {
    return medications.create(userId, recipientId, {
      name: overrides?.name ?? 'Test Medication',
      instructions: overrides?.instructions,
    });
  }

  async function createSchedules(
    userId: string,
    inputs: Array<Omit<CreateScheduleInput, 'medicationId'> & { medicationId: string }>
  ) {
    return schedules.createMany(userId, inputs);
  }

  return { createUser, createCareRecipient, createMedication, createSchedules };
}
