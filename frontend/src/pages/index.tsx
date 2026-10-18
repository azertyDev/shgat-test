import { createFileRoute } from '@tanstack/react-router';

import { ApplicationListView } from 'src/sections/application/view';
import { listSearchSchema } from 'src/sections/application/list-search';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/')({
  validateSearch: listSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  return <ApplicationListView search={Route.useSearch()} />;
}
