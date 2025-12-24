/**
 * React Query hooks for API calls.
 */

import * as React from 'react'
import { useAuth } from '@clerk/clerk-react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiRequest, ApiClientError } from './api'

// =============================================================================
// Types
// =============================================================================

export type AccessStatus = 'pending_request' | 'pending_invite' | 'approved' | 'revoked'

export type CaregiverAccess = {
  id: string
  caregiverUserId: string
  recipientUserId: string
  status: AccessStatus
  requestedAt: string | null
  approvedAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
  caregiverDisplayName: string | null
  caregiverEmail: string | null
  recipientDisplayName: string | null
  recipientEmail: string | null
  recipientCareRecipientId: string | null
  recipientTimezone: string | null
}

export type CareRecipient = {
  id: string
  displayName: string
  timezone: string
  userId: string | null
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

export type Medication = {
  id: string
  recipientId: string
  name: string
  instructions: string | null
  isActive: boolean
  inactiveAt: string | null
  createdAt: string
  updatedAt: string
}

export type Schedule = {
  id: string
  medicationId: string
  recurrence: 'daily' | 'weekly'
  timeOfDay: string
  timezone: string
  daysOfWeek: number[] | null
  startDate: string
  endDate: string | null
  dosageNotes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateMedicationResponse = {
  medication: Medication
  schedules: Schedule[]
}

export type DoseOccurrence = {
  doseId: string
  scheduleId: string
  medicationId: string
  recipientId: string
  medicationName: string
  instructions: string | null
  dosageNotes: string | null
  scheduledFor: string
  /** Time of day in HH:mm format */
  timeOfDay: string
  recurrence: 'daily' | 'weekly'
  /** ISO day of week numbers (1=Mon, 7=Sun), null for daily schedules */
  daysOfWeek: number[] | null
  status: 'scheduled' | 'taken'
  takenAt: string | null
  takenByUserId: string | null
}

export type OnboardingStatus = {
  hasCompletedOnboarding: boolean
  displayName: string | null
  timezone: string | null
  isRecipient: boolean
  isCaregiver: boolean
}

// =============================================================================
// Query Keys
// =============================================================================

export const queryKeys = {
  profile: ['profile'] as const,
  caregivers: ['caregivers'] as const,
  recipients: ['recipients'] as const,
  medications: (recipientId: string, includeInactive?: boolean) =>
    ['medications', recipientId, { includeInactive }] as const,
  medication: (id: string) => ['medication', id] as const,
  doses: (recipientId: string, from?: string, to?: string) =>
    ['doses', recipientId, from, to] as const,
  onboarding: ['onboarding'] as const,
}

// =============================================================================
// Profile Hooks
// =============================================================================

export function useProfile(
  options?: Omit<UseQueryOptions<CareRecipient>, 'queryKey' | 'queryFn'>
) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => apiRequest<CareRecipient>('/profile', {}, getToken),
    ...options,
  })
}

export function useUpdateProfile() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { displayName?: string; timezone?: string }) =>
      apiRequest<CareRecipient>(
        '/profile',
        { method: 'PATCH', body: JSON.stringify(data) },
        getToken
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      toast.success('Profile updated')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to update profile')
    },
  })
}

export type RolesUpdate = {
  isRecipient: boolean
  isCaregiver: boolean
}

export function useUpdateRoles() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RolesUpdate) =>
      apiRequest<RolesUpdate>(
        '/onboarding/roles',
        { method: 'PATCH', body: JSON.stringify(data) },
        getToken
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding })
      toast.success('Roles updated')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to update roles')
    },
  })
}

// =============================================================================
// Caregiver Access Hooks (from care recipient's perspective)
// =============================================================================

export function useCaregivers(
  options?: Omit<UseQueryOptions<CaregiverAccess[]>, 'queryKey' | 'queryFn'>
) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: queryKeys.caregivers,
    queryFn: () => apiRequest<CaregiverAccess[]>('/access/caregivers', {}, getToken),
    ...options,
  })
}

export function useInviteCaregiver() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) =>
      apiRequest<CaregiverAccess>(
        '/access/invite',
        { method: 'POST', body: JSON.stringify({ caregiverEmail: email }) },
        getToken
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.caregivers })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipients })
      toast.success('Invitation sent')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to send invitation')
    },
  })
}

