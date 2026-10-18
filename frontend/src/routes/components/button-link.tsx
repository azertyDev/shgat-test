import type { ButtonProps } from '@mui/material/Button';
import type { LinkComponent } from '@tanstack/react-router';

import { forwardRef } from 'react';
import { createLink } from '@tanstack/react-router';

import Button from '@mui/material/Button';

// ----------------------------------------------------------------------

const MuiButtonLink = forwardRef<HTMLAnchorElement, ButtonProps<'a'>>((props, ref) => (
  <Button ref={ref} component="a" {...props} />
));

const CreatedButtonLink = createLink(MuiButtonLink);

/** Tiplangan TanStack Router havolasi ko'rinishidagi MUI Button. */
export const ButtonLink: LinkComponent<typeof MuiButtonLink> = (props) => (
  <CreatedButtonLink preload="intent" {...props} />
);
