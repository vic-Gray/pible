import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(imageUrl: string): Promise<string | null> {
    try {
      const result = await cloudinary.uploader.upload(imageUrl, {
        folder: 'pible/avatars',
        transformation: [
          { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        ],
      });
      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload failed:', error);
      return null;
    }
  }
}
