import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './jwt.strategy.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { MintApiKeyDto } from './dto/mint-api-key.dto.js';
import type {
  CheckProviderConflictDto,
  LinkProviderDto,
  ProviderConflictResponse,
} from './dto/provider.dto.js';

const BCRYPT_ROUNDS = 12;


const ACCESS_TOKEN_TTL = '15m';


const REFRESH_TOKEN_TTL = '7d';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface MintedApiKey {
  id: string;
  label: string | null;
  rawKey: string;
  projectId: string;
  createdAt: Date;
}

export interface ProviderCheckResult {
  conflict: boolean;
  existingProvider?: string;
  userId?: string;
  message?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Registration ──────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { providers: true },
    });

    if (existing) {
      // If the existing user was created via OAuth (no password), suggest linking
      if (!existing.passwordHash && existing.providers.length > 0) {
        throw new ConflictException(
          `An account with this email already exists via ${existing.providers[0].provider}. Please sign in with that provider or link your accounts in settings.`,
        );
      }
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        displayName: dto.displayName,
      },
    });

    // New users start with no project — projectId will be set on first
    // project creation. For the initial token we use an empty string
    // as projectId; the JWT guard will reject project-scoped endpoints
    // until a project is created.
    return this.issueTokens(user.id, user.email, '');
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { providers: true },
    });

    if (!user) {
      // Use the same error message as a wrong password to prevent
      // user enumeration via timing differences
      throw new UnauthorizedException('Invalid credentials');
    }

    // If user has no password (OAuth-only), reject password login
    if (!user.passwordHash) {
      const providers = user.providers.map((p) => p.provider).join(', ');
      throw new UnauthorizedException(
        `This account uses ${providers || 'OAuth'} sign-in. Please use that method instead.`,
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Resolve the user's most recent project for the token's projectId
    const latestProject = await this.prisma.project.findFirst({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    return this.issueTokens(user.id, user.email, latestProject?.id ?? '');
  }

  // ─── Provider conflict detection ───────────────────────────────────────────

  /**
   * Check if signing in with a given provider + email would conflict with an
   * existing account. Returns conflict info so the frontend can show an
   * appropriate message or prompt the user to link accounts.
   */
  async checkProviderConflict(
    dto: CheckProviderConflictDto,
  ): Promise<ProviderCheckResult> {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { providers: true },
    });

    // No user with this email — no conflict
    if (!user) {
      return { conflict: false };
    }

    // User exists — check if this provider is already linked
    const existingProvider = user.providers.find(
      (p) => p.provider === dto.provider,
    );

    if (existingProvider) {
      // Same provider already linked — this is a normal sign-in
      return {
        conflict: false,
        userId: user.id,
        message: 'Provider already linked to this account',
      };
    }

    // User exists but with a different provider — conflict!
    const linkedProviders = user.providers.map((p) => p.provider);
    const hasPassword = !!user.passwordHash;

    return {
      conflict: true,
      existingProvider: linkedProviders[0] ?? (hasPassword ? 'password' : undefined),
      userId: user.id,
      message: `An account with this email already exists${
        linkedProviders.length > 0
          ? ` via ${linkedProviders.join(', ')}`
          : hasPassword
            ? ' with a password'
            : ''
      }. Please sign in with that method, or link this provider in your account settings.`,
    };
  }

  /**
   * Link a new OAuth provider to an existing user account.
   * Requires the user to be authenticated (JWT in request).
   */
  async linkProvider(
    userId: string,
    dto: LinkProviderDto,
  ): Promise<{ success: boolean }> {
    // Check if this provider account is already linked to someone
    const existingLink = await this.prisma.userProvider.findUnique({
      where: {
        provider_providerAccountId: {
          provider: dto.provider,
          providerAccountId: dto.providerAccountId,
        },
      },
    });

    if (existingLink) {
      if (existingLink.userId === userId) {
        // Already linked to this user — idempotent
        return { success: true };
      }
      // Linked to a different user — conflict
      throw new ConflictException(
        `This ${dto.provider} account is already linked to another user.`,
      );
    }

    // Verify the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create the provider link
    await this.prisma.userProvider.create({
      data: {
        userId,
        provider: dto.provider,
        providerAccountId: dto.providerAccountId,
      },
    });

    return { success: true };
  }

  /**
   * Create a new user from OAuth sign-in, or return existing user if the
   * provider is already linked. This is called by the frontend after a
   * successful OAuth callback.
   */
  async upsertOAuthUser(dto: LinkProviderDto): Promise<AuthTokens> {
    const email = dto.email.toLowerCase();

    // Check if this provider account is already linked
    const existingLink = await this.prisma.userProvider.findUnique({
      where: {
        provider_providerAccountId: {
          provider: dto.provider,
          providerAccountId: dto.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingLink) {
      // Provider already linked — issue tokens for the existing user
      const latestProject = await this.prisma.project.findFirst({
        where: { ownerId: existingLink.userId },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      return this.issueTokens(
        existingLink.userId,
        existingLink.user.email,
        latestProject?.id ?? '',
      );
    }

    // Check if a user with this email already exists (different provider)
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: { providers: true },
    });

    if (existingUser) {
      // Email exists but with different provider — link this provider
      await this.prisma.userProvider.create({
        data: {
          userId: existingUser.id,
          provider: dto.provider,
          providerAccountId: dto.providerAccountId,
        },
      });

      const latestProject = await this.prisma.project.findFirst({
        where: { ownerId: existingUser.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      return this.issueTokens(
        existingUser.id,
        existingUser.email,
        latestProject?.id ?? '',
      );
    }

    // Brand new user — create account with provider link
    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: dto.displayName,
        passwordHash: null, // OAuth-only user
        providers: {
          create: {
            provider: dto.provider,
            providerAccountId: dto.providerAccountId,
          },
        },
      },
    });

    return this.issueTokens(user.id, user.email, '');
  }

  /**
   * Get all providers linked to a user account.
   */
  async getUserProviders(userId: string) {
    return this.prisma.userProvider.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Unlink a provider from a user account.
   * Prevents unlinking if it's the only sign-in method and no password is set.
   */
  async unlinkProvider(
    userId: string,
    providerId: string,
  ): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { providers: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const provider = user.providers.find((p) => p.id === providerId);
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    // Prevent removing the last sign-in method
    const hasOtherProviders = user.providers.length > 1;
    const hasPassword = !!user.passwordHash;

    if (!hasOtherProviders && !hasPassword) {
      throw new ConflictException(
        'Cannot remove your only sign-in method. Please set a password or link another provider first.',
      );
    }

    await this.prisma.userProvider.delete({
      where: { id: providerId },
    });

    return { success: true };
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Confirm the user still exists and hasn't been deleted
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.issueTokens(user.id, user.email, payload.projectId);
  }

  // ─── API Key: Mint ─────────────────────────────────────────────────────────

  async mintApiKey(
    projectId: string,
    userId: string,
    dto: MintApiKeyDto,
  ): Promise<MintedApiKey> {
    // Verify the project exists and belongs to this user
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Generate a cryptographically random 32-byte key, prefix with "pk_"
    // so it's identifiable in logs/config files without being mistaken for
    // another token type.
    const rawKey = `pk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = await bcrypt.hash(rawKey, BCRYPT_ROUNDS);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        projectId,
        userId,
        keyHash,
        label: dto.label ?? null,
      },
    });

    return {
      id: apiKey.id,
      label: apiKey.label,
      rawKey, // ← only time this is ever returned
      projectId: apiKey.projectId,
      createdAt: apiKey.createdAt,
    };
  }

  // ─── API Key: Revoke ───────────────────────────────────────────────────────

  async revokeApiKey(
    keyId: string,
    userId: string,
    projectId: string,
  ): Promise<void> {
    const key = await this.prisma.apiKey.findFirst({
      where: {
        id: keyId,
        userId,
        projectId,
        revokedAt: null, // can't revoke an already-revoked key
      },
    });

    if (!key) {
      throw new NotFoundException('API key not found or already revoked');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });
  }

  // ─── API Key: List ─────────────────────────────────────────────────────────

  async listApiKeys(projectId: string, userId: string) {
    return this.prisma.apiKey.findMany({
      where: { projectId, userId, revokedAt: null },
      select: {
        id: true,
        label: true,
        lastUsedAt: true,
        createdAt: true,
        // Never select keyHash — it must not leak into responses
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private issueTokens(
    userId: string,
    email: string,
    projectId: string,
  ): AuthTokens {
    const payload: JwtPayload = { sub: userId, email, projectId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TOKEN_TTL,
    });

    return { accessToken, refreshToken };
  }
}
