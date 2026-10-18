/** Token lifetime: a working day. */
export const TOKEN_TTL_SECONDS = 8 * 60 * 60;

/** The secret comes only from the environment; without it the app refuses to start. */
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret)
    throw new Error('JWT_SECRET is not set (see backend/.env.example)');
  return secret;
}
