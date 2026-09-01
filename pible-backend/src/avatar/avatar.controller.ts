import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AvatarService } from './avatar.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentActor } from '../auth/decorators/current-actor.decorator.js';
import type { RequestContext } from '../auth/request-context.js';
import { UploadAvatarDto } from './dto/upload-avatar.dto.js';

@ApiTags('Avatar')
@Controller('avatars')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user avatar' })
  @ApiResponse({ status: 200, description: 'Returns current avatar URL' })
  @ApiResponse({ status: 404, description: 'No avatar found' })
  getCurrentAvatar(@CurrentActor() actor: RequestContext) {
    return this.avatarService.getCurrentAvatar(actor.actorId);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload avatar from file' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFromFile(
    @CurrentActor() actor: RequestContext,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.avatarService.uploadFromFile(actor.actorId, file);
  }

  @Post('from-url')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload avatar from URL' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL' })
  uploadFromUrl(
    @CurrentActor() actor: RequestContext,
    @Body() dto: UploadAvatarDto,
  ) {
    return this.avatarService.uploadFromUrl(actor.actorId, dto.imageUrl);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete current user avatar' })
  @ApiResponse({ status: 204, description: 'Avatar deleted' })
  @ApiResponse({ status: 404, description: 'No avatar found' })
  deleteAvatar(@CurrentActor() actor: RequestContext) {
    return this.avatarService.deleteAvatar(actor.actorId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get avatar change history' })
  @ApiResponse({ status: 200, description: 'Returns avatar history' })
  getHistory(@CurrentActor() actor: RequestContext) {
    return this.avatarService.getHistory(actor.actorId);
  }
}
