import { createFileRoute } from '@tanstack/react-router';

import { ArizaDetailsView } from 'src/sections/application/view';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/applications/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ArizaDetailsView id={Number(Route.useParams().id)} />;
}
