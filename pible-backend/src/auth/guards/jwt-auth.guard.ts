import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { RequestContext } from '../request-context.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    // Run Passport JWT validation first
    return super.canActivate(context);
  }

  /**
   * After Passport validates the token and calls JwtStrategy.validate(),
   * the result lands on request.user. We copy it to request.actor so that
   * the rest of the app always reads from a consistent location regardless
   * of which guard was used.
   */
  override handleRequest<T = RequestContext>(
    err: Error | null,
    user: T | false,
    _info: unknown,
    context: ExecutionContext,
  ): T {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or expired access token');
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { actor: RequestContext }>();

    request.actor = user as unknown as RequestContext;
    return user;
  }
}
