import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { SecurityService } from '../auth/security';
import { authenticate } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimiter';
import { AuditService } from '../services/auditService';
import { logger } from '../logger';
import { UserRole } from '../db/schema';

export const authRouter = Router();

// Apply authentication rate limiting (15 requests / 5 mins) to all auth endpoints
authRouter.use(authRateLimiter);

/**
 * POST /api/auth/login
 * Authenticates user with email and password, issuing a signed bearer token
 */
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    AuditService.logEvent({
      action: 'AUTH_LOGIN_FAILED',
      resource: 'auth/login',
      details: { reason: 'Missing email or password' },
      ipAddress: req.ip,
      success: false,
      errorMessage: 'Missing email or password credentials.',
    });
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Both email and password are required.',
    });
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    AuditService.logEvent({
      userEmail: email,
      action: 'AUTH_LOGIN_FAILED',
      resource: 'auth/login',
      details: { reason: 'User not found' },
      ipAddress: req.ip,
      success: false,
      errorMessage: 'Invalid email or password.',
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid email or password.',
    });
  }

  if (!user.isActive) {
    AuditService.logEvent({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'AUTH_LOGIN_BLOCKED',
      resource: 'auth/login',
      details: { reason: 'Account deactivated' },
      ipAddress: req.ip,
      success: false,
      errorMessage: 'Account is deactivated. Contact administrator.',
    });
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Account is deactivated. Please contact an administrator.',
    });
  }

  const isPasswordValid = SecurityService.verifyPassword(password, user.passwordHash, user.salt);
  if (!isPasswordValid) {
    AuditService.logEvent({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'AUTH_LOGIN_FAILED',
      resource: 'auth/login',
      details: { reason: 'Incorrect password' },
      ipAddress: req.ip,
      success: false,
      errorMessage: 'Invalid email or password.',
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid email or password.',
    });
  }

  // Update last login timestamp
  db.updateUserLastLogin(user.id);

  // Generate signed token
  const token = SecurityService.generateToken(user);
  const safeUser = SecurityService.sanitizeUser(user);

  AuditService.logEvent({
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    action: 'AUTH_LOGIN_SUCCESS',
    resource: 'auth/login',
    details: { role: user.role },
    ipAddress: req.ip,
    success: true,
  });

  logger.info(`User ${user.email} (${user.role}) logged in successfully.`);

  return res.status(200).json({
    message: 'Login successful',
    token,
    user: safeUser,
  });
});

/**
 * POST /api/auth/register
 * Registers a new user account
 */
authRouter.post('/register', (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Name, email, and password are required for registration.',
      });
    }

    // Security Fix (CWE-269): Public self-registration MUST strictly default to USER role.
    // Privileged roles (ADMIN, ANALYST) can only be created or modified by an authenticated ADMIN via /api/users.
    const assignedRole: UserRole = 'USER';

    const newUser = db.createUser({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: String(password),
      role: assignedRole,
    });

    const token = SecurityService.generateToken(newUser);
    const safeUser = SecurityService.sanitizeUser(newUser);

    AuditService.logEvent({
      userId: newUser.id,
      userEmail: newUser.email,
      userRole: newUser.role,
      action: 'AUTH_REGISTER',
      resource: 'auth/register',
      details: { role: assignedRole },
      ipAddress: req.ip,
      success: true,
    });

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: safeUser,
    });
  } catch (error: any) {
    AuditService.logEvent({
      action: 'AUTH_REGISTER_FAILED',
      resource: 'auth/register',
      details: { error: error?.message },
      ipAddress: req.ip,
      success: false,
      errorMessage: error?.message,
    });

    return res.status(400).json({
      error: 'RegistrationError',
      message: error?.message || 'Failed to register user.',
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile
 */
authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  const user = db.findUserById(req.user!.id);
  if (!user) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'User not found.',
    });
  }

  res.json({
    user: SecurityService.sanitizeUser(user),
  });
});

/**
 * POST /api/auth/logout
 * Records logout audit event
 */
authRouter.post('/logout', authenticate, (req: Request, res: Response) => {
  AuditService.logEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'AUTH_LOGOUT',
    resource: 'auth/logout',
    ipAddress: req.ip,
    success: true,
  });

  res.json({ message: 'Logged out successfully.' });
});

/**
 * GET /api/auth/demo-users
 * Returns list of pre-seeded accounts for testing and evaluation
 */
authRouter.get('/demo-users', (_req: Request, res: Response) => {
  const users = [
    {
      role: 'ADMIN',
      name: 'Dr. Evelyn Reed (Chief Actuary)',
      email: 'admin@actuarial.ai',
      password: 'AdminPassword!2026',
      permissions: ['Manage Users', 'Activate Production Models', 'Audit Governance', 'All Analytics'],
    },
    {
      role: 'ANALYST',
      name: 'Marcus Vance (Senior Actuarial Analyst)',
      email: 'analyst@actuarial.ai',
      password: 'AnalystSecure!2026',
      permissions: ['Run ML Pipelines', 'Full Prediction Console', 'Model Metrics Comparison', 'Data Quality'],
    },
    {
      role: 'USER',
      name: 'Alex Chen (Policyholder / Underwriting User)',
      email: 'user@policyholder.com',
      password: 'UserPasscode!2026',
      permissions: ['Self-Service Risk Predictions', 'View Own Prediction History'],
    },
  ];

  res.json({ demoUsers: users });
});
