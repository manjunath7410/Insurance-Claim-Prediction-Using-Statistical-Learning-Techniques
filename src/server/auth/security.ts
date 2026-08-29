import crypto from 'crypto';
import { UserRole, SafeUser, UserEntity } from '../db/schema';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'actuarial-platform-hmac-sha512-secure-key-2026';
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours

export class SecurityService {
  /**
   * Hashes a plaintext password with a unique cryptographic random salt using PBKDF2
   */
  static hashPassword(password: string, providedSalt?: string): { hash: string; salt: string } {
    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new Error('Password must be at least 6 characters in length.');
    }
    const salt = providedSalt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  /**
   * Constant-time timing-safe password verification
   */
  static verifyPassword(password: string, storedHash: string, salt: string): boolean {
    if (!password || !storedHash || !salt) return false;
    try {
      const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      const hashBuffer = Buffer.from(computedHash, 'hex');
      const storedBuffer = Buffer.from(storedHash, 'hex');

      if (hashBuffer.length !== storedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(hashBuffer, storedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Generates a cryptographically signed HMAC-SHA256 bearer token
   */
  static generateToken(
    user: { id: string; email: string; name: string; role: UserRole },
    expiresInSeconds: number = TOKEN_EXPIRY_SECONDS
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Validates token signature and expiration, returning the payload if valid
   */
  static verifyToken(token: string): TokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;

    try {
      // 1. Verify HMAC signature in constant time
      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);

      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return null;
      }

      // 2. Parse payload and verify expiry
      const payloadString = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const payload: TokenPayload = JSON.parse(payloadString);

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null; // Expired
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Hashes sensitive identifiers like Driver License / SSN with SHA-256 for lookup without storing plaintext
   */
  static hashSensitiveIdentifier(id: string): string {
    return crypto.createHash('sha256').update(id.trim().toUpperCase()).digest('hex');
  }

  /**
   * Strips password hash, salt, and sensitive tokens from user entities
   */
  static sanitizeUser(user: UserEntity): SafeUser {
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Sanitizes generic objects to ensure passwords, tokens, or private secrets are never logged
   */
  static sanitizeForLogging(data: any): any {
    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map((item) => SecurityService.sanitizeForLogging(item));
    }

    const sensitiveKeys = ['password', 'passwordHash', 'salt', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = SecurityService.sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