export function useApproveCaregiver() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accessId: string) =>
      apiRequest<CaregiverAccess>(
        `/access/${accessId}/approve`,
        { method: 'POST' },
        getToken
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.caregivers })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipients })
      toast.success('Request approved')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to approve request')
    },
  })
}

export function useRevokeCaregiver() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accessId: string) =>
      apiRequest<CaregiverAccess>(
        `/access/${accessId}/revoke`,
        { method: 'POST' },
        getToken
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.caregivers })
      queryClient.invalidateQueries({ queryKey: queryKeys.recipients })
      toast.success('Access revoked')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to revoke access')
    },
  })
}

// =============================================================================
// Care Recipients Hooks (from caregiver's perspective)
// =============================================================================

export function useCareRecipients(
  options?: Omit<UseQueryOptions<CaregiverAccess[]>, 'queryKey' | 'queryFn'>
) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: queryKeys.recipients,
    queryFn: () => apiRequest<CaregiverAccess[]>('/access/recipients', {}, getToken),
    ...options,
  })
}

export function useRequestAccess() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (email: string) =>
      apiRequest<CaregiverAccess>(
        '/access/request',
        { method: 'POST', body: JSON.stringify({ recipientEmail: email }) },
        getToken
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipients })
      queryClient.invalidateQueries({ queryKey: queryKeys.caregivers })
      toast.success('Access requested')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to request access')
    },
  })
}

export function useAcceptInvite() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accessId: string) =>
      apiRequest<CaregiverAccess>(
        `/access/${accessId}/accept`,
        { method: 'POST' },
        getToken
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipients })
      queryClient.invalidateQueries({ queryKey: queryKeys.caregivers })
      toast.success('Invitation accepted')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to accept invitation')
    },
  })
}

export function useCancelAccess() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accessId: string) =>
      apiRequest<CaregiverAccess>(
        `/access/${accessId}/cancel`,
        { method: 'POST' },
        getToken
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recipients })
      queryClient.invalidateQueries({ queryKey: queryKeys.caregivers })
      toast.success('Request cancelled')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to cancel request')
    },
  })
}

// =============================================================================
// Schedules Hooks
// =============================================================================

export function useSchedules(recipientId: string | undefined) {
  const { getToken } = useAuth()

  return useQuery({
    queryKey: ['schedules', recipientId],
    queryFn: () =>
      apiRequest<Schedule[]>(`/recipients/${recipientId}/schedules`, {}, getToken),
    enabled: !!recipientId,
  })
}

export type UpdateScheduleInput = {
  recurrence?: 'daily' | 'weekly'
  timeOfDay?: string
  timezone?: string | null
  daysOfWeek?: number[] | null
  startDate?: string
  endDate?: string | null
  dosageNotes?: string | null
}

export function useUpdateSchedule() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      scheduleId,
      recipientId,
      ...data
    }: UpdateScheduleInput & {
      scheduleId: string
      recipientId: string
    }) =>
      apiRequest<Schedule>(
        `/schedules/${scheduleId}`,
        { method: 'PATCH', body: JSON.stringify(data) },
        getToken
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.recipientId] })
      queryClient.invalidateQueries({ queryKey: ['medications', variables.recipientId] })
      queryClient.invalidateQueries({ queryKey: ['doses', variables.recipientId] })
      toast.success('Schedule updated')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to update schedule')
    },
  })
}

export function useEndSchedule() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      scheduleId,
      recipientId,
    }: {
      scheduleId: string
      recipientId: string
    }) =>
      apiRequest<Schedule>(
        `/schedules/${scheduleId}/end`,
        { method: 'POST' },
        getToken
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.recipientId] })
      queryClient.invalidateQueries({ queryKey: ['medications', variables.recipientId] })
      queryClient.invalidateQueries({ queryKey: ['doses', variables.recipientId] })
      toast.success('Schedule ended')
    },
    onError: (error) => {
      const message = error instanceof ApiClientError ? error.message : 'Failed to end schedule'
      if (message.includes('last')) {
        toast.error('Cannot end the last active schedule. A medication must have at least one active schedule.')
      } else {
        toast.error(message)
      }
    },
  })
}

