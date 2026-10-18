import { createFileRoute } from '@tanstack/react-router';

import { ArizaListView } from 'src/sections/ariza/view';
import { royxatSearchSchema } from 'src/sections/ariza/search';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/')({
  validateSearch: royxatSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  return <ArizaListView search={Route.useSearch()} />;
}
