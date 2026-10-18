import { createFileRoute } from '@tanstack/react-router';

import { ArizaDetailsView } from 'src/sections/ariza/view';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/arizalar/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ArizaDetailsView id={Number(Route.useParams().id)} />;
}
