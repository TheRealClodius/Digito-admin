import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a fresh QueryClient for each test.
 * Retries and network-mode are disabled so tests fail fast on errors.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface QueryWrapperProps {
  children: React.ReactNode;
  client?: QueryClient;
}

/**
 * React wrapper component providing a QueryClient to the component tree.
 * Use as the `wrapper` option in React Testing Library's render():
 *
 * @example
 * render(<MyComponent />, { wrapper: QueryWrapper });
 *
 * @example
 * // With a custom client for seeding initial data:
 * const client = createTestQueryClient();
 * render(<MyComponent />, { wrapper: ({ children }) => <QueryWrapper client={client}>{children}</QueryWrapper> });
 */
export function QueryWrapper({ children, client }: QueryWrapperProps) {
  const queryClient = client ?? createTestQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
