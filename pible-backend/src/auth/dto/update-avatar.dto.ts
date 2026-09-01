import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty({ example: 'https://avatars.githubusercontent.com/u/12345678?v=4' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  imageUrl: string;
}
