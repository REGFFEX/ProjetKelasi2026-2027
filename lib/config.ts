export const isDevelopment = process.env.NODE_ENV !== 'production';

export const enableDemoAuth = process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH === 'true' || isDevelopment;
export const enableMockDataFallback = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true' || isDevelopment;

export const appFeatureFlags = {
  enableDemoAuth,
  enableMockDataFallback,
};
