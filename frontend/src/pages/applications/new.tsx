import { createFileRoute } from '@tanstack/react-router';

import { ArizaCreateView } from 'src/sections/application/view';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/applications/new')({
  component: ArizaCreateView,
});
