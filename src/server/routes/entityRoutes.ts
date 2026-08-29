import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { authenticate, requireRole, optionalAuthenticate } from '../middleware/authMiddleware';
import { AuditService } from '../services/auditService';
import { modelRegistry } from '../services/modelRegistry';

export const entityRouter = Router();

// =========================================================================
// CUSTOMERS (ADMIN, ANALYST)
// =========================================================================

entityRouter.get('/customers', authenticate, requireRole('ADMIN', 'ANALYST'), (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || 50), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);
  const result = db.listCustomers(limit, offset);
  res.json(result);
});

entityRouter.post('/customers', authenticate, requireRole('ADMIN', 'ANALYST'), (req: Request, res: Response) => {
  try {
    const customer = db.createCustomer(req.body);

    AuditService.logEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'CUSTOMER_CREATED',
      resource: `customers/${customer.id}`,
      details: { email: customer.email, riskTier: customer.riskTier },
      ipAddress: req.ip,
      success: true,
    });

    res.status(201).json(customer);
  } catch (error: any) {
    res.status(400).json({
      error: 'CustomerCreationError',
      message: error?.message || 'Failed to create customer.',
    });
  }
});

// =========================================================================
// POLICIES (ADMIN, ANALYST)
// =========================================================================

entityRouter.get('/policies', authenticate, requireRole('ADMIN', 'ANALYST'), (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || 50), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);
  const result = db.listPolicies(limit, offset);
  res.json(result);
});

entityRouter.post('/policies', authenticate, requireRole('ADMIN', 'ANALYST'), (req: Request, res: Response) => {
  try {
    const policy = db.createPolicy(req.body);

    AuditService.logEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'POLICY_CREATED',
      resource: `policies/${policy.id}`,
      details: { policyNumber: policy.policyNumber, customerId: policy.customerId, premium: policy.annualPremiumUSD },
      ipAddress: req.ip,
      success: true,
    });

    res.status(201).json(policy);
  } catch (error: any) {
    res.status(400).json({
      error: 'PolicyCreationError',
      message: error?.message || 'Failed to create policy.',
    });
  }
});

// =========================================================================
// CLAIMS (ADMIN, ANALYST)
// =========================================================================

entityRouter.get('/claims', authenticate, requireRole('ADMIN', 'ANALYST'), (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || 50), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);
  const result = db.listClaims(limit, offset);
  res.json(result);
});

entityRouter.post('/claims', authenticate, requireRole('ADMIN', 'ANALYST'), (req: Request, res: Response) => {
  try {
    const claim = db.createClaim(req.body);

    AuditService.logEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'CLAIM_CREATED',
      resource: `claims/${claim.id}`,
      details: { claimNumber: claim.claimNumber, policyId: claim.policyId, amount: claim.amountClaimedUSD },
      ipAddress: req.ip,
      success: true,
    });

    res.status(201).json(claim);
  } catch (error: any) {
    res.status(400).json({
      error: 'ClaimCreationError',
      message: error?.message || 'Failed to create claim.',
    });
  }
});

// =========================================================================
// PREDICTION HISTORY (Role-scoped: USER sees only own; ANALYST/ADMIN see all)
// =========================================================================

entityRouter.get('/predictions/history', authenticate, (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || 50), 10);
  const offset = parseInt(String(req.query.offset || 0), 10);

  // If USER role, strictly scope query to their own userId
  const filterUserId = req.user!.role === 'USER' ? req.user!.id : (req.query.userId as string | undefined);

  const result = db.listPredictions({
    userId: filterUserId,
    limit,
    offset,
  });

  res.json({
    roleScope: req.user!.role,
    ...result,
  });
});

// =========================================================================
// MODEL MANAGEMENT & METRICS
// =========================================================================

/**
 * POST /api/models/activate
 * Switches the active production champion model (ADMIN ONLY)
 */
entityRouter.post('/models/activate', authenticate, requireRole('ADMIN'), (req: Request, res: Response) => {
  try {
    const { version } = req.body;
    if (!version) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Model version string is required.',
      });
    }

    const previousChampion = modelRegistry.getActiveVersion();
    modelRegistry.setActiveVersion(version);
    const updatedModel = db.activateModel(version);

    AuditService.logEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'MODEL_CHAMPION_SWITCH',
      resource: `models/${version}`,
      details: { previousVersion: previousChampion, newVersion: version },
      ipAddress: req.ip,
      success: true,
    });

    res.json({
      message: `Model version '${version}' is now the active production champion.`,
      activeModel: updatedModel,
      previousChampion,
    });
  } catch (error: any) {
    AuditService.logEvent({
      userId: req.user!.id,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'MODEL_CHAMPION_SWITCH_FAILED',
      resource: 'models',
      details: { error: error?.message },
      ipAddress: req.ip,
      success: false,
      errorMessage: error?.message,
    });

    res.status(400).json({
      error: 'ModelActivationError',
      message: error?.message || 'Failed to switch active model champion.',
    });
  }
});

/**
 * GET /api/models/:version/metrics
 * Retrieves validation metrics and performance (ADMIN, ANALYST)
 */
entityRouter.get('/models/:version/metrics', authenticate, requireRole('ADMIN', 'ANALYST'), (req: Request, res: Response) => {
  const version = req.params.version;
  const metrics = db.getModelMetrics(version);
  const model = db.findModelByVersion(version);

  if (!model) {
    return res.status(404).json({
      error: 'NotFound',
      message: `Model version '${version}' not found in registry.`,
    });
  }

  res.json({
    model,
    metrics,
  });
});
