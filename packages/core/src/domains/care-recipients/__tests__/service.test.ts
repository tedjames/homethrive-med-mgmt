/**
 * Service tests for the Care Recipient domain.
 */

import { describe, expect, it, vi } from 'vitest';

import type { UserId } from '../../../shared/types.js';
import { CareRecipientNotFoundError } from '../errors.js';
import { createCareRecipientService } from '../service.js';
import type { CareRecipientRepository } from '../repository.js';

function createRepoStub(overrides: Partial<CareRecipientRepository> = {}): CareRecipientRepository {
  return {
    findById: vi.fn(async () => null),
    listForCaregiver: vi.fn(async () => []),
    create: vi.fn(async () => {
      throw new Error('not implemented');
    }),
    update: vi.fn(async () => null),
    findByUserId: vi.fn(async () => null),
    findOrCreateOwnProfile: vi.fn(async () => {
      throw new Error('not implemented');
    }),
    ...overrides,
  };
}

describe('createCareRecipientService', () => {
  const userId: UserId = 'user_123';

  it('create delegates to repository', async () => {
    const repo = createRepoStub({
      create: vi.fn(async (uid, input) => ({
        id: 'recipient-1',
        userId: null,
        createdByUserId: uid,
        displayName: input.displayName,
        timezone: input.timezone ?? 'America/New_York',
        createdAt: new Date('2024-12-01T00:00:00Z'),
        updatedAt: new Date('2024-12-01T00:00:00Z'),
      })),
    });

    const service = createCareRecipientService(repo);
    const recipient = await service.create(userId, {
      displayName: 'Grandma',
      timezone: 'America/New_York',
    });

    expect(recipient.id).toBe('recipient-1');
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(repo.create).toHaveBeenCalledWith(userId, { displayName: 'Grandma', timezone: 'America/New_York' });
  });

  it('getById throws CareRecipientNotFoundError when missing', async () => {
    const repo = createRepoStub({
      findById: vi.fn(async () => null),
    });

    const service = createCareRecipientService(repo);

    await expect(service.getById(userId, 'missing')).rejects.toBeInstanceOf(CareRecipientNotFoundError);
    await expect(service.getById(userId, 'missing')).rejects.toMatchObject({
      name: 'CareRecipientNotFoundError',
    });
  });

  it('update throws CareRecipientNotFoundError when missing', async () => {
    const repo = createRepoStub({
      update: vi.fn(async () => null),
    });

    const service = createCareRecipientService(repo);

    await expect(service.update(userId, 'missing', { displayName: 'X' })).rejects.toBeInstanceOf(
      CareRecipientNotFoundError
    );
  });

  it('getById returns NotFound when userId does not match', async () => {
    const repo = createRepoStub({
      findById: vi.fn(async (uid, id) => {
        if (uid !== 'owner_123' || id !== 'recipient-1') return null;
        return {
          id: 'recipient-1',
          userId: null,
          createdByUserId: 'owner_123',
          displayName: 'Grandma',
          timezone: 'America/New_York',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
    });

    const service = createCareRecipientService(repo);

    // Different user should not see the recipient
    await expect(service.getById('other_user', 'recipient-1')).rejects.toBeInstanceOf(
      CareRecipientNotFoundError
    );
  });

  it('listForCaregiver delegates to repo', async () => {
    const repo = createRepoStub({
      listForCaregiver: vi.fn(async () => [
        {
          id: 'recipient-1',
          userId: null,
          createdByUserId: userId,
          displayName: 'Grandma',
          timezone: 'America/New_York',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const service = createCareRecipientService(repo);
    const recipients = await service.listForCaregiver(userId);

    expect(recipients).toHaveLength(1);
    expect(repo.listForCaregiver).toHaveBeenCalledWith(userId);
  });

  it('listForCaregiver returns empty for user with no recipients', async () => {
    const repo = createRepoStub({
      listForCaregiver: vi.fn(async () => []),
    });

    const service = createCareRecipientService(repo);
    const recipients = await service.listForCaregiver(userId);

    expect(recipients).toHaveLength(0);
  });

  it('update with partial input returns updated recipient', async () => {
    const repo = createRepoStub({
      update: vi.fn(async (uid, id, input) => ({
        id,
        userId: null,
        createdByUserId: uid,
        displayName: input.displayName ?? 'Grandma',
        timezone: input.timezone ?? 'America/New_York',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });

    const service = createCareRecipientService(repo);
    const recipient = await service.update(userId, 'recipient-1', { displayName: 'Updated Name' });

    expect(recipient.displayName).toBe('Updated Name');
    expect(repo.update).toHaveBeenCalledWith(userId, 'recipient-1', { displayName: 'Updated Name' });
  });

  it('getMyProfile returns the user profile', async () => {
    const profile = {
      id: 'profile-1',
      userId,
      createdByUserId: null,
      displayName: 'My Profile',
      timezone: 'America/New_York',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const repo = createRepoStub({
      findByUserId: vi.fn(async () => profile),
    });

    const service = createCareRecipientService(repo);
    const result = await service.getMyProfile(userId);

    expect(result).toEqual(profile);
    expect(repo.findByUserId).toHaveBeenCalledWith(userId);
  });

  it('getMyProfile throws CareRecipientNotFoundError when no profile exists', async () => {
    const repo = createRepoStub({
      findByUserId: vi.fn(async () => null),
    });

    const service = createCareRecipientService(repo);

    await expect(service.getMyProfile(userId)).rejects.toBeInstanceOf(CareRecipientNotFoundError);
  });

  it('updateMyProfile updates the user profile', async () => {
    const profile = {
      id: 'profile-1',
      userId,
      createdByUserId: null,
      displayName: 'My Profile',
      timezone: 'America/New_York',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedProfile = {
      ...profile,
      displayName: 'New Name',
      timezone: 'America/Los_Angeles',
    };

    const repo = createRepoStub({
      findByUserId: vi.fn(async () => profile),
      update: vi.fn(async () => updatedProfile),
    });

    const service = createCareRecipientService(repo);
    const result = await service.updateMyProfile(userId, {
      displayName: 'New Name',
      timezone: 'America/Los_Angeles',
    });

    expect(result.displayName).toBe('New Name');
    expect(result.timezone).toBe('America/Los_Angeles');
    expect(repo.findByUserId).toHaveBeenCalledWith(userId);
    expect(repo.update).toHaveBeenCalledWith(userId, 'profile-1', {
      displayName: 'New Name',
      timezone: 'America/Los_Angeles',
    });
  });

  it('updateMyProfile throws CareRecipientNotFoundError when no profile exists', async () => {
    const repo = createRepoStub({
      findByUserId: vi.fn(async () => null),
    });

    const service = createCareRecipientService(repo);

    await expect(service.updateMyProfile(userId, { displayName: 'X' })).rejects.toBeInstanceOf(
      CareRecipientNotFoundError
    );
  });
});
