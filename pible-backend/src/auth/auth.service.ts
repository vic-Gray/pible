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
    });

    if (existing) {
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
    });

    if (!user) {
      // Use the same error message as a wrong password to prevent
      // user enumeration via timing differences
      throw new UnauthorizedException('Invalid credentials');
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
