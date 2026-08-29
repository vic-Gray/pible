import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { RequestContext } from '../request-context.js';

@Injectable()
export class ApiKeyGuard extends AuthGuard('api-key') {
  override canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /**
   * After ApiKeyStrategy.validate() resolves successfully,
   * the returned RequestContext lands on request.user via Passport.
   * We copy it to request.actor — the same convention as JwtAuthGuard —
   * so controllers always read from request.actor regardless of auth path.
   */
  override handleRequest<T = RequestContext>(
    err: Error | null,
    user: T | false,
    _info: unknown,
    context: ExecutionContext,
  ): T {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or revoked API key');
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { actor: RequestContext }>();

    request.actor = user as unknown as RequestContext;
    return user;
  }
}
