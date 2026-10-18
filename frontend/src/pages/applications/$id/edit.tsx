import { createFileRoute } from '@tanstack/react-router';

import { ArizaEditView } from 'src/sections/application/view';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/applications/$id/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ArizaEditView id={Number(Route.useParams().id)} />;
}
