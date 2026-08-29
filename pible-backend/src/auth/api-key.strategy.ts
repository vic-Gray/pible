import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import type { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RequestContext } from './request-context.js';

/**
 * ApiKeyStrategy
 *
 * Reads the raw API key from the `x-api-key` header, hashes it,
 * looks it up in the database, and returns a RequestContext.
 *
 * Key design rules from the architecture doc:
 *  - projectId comes from the key record itself — never from the request body.
 *    A key is minted for one project and cannot be redirected at request time.
 *  - Updates last_used_at fire-and-forget (void, no await) so it never blocks
 *    the request path.
 *  - Checks revoked_at IS NULL — revoked keys are hard-rejected.
 */
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async validate(req: Request): Promise<RequestContext> {
    const rawKey = req.headers['x-api-key'];

    if (!rawKey || typeof rawKey !== 'string') {
      throw new UnauthorizedException('Missing x-api-key header');
    }

    // Find all active (non-revoked) keys and compare hashes.
    // We can't query by hash directly because bcrypt hashes are salted —
    // we need to compare against candidates. To keep this efficient we
    // index on a prefix or use a fast lookup strategy in future, but for
    // v1 the table will be small enough that this is fine.
    const activeKeys = await this.prisma.apiKey.findMany({
      where: { revokedAt: null },
      select: { id: true, keyHash: true, projectId: true },
    });

    let matchedKey: { id: string; projectId: string } | null = null;

    for (const key of activeKeys) {
      const isMatch = await bcrypt.compare(rawKey, key.keyHash);
      if (isMatch) {
        matchedKey = { id: key.id, projectId: key.projectId };
        break;
      }
    }

    if (!matchedKey) {
      throw new UnauthorizedException('Invalid or revoked API key');
    }

    // Fire-and-forget — update last_used_at without blocking the request
    void this.prisma.apiKey.update({
      where: { id: matchedKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      projectId: matchedKey.projectId,
      actorType: 'agent',
      actorId: matchedKey.id,
    };
  }
}
