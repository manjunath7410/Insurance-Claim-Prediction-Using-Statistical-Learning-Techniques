import { Request, Response, NextFunction } from 'express';
import { SecurityService, TokenPayload } from '../auth/security';
import { db } from '../db/database';
import { UserRole, Permission, ROLE_PERMISSIONS } from '../db/schema';
import { AuditService } from '../services/auditService';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Extracts bearer token from Authorization header or x-access-token header
 * Note: Tokens in URL query parameters are forbidden for security (CWE-598).
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (typeof req.headers['x-access-token'] === 'string') {
    return req.headers['x-access-token'].trim();
  }
  return null;
}

/**
 * Middleware: Strictly requires valid authentication token
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please provide a valid Bearer token in the Authorization header.',
    });
  }

  const payload = SecurityService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token.',
    });
  }

  const user = db.findUserById(payload.userId);
  if (!user || !user.isActive) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'User account is inactive or no longer exists.',
    });
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  next();
}

/**
 * Middleware: Optionally populates req.user if a valid token is present
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  const payload = SecurityService.verifyToken(token);
  if (payload) {
    const user = db.findUserById(payload.userId);
    if (user && user.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    }
  }

  next();
}

/**
 * Middleware: Enforces Role-Based Access Control (RBAC)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before verifying role permissions.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Record security audit event
      AuditService.logEvent({
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'ACCESS_DENIED_ROLE',
        resource: `${req.method} ${req.originalUrl}`,
        details: { requiredRoles: allowedRoles, currentRole: req.user.role },
        ipAddress: req.ip,
        success: false,
        errorMessage: `User role '${req.user.role}' lacks required permissions (${allowedRoles.join(', ')}).`,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Endpoint requires one of the following roles: [${allowedRoles.join(
          ', '
        )}]. Current role: '${req.user.role}'.`,
      });
    }

    next();
  };
}

/**
 * Middleware: Enforces granular permission check
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
    }

    const userPermissions = (ROLE_PERMISSIONS[req.user.role] as Permission[]) || [];
    if (!userPermissions.includes(permission)) {
      AuditService.logEvent({
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        action: 'ACCESS_DENIED_PERMISSION',
        resource: `${req.method} ${req.originalUrl}`,
        details: { requiredPermission: permission, currentRole: req.user.role },
        ipAddress: req.ip,
        success: false,
        errorMessage: `Permission '${permission}' not granted for role '${req.user.role}'.`,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. You lack the '${permission}' permission.`,
      });
    }

    next();
  };
}
