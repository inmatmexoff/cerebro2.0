// Credentials provided by user:
// App ID: 915941616480976
// Client Secret: 2QqfRfJo4wmZU3rMSijD2DPkxjLt5N2O

// It is strongly recommended to move these to environment variables for production.
// e.g., NEXT_PUBLIC_ML_APP_ID and ML_CLIENT_SECRET
export const ML_APP_ID = process.env.NEXT_PUBLIC_ML_APP_ID || '915941616480976';
export const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET || '2QqfRfJo4wmZU3rMSijD2DPkxjLt5N2O';

// The path for the redirect URI. The full URL will be constructed dynamically
// using the request's origin to avoid using localhost.
export const ML_CALLBACK_PATH = '/api/auth/callback/mercadolibre';