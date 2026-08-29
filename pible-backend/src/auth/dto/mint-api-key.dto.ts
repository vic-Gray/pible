import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MintApiKeyDto {
  /**
   * Human-readable label so the user can identify the key in the dashboard
   * (e.g. "cursor-agent", "ci-pipeline").
   */
  @ApiPropertyOptional({ example: 'cursor-agent' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;
}
