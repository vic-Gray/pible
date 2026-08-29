import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { RequestContext } from '../request-context.js';

/**
 * @CurrentActor() — parameter decorator
 *
 * Extracts the resolved RequestContext that was attached to the request object
 * by either JwtAuthGuard or ApiKeyGuard.
 *
 * Usage:
 *   @Get()
 *   doSomething(@CurrentActor() actor: RequestContext) { ... }
 */
export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext => {
    const request = ctx.switchToHttp().getRequest<Request & { actor: RequestContext }>();
    return request.actor;
  },
);
