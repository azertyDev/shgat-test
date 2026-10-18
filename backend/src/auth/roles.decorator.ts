import { Reflector } from '@nestjs/core';
import type { Role } from './role.enum.js';

/** Roles allowed for an endpoint. Routes without it are public (e.g. the file download link). */
export const Roles = Reflector.createDecorator<readonly Role[]>();
