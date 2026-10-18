import { createFileRoute } from '@tanstack/react-router';

import { ArizaEditView } from 'src/sections/ariza/view';

// ----------------------------------------------------------------------

export const Route = createFileRoute('/arizalar/$id/tahrir')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ArizaEditView id={Number(Route.useParams().id)} />;
}
