import { createFileRoute } from '@tanstack/react-router';

import { ApplicationCreateView } from 'src/sections/application/view';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/applications/new')({
  component: ApplicationCreateView,
});
