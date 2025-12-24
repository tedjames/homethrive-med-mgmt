/**
 * API client utilities.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export type ApiResponse<T> = {
  data: T;
};

export type ApiError = {
  error: string;
  code?: string;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Makes an authenticated API request.
 *
 * @param endpoint - API endpoint (e.g., '/onboarding/status')
 * @param options - Fetch options
 * @param getToken - Function to get the auth token
 * @returns The parsed response data
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  getToken: () => Promise<string | null>
): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new ApiClientError('Not authenticated', 401);
  }

  const url = `${API_BASE_URL}/v1${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  // Only set Content-Type for requests with a body
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  // Merge any additional headers from options
  if (options.headers) {
    const optHeaders = options.headers as Record<string, string>;
    Object.assign(headers, optHeaders);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiError;
    throw new ApiClientError(
      errorBody.error || 'Request failed',
      response.status,
      errorBody.code
    );
  }

  const body = (await response.json()) as ApiResponse<T>;
  return body.data;
}
