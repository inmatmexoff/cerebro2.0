// Credentials provided by user:
// App ID: 915941616480976
// Client Secret: 2QqfRfJo4wmZU3rMSijD2DPkxjLt5N2O

// It is strongly recommended to move these to environment variables for production.
// e.g., NEXT_PUBLIC_ML_APP_ID and ML_CLIENT_SECRET
export const ML_APP_ID = process.env.NEXT_PUBLIC_ML_APP_ID || '915941616480976';
export const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET || '2QqfRfJo4wmZU3rMSijD2DPkxjLt5N2O';

// The redirect URI must be registered as an authorized URL in your Mercado Libre application settings.
// For local development, use: https://localhost:9002/api/auth/callback/mercadolibre
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:9002';

export const ML_REDIRECT_URI = `${APP_URL}/api/auth/callback/mercadolibre`;
