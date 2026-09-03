import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { ValidationError } from '../services/predictionService';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const correlationId = (req.headers['x-correlation-id'] as string) || `REQ-${Math.floor(10000 + Math.random() * 90000)}`;

  // Log structured error without leaking secrets or credentials
  logger.error('API Error Encountered', {
    path: req.path,
    method: req.method,
    errorName: err?.name || 'Error',
    errorMessage: err?.message,
    statusCode: err?.statusCode || (err instanceof ValidationError ? 422 : 500),
  }, correlationId);

  // 1. Validation Error Handling
  if (err instanceof ValidationError || err?.name === 'ValidationError') {
    const primaryError = err.fieldErrors?.[0]?.message || err.message;
    const friendlyMsg = primaryError && primaryError.includes('Driver age')
      ? 'Please enter your age to continue.'
      : primaryError || 'Please check your entered details to continue.';

    return res.status(err.statusCode || 422).json({
      error: 'ValidationError',
      message: friendlyMsg,
      fieldErrors: err.fieldErrors || [],
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Malformed JSON Body Parsing Error Handling
  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    return res.status(400).json({
      error: 'MalformedJson',
      message: "We couldn't process the submitted information. Please check your inputs and try again.",
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Model Not Found / Resource Not Found
  if (err?.message && err.message.includes('not found in registry')) {
    return res.status(404).json({
      error: 'ModelNotFound',
      message: "Sorry, we couldn't calculate your result right now. Please try again.",
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  // 4. General / Internal Errors - Never expose internal stack traces or raw technical errors
  const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
  const safeMessage = statusCode >= 500
    ? "Sorry, we couldn't calculate your result right now. Please try again."
    : err?.message || "Sorry, we couldn't calculate your result right now. Please try again.";

  res.status(statusCode).json({
    error: err?.name || 'InternalServerError',
    message: safeMessage,
    correlationId,
    timestamp: new Date().toISOString(),
  });
}
