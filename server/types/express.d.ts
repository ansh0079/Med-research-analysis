import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user populated by optionalAuth / requireAuthJwt middleware */
      user?: {
        id: string;
        email: string;
        name?: string;
        role: string;
        emailVerified: boolean;
        subscription_plan?: string;
        subscription_status?: string;
      };
      /** Raw JWT token from the httpOnly cookie */
      token?: string;
      /** Session tracking ID (generated or from X-Session-Id header) */
      sessionId?: string;
    }
  }
}

export {};
