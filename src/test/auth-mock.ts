import { vi } from 'vitest';
import type { AuthUser } from '@/lib/auth';

// --- Amplify auth function mocks ---
export const mockAmplifySignIn = vi.fn();
export const mockSignInWithRedirect = vi.fn();
export const mockAmplifySignOut = vi.fn();
export const mockGetCurrentUser = vi.fn();
export const mockFetchAuthSession = vi.fn();
export const mockConfirmSignIn = vi.fn();
export const mockFetchUserAttributes = vi.fn();

/** Call inside vi.mock() blocks or at the top of test files to mock aws-amplify/auth */
export function setupAmplifyAuthMocks() {
  vi.mock('aws-amplify/auth', () => ({
    signIn: (...args: unknown[]) => mockAmplifySignIn(...args),
    signInWithRedirect: (...args: unknown[]) => mockSignInWithRedirect(...args),
    signOut: (...args: unknown[]) => mockAmplifySignOut(...args),
    getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
    fetchAuthSession: (...args: unknown[]) => mockFetchAuthSession(...args),
    confirmSignIn: (...args: unknown[]) => mockConfirmSignIn(...args),
    fetchUserAttributes: (...args: unknown[]) => mockFetchUserAttributes(...args),
  }));

  vi.mock('@/lib/amplify-config', () => ({
    ensureAmplifyConfigured: vi.fn(),
  }));
}

/** Create a mock AuthUser for use in tests */
export function createMockAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    sub: 'mock-sub-123',
    email: 'test@example.com',
    getToken: vi.fn().mockResolvedValue('mock-access-token'),
    ...overrides,
  };
}

/**
 * Configure Amplify session mocks so getCurrentAuthUser() returns a signed-in user.
 * Call in beforeEach when you need an authenticated context.
 */
export function mockAuthenticatedUser(sub = 'mock-sub-123', email = 'test@example.com') {
  mockGetCurrentUser.mockResolvedValue({
    userId: sub,
    signInDetails: { loginId: email },
  });
  mockFetchAuthSession.mockResolvedValue({
    tokens: {
      accessToken: { toString: () => 'mock-access-token' },
    },
  });
}

/** Configure Amplify mocks so getCurrentAuthUser() returns null (unauthenticated). */
export function mockUnauthenticatedUser() {
  mockGetCurrentUser.mockRejectedValue(new Error('Not signed in'));
}
