/**
 * Opaque dose ID encoding and decoding.
 */

import { InvalidDoseIdError } from './errors.js';

function base64UrlEncode(input: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf8').toString('base64url');
  }

  // Browser fallback (handles unicode)
  const b64 = btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64url').toString('utf8');
  }

  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (b64.length % 4)) % 4;
  const padded = b64 + '='.repeat(padLength);
  return decodeURIComponent(escape(atob(padded)));
}

/**
 * Encode a dose key into an opaque doseId string.
 * Format: "v1:" + base64url("${scheduleId}|${scheduledForISO}")
 *
 * **Important:** scheduleId must not contain the `|` character as it's used
 * as the internal delimiter. In practice, scheduleIds are database-generated
 * UUIDs which never contain this character.
 */
export function encodeDoseId(scheduleId: string, scheduledFor: Date): string {
  const isoString = scheduledFor.toISOString();
  const payload = `${scheduleId}|${isoString}`;
  return `v1:${base64UrlEncode(payload)}`;
}

/**
 * Decode a doseId back into scheduleId and scheduledFor.
 */
export function decodeDoseId(doseId: string): { scheduleId: string; scheduledFor: Date } {
  if (!doseId.startsWith('v1:')) {
    throw new InvalidDoseIdError('DoseId must start with "v1:"');
  }

  const encoded = doseId.slice(3);
  if (!encoded) {
    throw new InvalidDoseIdError('DoseId is missing payload');
  }

  let payload: string;
  try {
    payload = base64UrlDecode(encoded);
  } catch {
    throw new InvalidDoseIdError('DoseId payload is not valid base64url');
  }

  const parts = payload.split('|');
  if (parts.length !== 2) {
    throw new InvalidDoseIdError('Invalid doseId format');
  }

  const scheduleId = parts[0];
  const isoString = parts[1];

  if (!scheduleId || !isoString) {
    throw new InvalidDoseIdError('Invalid doseId format');
  }

  const scheduledFor = new Date(isoString);
  if (Number.isNaN(scheduledFor.getTime())) {
    throw new InvalidDoseIdError('Invalid scheduledFor timestamp');
  }

  return { scheduleId, scheduledFor };
}
