import { Request, Response, NextFunction } from 'express';

/**
 * User context interface for audit trails
 */
export interface UserContext {
  userId: string;
  userName: string;
}

/**
 * Extended Request type with user context
 */
export interface RequestWithUser extends Request {
  userContext: UserContext;
}

/**
 * Middleware to extract user context from request headers
 * Adds userContext to the request object for use in route handlers
 */
export function extractUserContext(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const userId = (req.headers['x-user-id'] as string) || 'system';
  const userName = (req.headers['x-user-name'] as string) || 'System';

  (req as RequestWithUser).userContext = { userId, userName };
  next();
}

/**
 * Helper to get user context from request
 * Use this in route handlers instead of manually extracting headers
 */
export function getUserContext(req: Request): UserContext {
  const reqWithUser = req as RequestWithUser;
  if (reqWithUser.userContext) {
    return reqWithUser.userContext;
  }

  // Fallback if middleware not applied
  return {
    userId: (req.headers['x-user-id'] as string) || 'system',
    userName: (req.headers['x-user-name'] as string) || 'System',
  };
}
