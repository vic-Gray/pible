import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  /**
   * Min 8 chars — enforced here so the rule is explicit in the DTO,
   * not buried in service logic.
   */
  @ApiProperty({ example: 'SuperSecure123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ example: 'Jane Dev' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}
