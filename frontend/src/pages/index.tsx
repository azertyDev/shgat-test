import { createFileRoute } from '@tanstack/react-router';

import { ArizaListView } from 'src/sections/application/view';
import { royxatSearchSchema } from 'src/sections/application/list-search';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/')({
  validateSearch: royxatSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  return <ArizaListView search={Route.useSearch()} />;
}
