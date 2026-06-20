export type AppEnv = 'development' | 'test' | 'staging' | 'production';

export function getAppEnv(): AppEnv {
  const explicit =
    process.env.NEXT_PUBLIC_APP_ENV?.trim() ||
    process.env.APP_ENV?.trim() ||
    process.env.NODE_ENV?.trim();

  switch (explicit) {
    case 'production':
      return 'production';
    case 'staging':
      return 'staging';
    case 'test':
      return 'test';
    case 'development':
      return 'development';
    default:
      return 'development';
  }
}

export function isDevelopmentAppEnv(): boolean {
  const env = getAppEnv();
  return env === 'development' || env === 'test';
}

export function isProductionAppEnv(): boolean {
  return getAppEnv() === 'production';
}
