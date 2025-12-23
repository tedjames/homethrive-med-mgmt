/**
 * Shared type aliases.
 */

/**
 * ISO local-date string in the form YYYY-MM-DD.
 */
export type ISODateString = string;

/**
 * ISO datetime string, typically UTC (e.g. 2024-12-19T14:00:00.000Z).
 */
export type ISODateTimeString = string;

/**
 * User identifier from authentication provider (Clerk user ID).
 * Used to scope all domain operations to the authenticated user.
 */
export type UserId = string;
