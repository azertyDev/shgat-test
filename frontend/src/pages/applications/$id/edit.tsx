import { createFileRoute } from '@tanstack/react-router';

import { ApplicationEditView } from 'src/sections/application/view';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/applications/$id/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ApplicationEditView id={Number(Route.useParams().id)} />;
}