export function useAddSchedule() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      medicationId,
      recipientId,
      ...data
    }: {
      medicationId: string
      recipientId: string
      recurrence: 'daily' | 'weekly'
      timeOfDay: string
      daysOfWeek?: number[] | null
      startDate: string
      endDate?: string | null
      timezone?: string | null
      dosageNotes?: string | null
    }) =>
      apiRequest<Schedule>(
        `/medications/${medicationId}/schedules`,
        { method: 'POST', body: JSON.stringify(data) },
        getToken
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.recipientId] })
      queryClient.invalidateQueries({ queryKey: ['medications', variables.recipientId] })
      queryClient.invalidateQueries({ queryKey: ['doses', variables.recipientId] })
      toast.success('Schedule added')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to add schedule')
    },
  })
}

// =============================================================================
// Medications Hooks
// =============================================================================

export type MedicationWithSchedules = Medication & {
  schedules: Schedule[]
}

export function useMedicationsWithSchedules(
  recipientId: string | undefined,
  options?: { includeInactive?: boolean }
) {
  const { data: medications, isLoading: medsLoading } = useMedications(recipientId, options)
  const { data: schedules, isLoading: schedulesLoading } = useSchedules(recipientId)

  const medicationsWithSchedules: MedicationWithSchedules[] = React.useMemo(() => {
    if (!medications || !schedules) return []

    return medications.map((med) => ({
      ...med,
      schedules: schedules.filter((s) => s.medicationId === med.id),
    }))
  }, [medications, schedules])

  return {
    data: medicationsWithSchedules,
    isLoading: medsLoading || schedulesLoading,
  }
}

export function useMedications(
  recipientId: string | undefined,
  options?: Omit<UseQueryOptions<Medication[]>, 'queryKey' | 'queryFn'> & {
    includeInactive?: boolean
  }
) {
  const { getToken } = useAuth()
  const { includeInactive, ...queryOptions } = options ?? {}

  return useQuery({
    queryKey: queryKeys.medications(recipientId ?? '', includeInactive),
    queryFn: () => {
      const params = includeInactive ? '?includeInactive=true' : ''
      return apiRequest<Medication[]>(
        `/recipients/${recipientId}/medications${params}`,
        {},
        getToken
      )
    },
    enabled: !!recipientId,
    ...queryOptions,
  })
}

export type CreateMedicationInput = {
  recipientId: string
  name: string
  instructions?: string | null
  schedules: Array<{
    recurrence: 'daily' | 'weekly'
    timeOfDay: string
    timezone?: string | null
    daysOfWeek?: number[] | null
    startDate: string
    endDate?: string | null
    dosageNotes?: string | null
  }>
}

export function useCreateMedication() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recipientId, ...data }: CreateMedicationInput) =>
      apiRequest<CreateMedicationResponse>(
        `/recipients/${recipientId}/medications`,
        { method: 'POST', body: JSON.stringify(data) },
        getToken
      ),
    onSuccess: (_, variables) => {
      // Use partial key to invalidate all medications queries for this recipient
      queryClient.invalidateQueries({ queryKey: ['medications', variables.recipientId] })
      // Also invalidate schedules since useMedicationsWithSchedules joins them
      queryClient.invalidateQueries({ queryKey: ['schedules', variables.recipientId] })
      // Invalidate doses so schedule pages show the new medication's doses
      queryClient.invalidateQueries({ queryKey: ['doses', variables.recipientId] })
      toast.success('Medication added')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to add medication')
    },
  })
}

export function useUpdateMedication() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      recipientId,
      ...data
    }: {
      id: string
      recipientId: string
      name?: string
      instructions?: string | null
    }) =>
      apiRequest<Medication>(
        `/medications/${id}`,
        { method: 'PATCH', body: JSON.stringify(data) },
        getToken
      ),
    onSuccess: (_, variables) => {
      // Use partial key to invalidate all medications queries for this recipient
      queryClient.invalidateQueries({ queryKey: ['medications', variables.recipientId] })
      queryClient.invalidateQueries({ queryKey: queryKeys.medication(variables.id) })
      toast.success('Medication updated')
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to update medication')
    },
  })
}

