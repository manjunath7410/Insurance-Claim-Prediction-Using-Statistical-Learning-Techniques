import { Router, Request, Response } from 'express';
import { optionalAuthenticate } from '../middleware/authMiddleware';
import { AnalyticsService } from '../services/analyticsService';
import { AnalyticsFilterParams } from '../../types';
import { logger } from '../logger';

export const analyticsRouter = Router();

/**
 * GET /api/analytics
 * Comprehensive aggregated analytics for the Insurance Analytics Dashboard.
 * Supports dateRange, riskLevel, coverageTier, regionalZone, and modelVersion filters.
 * Scopes data according to authenticated user role (USER vs ANALYST/ADMIN).
 */
analyticsRouter.get('/', optionalAuthenticate, (req: Request, res: Response) => {
  try {
    const filters: AnalyticsFilterParams = {
      dateRange: (req.query.dateRange as any) || 'all',
      riskLevel: (req.query.riskLevel as any) || 'all',
      coverageTier: (req.query.coverageTier as string) || 'all',
      regionalZone: (req.query.regionalZone as string) || (req.query.customerSegment as string) || 'all',
      modelVersion: (req.query.modelVersion as string) || 'all',
    };

    const userScope = req.user ? { id: req.user.id, role: req.user.role } : undefined;

    const data = AnalyticsService.getAnalytics(filters, userScope);

    res.json(data);
  } catch (error: any) {
    logger.error('Failed to compute analytics dashboard payload', { message: error?.message });
    res.status(500).json({
      error: 'AnalyticsComputationError',
      message: error?.message || 'Failed to compute actuarial analytics dashboard payload.',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/analytics/kpis
 * Fast KPI overview metrics
 */
analyticsRouter.get('/kpis', optionalAuthenticate, (req: Request, res: Response) => {
  try {
    const filters: AnalyticsFilterParams = {
      dateRange: (req.query.dateRange as any) || 'all',
      riskLevel: (req.query.riskLevel as any) || 'all',
    };
    const userScope = req.user ? { id: req.user.id, role: req.user.role } : undefined;
    const data = AnalyticsService.getAnalytics(filters, userScope);
    res.json({
      overviewKpis: data.overviewKpis,
      calculatedAt: data.calculatedAt,
      isDemoData: data.isDemoData,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'AnalyticsError', message: error?.message });
  }
});

/**
 * GET /api/analytics/distributions
 * Distributions for claims, risk tiers, and probability histogram
 */
analyticsRouter.get('/distributions', optionalAuthenticate, (req: Request, res: Response) => {
  try {
    const userScope = req.user ? { id: req.user.id, role: req.user.role } : undefined;
    const data = AnalyticsService.getAnalytics({}, userScope);
    res.json({
      claimDistribution: data.claimDistribution,
      riskDistribution: data.riskDistribution,
      probabilityDistribution: data.probabilityDistribution,
      calculatedAt: data.calculatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'AnalyticsError', message: error?.message });
  }
});

/**
 * GET /api/analytics/features
 * Risk variable numerical and categorical feature statistics
 */
analyticsRouter.get('/features', optionalAuthenticate, (req: Request, res: Response) => {
  try {
    const data = AnalyticsService.getAnalytics();
    res.json({
      featureStatistics: data.featureStatistics,
      calculatedAt: data.calculatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'AnalyticsError', message: error?.message });
  }
});

/**
 * GET /api/analytics/quality
 * Data quality, integrity, and target leakage summary
 */
analyticsRouter.get('/quality', optionalAuthenticate, (req: Request, res: Response) => {
  try {
    const data = AnalyticsService.getAnalytics();
    res.json({
      dataQualitySummary: data.dataQualitySummary,
      dataProvenanceNote: data.dataProvenanceNote,
      calculatedAt: data.calculatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'AnalyticsError', message: error?.message });
  }
});
