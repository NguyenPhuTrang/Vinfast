
const parseInteger = (
  value: unknown,
  key: string,
  defaultValue: number,
): number => {
  const parsed = Number(
    value === undefined || value === null || value === ''
      ? defaultValue
      : value,
  );

  if (!Number.isInteger(parsed)) {
    throw new Error(`${key} must be an integer`);
  }

  return parsed;
};

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  // NODE_ENV
  const nodeEnv = String(config.NODE_ENV ?? 'development');

  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, production, or test');
  }

  // PORT
  const port = parseInteger(config.PORT, 'PORT', 4000);

  if (port < 1 || port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  // API_PREFIX
  const apiPrefix = String(config.API_PREFIX ?? 'api')
    .replace(/^\/+|\/+$/g, '');

  if (!apiPrefix || apiPrefix.includes(' ')) {
    throw new Error('Invalid API_PREFIX');
  }

  // API_VERSION
  const apiVersion = String(config.API_VERSION ?? '1');

  if (!/^\d+$/.test(apiVersion) || Number(apiVersion) < 1) {
    throw new Error('API_VERSION must be a positive integer');
  }

  // CORS_ORIGIN
  const corsOrigin = String(
    config.CORS_ORIGIN ?? 'http://localhost:3000',
  );

  const origins = corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN must contain at least one origin');
  }

  for (const origin of origins) {
    try {
      const url = new URL(origin);

      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.origin !== origin
      ) {
        throw new Error();
      }
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }
  }

  // JWT_ACCESS_SECRET
  const jwtSecret = String(config.JWT_ACCESS_SECRET ?? '');

  if (
    jwtSecret.length < 32 ||
    jwtSecret.includes('CHANGE_ME') ||
    jwtSecret.includes('replace-with-')
  ) {
    throw new Error(
      'JWT_ACCESS_SECRET must contain at least 32 characters and must not be a placeholder',
    );
  }

  // JWT_ACCESS_EXPIRES_IN
  const jwtExpiresIn = parseInteger(
    config.JWT_ACCESS_EXPIRES_IN,
    'JWT_ACCESS_EXPIRES_IN',
    900,
  );

  if (jwtExpiresIn < 1 || jwtExpiresIn > 3600) {
    throw new Error(
      'JWT_ACCESS_EXPIRES_IN must be between 1 and 3600 seconds',
    );
  }

  // GOOGLE_CLIENT_ID
const googleClientId = String(
  config.GOOGLE_CLIENT_ID ?? '',
).trim();

if (
  !googleClientId ||
  !googleClientId.endsWith('.apps.googleusercontent.com')
) {
  throw new Error('Invalid GOOGLE_CLIENT_ID');
}

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: port,
    API_PREFIX: apiPrefix,
    API_VERSION: apiVersion,
    CORS_ORIGIN: origins.join(','),
    JWT_ACCESS_SECRET: jwtSecret,
    JWT_ACCESS_EXPIRES_IN: jwtExpiresIn,
     GOOGLE_CLIENT_ID: googleClientId,
  };
}
