import { createFileRoute } from '@tanstack/react-router';

import { ArizaCreateView } from 'src/sections/ariza/view';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/arizalar/yangi')({
  component: ArizaCreateView,
});
