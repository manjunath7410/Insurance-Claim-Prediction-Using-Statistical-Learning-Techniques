import { db } from '../db/database';
import { AuditLogEntity, UserRole } from '../db/schema';
import { logger } from '../logger';
import { SecurityService } from '../auth/security';

export interface AuditEventInput {
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  success: boolean;
  errorMessage?: string;
}

export class AuditService {
  /**
   * Records a security/governance audit event in the database with secret sanitization
   */
  static logEvent(event: AuditEventInput): AuditLogEntity {
    try {
      const sanitizedDetails = event.details ? SecurityService.sanitizeForLogging(event.details) : undefined;

      const log = db.recordAuditLog({
        userId: event.userId,
        userEmail: event.userEmail,
        userRole: event.userRole,
        action: event.action.toUpperCase(),
        resource: event.resource,
        details: sanitizedDetails,
        ipAddress: event.ipAddress,
        success: event.success,
        errorMessage: event.errorMessage,
      });

      logger.info(`[AUDIT] ${event.action} on ${event.resource} (success=${event.success})`, {
        user: event.userEmail || event.userId || 'system',
        role: event.userRole || 'NONE',
        resource: event.resource,
        success: event.success,
      });

      return log;
    } catch (err: any) {
      logger.error('Failed to write audit log:', { message: err?.message });
      // Fallback object in case of unhandled error
      return {
        id: `aud_err_${Date.now()}`,
        action: event.action,
        resource: event.resource,
        success: false,
        errorMessage: err?.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Retrieves audit logs with optional filters
   */
  static getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return db.listAuditLogs(filters || {});
  }

  /**
   * Alias for getAuditLogs returning array
   */
  static getLogs(filters?: {
    userId?: string;
    action?: string;
    resource?: string;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): AuditLogEntity[] {
    const res = db.listAuditLogs(filters || {});
    return res.logs;
  }

  /**
   * Summarizes audit actions
   */
  static getSummary() {
    const res = db.listAuditLogs({ limit: 1000 });
    const actionCounts: Record<string, number> = {};
    let successful = 0;
    let failed = 0;

    res.logs.forEach((log) => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      if (log.success) {
        successful++;
      } else {
        failed++;
      }
    });

    return {
      total: res.total,
      actionCounts,
      successful,
      failed,
    };
  }
}
