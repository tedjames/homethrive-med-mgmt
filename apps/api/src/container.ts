/**
 * Dependency injection container.
 * Creates and wires all repositories and services.
 */

import {
  createCareRecipientService,
  createMedicationService,
  createScheduleService,
  createDoseService,
  type CareRecipientService,
  type MedicationService,
  type ScheduleService,
  type DoseService,
} from '@homethrive/core';

import {
  createDb,
  DrizzleCareRecipientRepository,
  DrizzleMedicationRepository,
  DrizzleScheduleRepository,
  DrizzleDoseTakenRepository,
  DrizzleUserRepository,
  type DbClient,
} from '@homethrive/db';

export interface Container {
  db: DbClient;
  userRepository: DrizzleUserRepository;
  careRecipientService: CareRecipientService;
  medicationService: MedicationService;
  scheduleService: ScheduleService;
  doseService: DoseService;
}

export function createContainer(databaseUrl: string): Container {
  // Create database connection
  const db = createDb(databaseUrl);

  // Create repositories
  const userRepository = new DrizzleUserRepository(db);
  const careRecipientRepository = new DrizzleCareRecipientRepository(db);
  const medicationRepository = new DrizzleMedicationRepository(db);
  const scheduleRepository = new DrizzleScheduleRepository(db);
  const doseTakenRepository = new DrizzleDoseTakenRepository(db);

  // Create services
  const careRecipientService = createCareRecipientService(careRecipientRepository);
  const medicationService = createMedicationService(medicationRepository);
  const scheduleService = createScheduleService(scheduleRepository);
  const doseService = createDoseService(scheduleRepository, doseTakenRepository, medicationRepository);

  return {
    db,
    userRepository,
    careRecipientService,
    medicationService,
    scheduleService,
    doseService,
  };
}