export function useDeactivateMedication() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, recipientId }: { id: string; recipientId: string }) =>
      apiRequest<Medication>(`/medications/${id}/deactivate`, { method: 'POST' }, getToken),
    onSuccess: (_, variables) => {
      // Use partial key to invalidate all medications queries for this recipient
      queryClient.invalidateQueries({ queryKey: ['medications', variables.recipientId] })
      // Invalidate doses so schedule pages no longer show this medication's doses
      queryClient.invalidateQueries({ queryKey: ['doses', variables.recipientId] })
      toast.success('Medication deactivated')
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiClientError ? error.message : 'Failed to deactivate medication'
      )
    },
  })
}

export function useReactivateMedication() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, recipientId }: { id: string; recipientId: string }) =>
      apiRequest<Medication>(`/medications/${id}/reactivate`, { method: 'POST' }, getToken),
    onSuccess: (_, variables) => {
      // Use partial key to invalidate all medications queries for this recipient
      queryClient.invalidateQueries({ queryKey: ['medications', variables.recipientId] })
      // Invalidate doses so schedule pages show this medication's doses again
      queryClient.invalidateQueries({ queryKey: ['doses', variables.recipientId] })
      toast.success('Medication reactivated')
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiClientError ? error.message : 'Failed to reactivate medication'
      )
    },
  })
}

// =============================================================================
// Doses Hooks
// =============================================================================

export function useDoses(
  recipientId: string | undefined,
  from?: Date,
  to?: Date,
  options?: Omit<UseQueryOptions<DoseOccurrence[]>, 'queryKey' | 'queryFn'>
) {
  const { getToken } = useAuth()

  const fromStr = from?.toISOString()
  const toStr = to?.toISOString()

  return useQuery({
    queryKey: queryKeys.doses(recipientId ?? '', fromStr, toStr),
    queryFn: () => {
      const params = new URLSearchParams()
      if (from) params.append('from', from.toISOString())
      if (to) params.append('to', to.toISOString())
      const queryString = params.toString()
      return apiRequest<DoseOccurrence[]>(
        `/recipients/${recipientId}/doses${queryString ? `?${queryString}` : ''}`,
        {},
        getToken
      )
    },
    enabled: !!recipientId,
    ...options,
  })
}

export function useMarkDoseTaken() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ doseId }: { doseId: string; recipientId: string }) =>
      apiRequest<DoseOccurrence>(`/doses/${doseId}/taken`, { method: 'POST' }, getToken),
    onSuccess: (data, variables) => {
      // Invalidate doses query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['doses', variables.recipientId],
        exact: false,
      })
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to mark dose as taken')
    },
  })
}

export function useUnmarkDoseTaken() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ doseId }: { doseId: string; recipientId: string }) =>
      apiRequest<DoseOccurrence>(`/doses/${doseId}/taken`, { method: 'DELETE' }, getToken),
    onSuccess: (data, variables) => {
      // Invalidate doses query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['doses', variables.recipientId],
        exact: false,
      })
    },
    onError: (error) => {
      toast.error(error instanceof ApiClientError ? error.message : 'Failed to unmark dose')
    },
  })
}

// =============================================================================
// Schedule Feed Types and Hooks
// =============================================================================

/** Dose type for UI components (transforms API status to boolean) */
export type Dose = {
  doseId: string
  scheduleId: string
  medicationId: string
  medicationName: string
  instructions: string | null
  dosageNotes: string | null
  scheduledFor: string
  timeOfDay: string
  recurrence: 'daily' | 'weekly'
  daysOfWeek: number[] | null
  isTaken: boolean
  takenAt: string | null
}

/** A day's doses grouped by time period */
export type DaySchedule = {
  date: Date
  dateString: string
  morning: Dose[]
  afternoon: Dose[]
  evening: Dose[]
}

/** Convert API DoseOccurrence to UI Dose format */
function toDose(occurrence: DoseOccurrence): Dose {
  return {
    doseId: occurrence.doseId,
    scheduleId: occurrence.scheduleId,
    medicationId: occurrence.medicationId,
    medicationName: occurrence.medicationName,
    instructions: occurrence.instructions,
    dosageNotes: occurrence.dosageNotes,
    scheduledFor: occurrence.scheduledFor,
    timeOfDay: occurrence.timeOfDay,
    recurrence: occurrence.recurrence,
    daysOfWeek: occurrence.daysOfWeek,
    isTaken: occurrence.status === 'taken',
    takenAt: occurrence.takenAt,
  }
}

