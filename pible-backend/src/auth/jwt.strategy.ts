import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { RequestContext } from './request-context.js';

/**
 * Shape of the payload we sign into every access token.
 * Keep it minimal — no sensitive data ever goes in a JWT payload.
 */
export interface JwtPayload {
  sub: string;      // User.id
  email: string;
  projectId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not set in environment variables');
    }

    super({
      // Extract Bearer token from Authorization header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Reject expired tokens — never silently pass them through
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Called by Passport after signature + expiry are verified.
   * The return value is attached to request.user by Passport,
   * then our JwtAuthGuard copies it to request.actor as RequestContext.
   */
  validate(payload: JwtPayload): RequestContext {
    return {
      projectId: payload.projectId,
      actorType: 'human',
      actorId: payload.sub,
    };
  }
}
