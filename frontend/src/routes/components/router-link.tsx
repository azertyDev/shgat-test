import { forwardRef } from 'react';
import { Link } from '@tanstack/react-router';

// ----------------------------------------------------------------------

type RouterLinkProps = Omit<React.ComponentProps<'a'>, 'href'> & { href: string };

/**
 * Shablon komponentlari (`component={RouterLink} href="..."`) uchun TanStack Router havolasi.
 * Tiplangan navigatsiya kerak bo'lgan joylarda to'g'ridan-to'g'ri `<Link to=...>` ishlatiladi.
 */
export const RouterLink = forwardRef<HTMLAnchorElement, RouterLinkProps>(({ href, ...other }, ref) => (
  <Link ref={ref} to={href as string} {...other} />
));
