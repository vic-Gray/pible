import { Module, OnModuleInit } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryModule } from '../cloudinary/cloudinary.module.js';
import { AvatarService } from './avatar.service.js';
import { AvatarController } from './avatar.controller.js';
import * as fs from 'node:fs';

@Module({
  imports: [
    CloudinaryModule,
    MulterModule.register({
      dest: '/tmp/avatars',
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  ],
  controllers: [AvatarController],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule implements OnModuleInit {
  onModuleInit() {
    fs.mkdirSync('/tmp/avatars', { recursive: true });
  }
}
