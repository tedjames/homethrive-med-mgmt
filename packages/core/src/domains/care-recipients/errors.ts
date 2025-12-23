/**
 * Care recipient domain-specific errors.
 */

import { NotFoundError } from '../../shared/errors.js';

export class CareRecipientNotFoundError extends NotFoundError {
  constructor(recipientId: string) {
    super('CareRecipient', recipientId);
    this.name = 'CareRecipientNotFoundError';
  }
}

export function isCareRecipientNotFound(err: unknown): err is CareRecipientNotFoundError {
  return err instanceof CareRecipientNotFoundError;
}
