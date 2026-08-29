import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    // Makes process.env available via ConfigService across the entire app
    ConfigModule.forRoot({ isGlobal: true }),
    // Global PrismaService — no need to re-import in feature modules
    PrismaModule,
    // Auth: JWT (dashboard) + API Key (agents/CLI)
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
