import type { BoxProps } from '@mui/material/Box';
import type { LinkComponent } from '@tanstack/react-router';

import { forwardRef } from 'react';
import { createLink } from '@tanstack/react-router';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

const MuiBoxLink = forwardRef<HTMLAnchorElement, BoxProps<'a'>>((props, ref) => (
  <Box ref={ref} component="a" {...props} />
));

const CreatedBoxLink = createLink(MuiBoxLink);

/** Typed TanStack Router link rendered as an MUI Box (custom-styled links with `sx`). */
export const BoxLink: LinkComponent<typeof MuiBoxLink> = (props) => <CreatedBoxLink preload="intent" {...props} />;
