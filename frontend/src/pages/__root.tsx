import type { QueryClient } from '@tanstack/react-query';

import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

import Container from '@mui/material/Container';

import { ErrorBoundary } from 'src/routes/components';

import App from 'src/app';
import { useTranslate } from 'src/locales';
import { AppLayout } from 'src/layouts/app';

import { EmptyContent } from 'src/components/empty-content';

// ----------------------------------------------------------------------

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <App>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </App>
  ),
  errorComponent: ErrorBoundary,
  notFoundComponent: PageNotFound,
});

function PageNotFound() {
  const { t } = useTranslate();
  return (
    <Container>
      <EmptyContent filled title={t('error.pageNotFound')} sx={{ py: 10 }} />
    </Container>
  );
}
