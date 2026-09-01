import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module.js';

const logger = new Logger('Bootstrap');

/**
 * -------------------------------------------------------
 * Allowed CORS origins
 * -------------------------------------------------------
 *
 * Configure via environment variables so origins never need
 * to be hard-coded or redeployed to change:
 *
 *  - FRONTEND_URL_PRODUCTION  -> your production frontend URL
 *  - FRONTEND_URL_TESTING     -> your staging/testing URL
 *                                (defaults to http://localhost:3000)
 *  - CORS_ORIGINS             -> comma-separated list of any
 *                                additional origins you want to allow
 *                                e.g. "https://app.example.com,https://admin.example.com"
 *
 * Add/remove URLs by editing the .env file only — no code changes needed.
 */
function getAllowedOrigins(): string[] {
  const productionUrl = process.env.FRONTEND_URL_PRODUCTION?.trim();
  const testingUrl =
    process.env.FRONTEND_URL_TESTING?.trim() || 'http://localhost:3000';
  const swaggerUrl = process.env.FRONTEND_URL_SWAGGER?.trim();

  const extraOrigins =
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  const origins = [productionUrl, testingUrl, swaggerUrl, ...extraOrigins].filter(
    (origin): origin is string => Boolean(origin),
  );

  return Array.from(new Set(origins));
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;
  const apiPrefix = process.env.API_PREFIX || 'api';

  // Trust the first proxy hop (reverse proxy / load balancer) so
  // secure cookies, IP-based rate limiting, and req.protocol behave
  // correctly in production.
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  /**
   * -------------------------------------------------------
   * Security headers
   * -------------------------------------------------------
   */
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'"],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
      crossOriginEmbedderPolicy: isProduction,
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      hidePoweredBy: true,
      noSniff: true,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'no-referrer' },
      dnsPrefetchControl: { allow: false },
      ieNoOpen: true,
      xssFilter: true,
    }),
  );

  /**
   * -------------------------------------------------------
   * CORS
   * -------------------------------------------------------
   */
  const allowedOrigins = getAllowedOrigins();

  if (allowedOrigins.length === 0) {
    logger.warn(
      'No CORS origins configured. Set FRONTEND_URL_PRODUCTION / FRONTEND_URL_TESTING / CORS_ORIGINS.',
    );
  } else {
    logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  }

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow non-browser requests (curl, server-to-server, health checks)
      // which don't send an Origin header at all.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`Blocked request from disallowed origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    maxAge: 86400,
  });


 app.setGlobalPrefix(`${apiPrefix}/v1`, {
     exclude: ['/health', '/health/live', '/health/ready'],
   });

  app.enableVersioning({
    type: VersioningType.URI,
  });



  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },

      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  /**
   * -------------------------------------------------------
   * Swagger / OpenAPI
   * -------------------------------------------------------
   *
   * Enabled only when explicitly requested and never in production,
   * so API surface/schema details are never exposed publicly.
   */
  const enableSwagger =
    process.env.ENABLE_SWAGGER === 'true' && !isProduction;

  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(process.env.API_NAME || 'API')
      .setDescription(process.env.API_DESCRIPTION || 'API Documentation')
      .setVersion(process.env.API_VERSION || '1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your access token',
        },
        'access-token',
      )
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('docs', app, swaggerDocument, {
      useGlobalPrefix: true,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
      customSiteTitle: `${process.env.API_NAME || 'API'} Documentation`,
    });
  }

  /**
   * -------------------------------------------------------
   * Graceful Shutdown
   * -------------------------------------------------------
   */
  app.enableShutdownHooks();

  /**
   * -------------------------------------------------------
   * Start Application
   * -------------------------------------------------------
   */
  await app.listen(port, '0.0.0.0');

  // Render (and most PaaS hosts) inject the real public URL as an env var.
  // Fall back to localhost only when running locally, where that's actually correct.
  const publicUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;

  logger.log('🚀 Application started successfully');
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`Port: ${port}`);
  logger.log(`API: ${publicUrl}/${apiPrefix}`);

  if (enableSwagger) {
    logger.log(`📚 Swagger: ${publicUrl}/${apiPrefix}/v1/docs`);
  }
}

void bootstrap();
