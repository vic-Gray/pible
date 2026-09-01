import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UploadAvatarDto {
  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'Publicly accessible image URL to upload as avatar',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  imageUrl: string;
}
