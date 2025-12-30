import { Response } from 'express';
import { ZodError } from 'zod';

/**
 * Centralized error handler for API routes
 * Handles Zod validation errors and generic errors consistently
 */
export function handleError(res: Response, error: unknown): Response {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
  }

  console.error(error);
  return res.status(500).json({
    error: 'Internal Server Error',
    message: error instanceof Error ? error.message : 'Unknown error',
  });
}

/**
 * Send a standardized 404 Not Found response
 */
export function notFound(res: Response, entityName: string, id?: string): Response {
  const message = id
    ? `${entityName} with ID '${id}' not found`
    : `${entityName} not found`;
  return res.status(404).json({ error: message });
}

/**
 * Send a standardized 409 Conflict response (duplicate)
 */
export function conflict(res: Response, entityName: string, field: string): Response {
  return res.status(409).json({
    error: `${entityName} with this ${field} already exists`,
  });
}

/**
 * Send a standardized 400 Bad Request response
 */
export function badRequest(res: Response, message: string): Response {
  return res.status(400).json({ error: message });
}

/**
 * Send a standardized 403 Forbidden response
 */
export function forbidden(res: Response, message: string): Response {
  return res.status(403).json({ error: message });
}
