import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { routeTree } from './route-tree.gen';
import { ensureToken } from './sections/application/role-store';

// ----------------------------------------------------------------------

// token for the stored role: reused from localStorage while valid; until one exists requests use X-Rol
void ensureToken();

// Data stays fresh for 30 s: switching tabs or pages reuses the cache instead of asking the server again.
// Our own changes do not wait for it: every mutation invalidates the application queries (queries.ts).
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 } },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
