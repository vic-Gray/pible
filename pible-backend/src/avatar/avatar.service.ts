import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import * as fs from 'node:fs/promises';

@Injectable()
export class AvatarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async getCurrentAvatar(userId: string): Promise<{ avatarUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!user || !user.avatarUrl) {
      throw new NotFoundException('No avatar found for this user');
    }

    return { avatarUrl: user.avatarUrl };
  }

  async uploadFromFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ avatarUrl: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    let tempPath: string | undefined = file.path;

    try {
      // Upload the local temp file via its filesystem path as a URL-like path
      const uploadedUrl = await this.cloudinary.uploadImage(tempPath);



      if (!uploadedUrl) {
        throw new BadRequestException('Failed to upload image to Cloudinary');
      }

      return this.saveAvatar(userId, uploadedUrl, 'upload');
    } finally {
      // Clean up temp file
      if (tempPath) {
        await fs.unlink(tempPath).catch(() => undefined);
      }
    }
  }

  async uploadFromUrl(
    userId: string,
    imageUrl: string,
  ): Promise<{ avatarUrl: string }> {
    const uploadedUrl = await this.cloudinary.uploadImage(imageUrl);

    if (!uploadedUrl) {
      throw new BadRequestException(
        'Failed to upload image from URL to Cloudinary',
      );
    }

    return this.saveAvatar(userId, uploadedUrl, 'url');
  }

  async deleteAvatar(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!user || !user.avatarUrl) {
      throw new NotFoundException('No avatar found for this user');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });
  }

  async getHistory(
    userId: string,
  ): Promise<Array<{ id: string; avatarUrl: string; provider: string; createdAt: Date }>> {
    const history = await this.prisma.avatarHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        avatarUrl: true,
        provider: true,
        createdAt: true,
      },
    });

    return history;
  }

  // ─── private helpers ──────────────────────────────────────────────────────

  private async saveAvatar(
    userId: string,
    avatarUrl: string,
    provider: string,
  ): Promise<{ avatarUrl: string }> {
    await this.prisma.$transaction([
      // Update the user's current avatar
      this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
      }),
      // Append to history
      this.prisma.avatarHistory.create({
        data: { userId, avatarUrl, provider },
      }),
    ]);

    return { avatarUrl };
  }
}
