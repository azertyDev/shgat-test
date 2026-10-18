import { forwardRef } from 'react';
import { Link } from '@tanstack/react-router';

// ----------------------------------------------------------------------

type RouterLinkProps = Omit<React.ComponentProps<'a'>, 'href'> & { href: string };

/**
 * TanStack Router link for template components (`component={RouterLink} href="..."`).
 * Where typed navigation is needed, use `<Link to=...>` or ButtonLink directly.
 */
export const RouterLink = forwardRef<HTMLAnchorElement, RouterLinkProps>(({ href, ...other }, ref) => (
  <Link ref={ref} to={href as string} {...other} />
));
