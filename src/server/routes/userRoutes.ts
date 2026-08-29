import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';
import { UserRole } from '../db/schema';

export const userRouter = Router();

// Protect all user routes: requires valid token and ADMIN role
userRouter.use(authenticate, requireRole('ADMIN'));

/**
 * GET /api/users
 * Lists all registered users (sanitized)
 */
userRouter.get('/', (_req: Request, res: Response) => {
  const users = db.listUsers();
  res.json({
    count: users.length,
    users,
  });
});

/**
 * POST /api/users
 * Creates a new user with specific role (ADMIN only)
 */
userRouter.post('/', (req: Request, res: Response) => {
  try {
    const { name, email, password, role, isActive } = req.body;

    const newUser = db.createUser({
      name,
      email,
      password,
      role: (role as UserRole) || 'USER',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    AuditService.logEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'USER_CREATED_BY_ADMIN',
      resource: `users/${newUser.id}`,
      details: { createdUserId: newUser.id, createdEmail: newUser.email, role: newUser.role },
      ipAddress: req.ip,
      success: true,
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    AuditService.logEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'USER_CREATE_FAILED',
      resource: 'users',
      details: { error: error?.message },
      ipAddress: req.ip,
      success: false,
      errorMessage: error?.message,
    });

    res.status(400).json({
      error: 'UserCreationError',
      message: error?.message || 'Failed to create user.',
    });
  }
});

/**
 * PATCH /api/users/:id/role
 * Updates a user's role (ADMIN only)
 */
userRouter.patch('/:id/role', (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!role || !['ADMIN', 'ANALYST', 'USER'].includes(role)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Valid role (ADMIN, ANALYST, USER) is required.',
      });
    }

    const updated = db.updateUserRole(userId, role as UserRole);

    AuditService.logEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'USER_ROLE_UPDATED',
      resource: `users/${userId}`,
      details: { targetUserId: userId, newRole: role },
      ipAddress: req.ip,
      success: true,
    });

    res.json({
      message: `User role updated to ${role}`,
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'UpdateError',
      message: error?.message || 'Failed to update user role.',
    });
  }
});

/**
 * DELETE /api/users/:id
 * Deletes a user (ADMIN only)
 */
userRouter.delete('/:id', (req: Request, res: Response) => {
  const userId = req.params.id;
  if (userId === req.user!.id) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Administrators cannot delete their own account.',
    });
  }

  const success = db.deleteUser(userId);
  if (!success) {
    return res.status(404).json({
      error: 'NotFound',
      message: `User with ID '${userId}' not found.`,
    });
  }

  AuditService.logEvent({
    userId: req.user!.id,
    userEmail: req.user!.email,
    userRole: req.user!.role,
    action: 'USER_DELETED',
    resource: `users/${userId}`,
    ipAddress: req.ip,
    success: true,
  });

  res.json({ message: 'User deleted successfully.' });
});
