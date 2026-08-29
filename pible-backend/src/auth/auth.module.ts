import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { ApiKeyStrategy } from './api-key.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    /**
     * JwtModule is configured async so it can read JWT_ACCESS_SECRET
     * from ConfigService rather than hard-coding it.
     *
     * Note: we register the module here for signing (AuthService.issueTokens).
     * The JwtStrategy reads the secret independently for verification,
     * also via ConfigService, so each operation always uses the right secret.
     */
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        // No global signOptions.expiresIn here — each sign call in
        // AuthService sets its own TTL explicitly (15m access, 7d refresh).
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ApiKeyStrategy,
    // Export guards so other modules can use @UseGuards(JwtAuthGuard)
    // without needing to import the guard class directly.
    JwtAuthGuard,
    ApiKeyGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    ApiKeyGuard,
    JwtModule, // other modules that need JwtService (e.g. for custom token ops)
  ],
})
export class AuthModule {}
