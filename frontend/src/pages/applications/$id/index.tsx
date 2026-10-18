import { createFileRoute } from '@tanstack/react-router';

import { ApplicationDetailsView } from 'src/sections/application/view';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/applications/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ApplicationDetailsView id={Number(Route.useParams().id)} />;
}