/** Get time period from 24h time string */
export function getTimePeriod(time24: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(time24.split(':')[0], 10)
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

/**
 * Get the local date string (YYYY-MM-DD) for a UTC timestamp in a specific timezone.
 * Uses Intl.DateTimeFormat for timezone-aware date extraction.
 */
function getLocalDateInTimezone(utcDate: Date, timezone: string): string {
  // Format the date parts in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  // en-CA locale gives us YYYY-MM-DD format
  return formatter.format(utcDate)
}

/**
 * Get today's date string (YYYY-MM-DD) in a specific timezone.
 */
export function getTodayInTimezone(timezone: string): string {
  return getLocalDateInTimezone(new Date(), timezone)
}

/**
 * Check if a date string represents "today" in the given timezone.
 */
export function isToday(dateString: string, timezone: string): boolean {
  return dateString === getTodayInTimezone(timezone)
}

/**
 * Check if a date string represents "tomorrow" in the given timezone.
 */
export function isTomorrow(dateString: string, timezone: string): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return dateString === getLocalDateInTimezone(tomorrow, timezone)
}

/**
 * Check if a date string represents "yesterday" in the given timezone.
 */
export function isYesterday(dateString: string, timezone: string): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return dateString === getLocalDateInTimezone(yesterday, timezone)
}

/** Group doses by date and time period, using the recipient's timezone */
function groupDosesByDay(doses: DoseOccurrence[], timezone: string): DaySchedule[] {
  const dayMap = new Map<string, DaySchedule>()

  for (const occurrence of doses) {
    const dose = toDose(occurrence)
    const date = new Date(occurrence.scheduledFor)
    // Use the recipient's timezone for grouping (not browser local time)
    const dateString = getLocalDateInTimezone(date, timezone)

    if (!dayMap.has(dateString)) {
      // Parse the dateString back into a Date for display purposes
      // Note: This creates a date at midnight UTC, but we only use dateString for comparisons
      const [year, month, day] = dateString.split('-').map(Number)
      const dayDate = new Date(year, month - 1, day)
      dayMap.set(dateString, {
        date: dayDate,
        dateString,
        morning: [],
        afternoon: [],
        evening: [],
      })
    }

    const day = dayMap.get(dateString)!
    const period = getTimePeriod(dose.timeOfDay)
    day[period].push(dose)
  }

  // Sort doses within each period by time
  for (const day of dayMap.values()) {
    day.morning.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))
    day.afternoon.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))
    day.evening.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay))
  }

  // Sort days chronologically
  return Array.from(dayMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )
}

/**
 * Hook to fetch and group doses by day for the schedule feed.
 * Returns DaySchedule array for rendering in ScheduleFeed component.
 *
 * @param recipientId - The care recipient's ID
 * @param timezone - The recipient's IANA timezone (e.g., "America/New_York") for proper date grouping
 * @param numDays - Number of days to fetch (default: 7)
 * @param startDate - Optional start date (defaults to today)
 */
export function useDaysSchedule(
  recipientId: string | undefined,
  timezone: string,
  numDays: number = 7,
  startDate?: Date
) {
  // Memoize start date to beginning of today to avoid query key instability
  const start = React.useMemo(() => {
    const date = startDate ?? new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [startDate])

  // Calculate end date based on numDays
  const end = React.useMemo(() => {
    const date = new Date(start)
    date.setDate(date.getDate() + numDays)
    return date
  }, [start, numDays])

  const { data: doses, isLoading, refetch } = useDoses(recipientId, start, end)

  const days = React.useMemo(() => {
    if (!doses) return []
    return groupDosesByDay(doses, timezone)
  }, [doses, timezone])

  return { days, isLoading, refetch }
}

/** Format time from 24h to 12h format */
export function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/** Format days of week array to readable string */
export function formatDaysOfWeek(days: number[]): string {
  const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return days.map((d) => dayNames[d]).join(', ')
}
