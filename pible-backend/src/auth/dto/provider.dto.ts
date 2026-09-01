import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CheckProviderConflictDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'github' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  provider: string;
}

export class LinkProviderDto {
  @ApiProperty({ example: 'github' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  provider: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  providerAccountId: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Jane Dev' })
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiProperty({ example: 'https://avatars.githubusercontent.com/u/12345678?v=4', required: false })
  @IsString()
  avatarUrl?: string;
}

export class ProviderConflictResponse {
  conflict: boolean;
  existingProvider?: string;
  message?: string;
}
