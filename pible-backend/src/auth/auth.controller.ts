import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { MintApiKeyDto } from './dto/mint-api-key.dto.js';
import { UpdateAvatarDto } from './dto/update-avatar.dto.js';
import {
  CheckProviderConflictDto,
  LinkProviderDto,
} from './dto/provider.dto.js';
import { CurrentActor } from './decorators/current-actor.decorator.js';
import type { RequestContext } from './request-context.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Public endpoints (no auth required) ───────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'Returns access + refresh tokens' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in and receive access + refresh tokens' })
  @ApiResponse({ status: 200, description: 'Returns access + refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for new token pair' })
  @ApiResponse({ status: 200, description: 'Returns new access + refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * POST /api/v1/auth/providers/check
   * Check if signing in with a provider + email would conflict with an
   * existing account. Used by the frontend during OAuth sign-in flow.
   */
  @Post('providers/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check for provider/email conflict before OAuth sign-in',
  })
  @ApiResponse({ status: 200, description: 'Returns conflict status' })
  checkProviderConflict(@Body() dto: CheckProviderConflictDto) {
    return this.authService.checkProviderConflict(dto);
  }

  /**
   * POST /api/v1/auth/providers/upsert
   * Create or link an OAuth user. Called by frontend after successful
   * OAuth callback to ensure the user exists in our database.
   */
  @Post('providers/upsert')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or link an OAuth user account',
  })
  @ApiResponse({ status: 201, description: 'Returns access + refresh tokens' })
  @ApiResponse({ status: 409, description: 'Provider linked to different user' })
  upsertOAuthUser(@Body() dto: LinkProviderDto) {
    return this.authService.upsertOAuthUser(dto);
  }

  // ─── Protected: JWT required ───────────────────────────────────────────────

  /**
   * GET /api/v1/auth/me
   * Returns the resolved RequestContext — useful for the dashboard to confirm
   * the current token's identity and projectId without making a full DB call.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Return current actor context from access token' })
  @ApiResponse({ status: 200, description: 'Returns RequestContext' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  me(@CurrentActor() actor: RequestContext) {
    return actor;
  }

  /**
   * GET /api/v1/auth/providers
   * List all providers linked to the current user's account.
   */
  @Get('providers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List linked OAuth providers' })
  @ApiResponse({ status: 200, description: 'Array of linked providers' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  listProviders(@CurrentActor() actor: RequestContext) {
    return this.authService.getUserProviders(actor.actorId);
  }

  /**
   * POST /api/v1/auth/providers/link
   * Link a new OAuth provider to the current user's account.
   */
  @Post('providers/link')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Link a new OAuth provider to current account' })
  @ApiResponse({ status: 201, description: 'Provider linked successfully' })
  @ApiResponse({ status: 409, description: 'Provider already linked to another user' })
  linkProvider(
    @Body() dto: LinkProviderDto,
    @CurrentActor() actor: RequestContext,
  ) {
    return this.authService.linkProvider(actor.actorId, dto);
  }

  /**
   * DELETE /api/v1/auth/providers/:providerId
   * Unlink a provider from the current user's account.
   */
  @Delete('providers/:providerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Unlink a provider from current account' })
  @ApiResponse({ status: 204, description: 'Provider unlinked' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({ status: 409, description: 'Cannot remove only sign-in method' })
  unlinkProvider(
    @Param('providerId') providerId: string,
    @CurrentActor() actor: RequestContext,
  ) {
    return this.authService.unlinkProvider(actor.actorId, providerId);
  }

  /**
   * PATCH /api/v1/auth/me/avatar
   * Upload a new avatar image to Cloudinary and update the current user's avatar.
   */
  @Patch('me/avatar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update current user avatar' })
  @ApiResponse({ status: 200, description: 'Returns updated avatar URL' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  updateAvatar(
    @Body() dto: UpdateAvatarDto,
    @CurrentActor() actor: RequestContext,
  ) {
    return this.authService.updateAvatar(actor.actorId, dto.imageUrl);
  }

  /**
   * POST /api/v1/projects/:projectId/api-keys
   * Mints a new API key for the given project.
   * The raw key is returned ONCE — it cannot be retrieved again.
   */
  @Post('/projects/:projectId/api-keys')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Mint a new API key for a project (returned once only)',
  })
  @ApiResponse({ status: 201, description: 'Returns id + rawKey (once only)' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  mintApiKey(
    @Param('projectId') projectId: string,
    @Body() dto: MintApiKeyDto,
    @CurrentActor() actor: RequestContext,
  ) {
    return this.authService.mintApiKey(projectId, actor.actorId, dto);
  }

  /**
   * GET /api/v1/projects/:projectId/api-keys
   * Lists active (non-revoked) API keys for the project.
   * keyHash is never included in the response.
   */
  @Get('/projects/:projectId/api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List active API keys for a project' })
  @ApiResponse({ status: 200, description: 'Array of active API key metadata' })
  listApiKeys(
    @Param('projectId') projectId: string,
    @CurrentActor() actor: RequestContext,
  ) {
    return this.authService.listApiKeys(projectId, actor.actorId);
  }

  /**
   * DELETE /api/v1/projects/:projectId/api-keys/:keyId
   * Revokes an API key. Idempotent — already-revoked keys return 404.
   */
  @Delete('/projects/:projectId/api-keys/:keyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 204, description: 'Key revoked' })
  @ApiResponse({ status: 404, description: 'Key not found or already revoked' })
  revokeApiKey(
    @Param('projectId') projectId: string,
    @Param('keyId') keyId: string,
    @CurrentActor() actor: RequestContext,
  ) {
    return this.authService.revokeApiKey(keyId, actor.actorId, projectId);
  }
}
