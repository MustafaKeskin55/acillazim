'use client';

import { DataEncryption } from './encryption';
import { safeRandomUUID } from './uuid';

// Audit log seviyeleri
export const AUDIT_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  SECURITY: 'SECURITY',
  CRITICAL: 'CRITICAL'
} as const;

export type AuditLevel = typeof AUDIT_LEVELS[keyof typeof AUDIT_LEVELS];

// Audit olayları
export const AUDIT_EVENTS = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  FAILED_LOGIN: 'FAILED_LOGIN',
  DATA_ACCESS: 'DATA_ACCESS',
  DATA_MODIFICATION: 'DATA_MODIFICATION',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
  SECURITY_ALERT: 'SECURITY_ALERT'
} as const;

export type AuditEvent = typeof AUDIT_EVENTS[keyof typeof AUDIT_EVENTS];

interface LogDetails {
  [key: string]: unknown;
  dataType?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: AuditLevel;
  event: AuditEvent;
  details: LogDetails;
  userId: string | null;
  ipAddress: string;
  userAgent: string;
}

export class AuditLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private persistenceKey = 'secure_audit_logs';

  // Audit log oluştur
  log(level: AuditLevel, event: AuditEvent, details: LogDetails = {}, userId: string | null = null): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      id: safeRandomUUID(),
      timestamp,
      level,
      event,
      details: this.sanitizeLogDetails(details),
      userId,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    // Kritik logları şifrele ve sakla
    if (level === AUDIT_LEVELS.SECURITY || level === AUDIT_LEVELS.CRITICAL) {
      this.persistSecureLog(logEntry);
    }

    this.logs.push(logEntry);
    this.trimLogs();

    // Kritik olayları gerçek zamanlı izle
    if (this.isAnomalyDetected(logEntry)) {
      this.handleAnomaly(logEntry);
    }

    return logEntry.id;
  }

  // Log detaylarını temizle
  sanitizeLogDetails(details: LogDetails): LogDetails {
    const sanitized = { ...details };
    const sensitiveFields = [
      'password', 'token', 'creditCard', 'ssn', 'apiKey',
      'secretKey', 'accessToken', 'refreshToken'
    ];

    const sanitizeObject = (obj: Record<string, unknown>): Record<string, unknown> => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          obj[key] = sanitizeObject(obj[key] as Record<string, unknown>);
        } else if (sensitiveFields.some(field =>
          key.toLowerCase().includes(field.toLowerCase()))) {
          obj[key] = '[MASKED]';
        }
      }
      return obj;
    };

    return sanitizeObject(sanitized) as LogDetails;
  }

  // Güvenli log kaydetme
  persistSecureLog(logEntry: LogEntry): void {
    try {
      const existingLogs = this.getSecureLogs();
      existingLogs.push(logEntry);
      const encryptedLogs = DataEncryption.encrypt(existingLogs);
      localStorage.setItem(this.persistenceKey, encryptedLogs);
    } catch (error) {
      console.error('Güvenli log kaydedilemedi:', error);
    }
  }

  // Güvenli logları getir
  getSecureLogs(): LogEntry[] {
    try {
      const encryptedLogs = localStorage.getItem(this.persistenceKey);
      if (!encryptedLogs) return [];
      return DataEncryption.decrypt(encryptedLogs) || [];
    } catch (error) {
      console.error('Güvenli loglar alınamadı:', error);
      return [];
    }
  }

  // Anomali tespiti
  isAnomalyDetected(logEntry: LogEntry): boolean {
    if (logEntry.event === AUDIT_EVENTS.FAILED_LOGIN) {
      const recentFailedLogins = this.logs.filter(log =>
        log.event === AUDIT_EVENTS.FAILED_LOGIN &&
        log.userId === logEntry.userId &&
        new Date(log.timestamp) > new Date(Date.now() - 5 * 60 * 1000)
      );
      if (recentFailedLogins.length >= 5) return true;
    }

    if (logEntry.event === AUDIT_EVENTS.DATA_ACCESS &&
        logEntry.details.dataType === 'sensitive') {
      const recentSensitiveAccess = this.logs.filter(log =>
        log.event === AUDIT_EVENTS.DATA_ACCESS &&
        log.userId === logEntry.userId &&
        log.details.dataType === 'sensitive' &&
        new Date(log.timestamp) > new Date(Date.now() - 60 * 60 * 1000)
      );
      if (recentSensitiveAccess.length >= 10) return true;
    }

    return false;
  }

  // Anomali yönetimi
  handleAnomaly(logEntry: LogEntry): void {
    this.log(AUDIT_LEVELS.CRITICAL, AUDIT_EVENTS.SECURITY_ALERT, {
      reason: 'Anomali tespit edildi',
      originalLog: logEntry as unknown as LogDetails['originalLog']
    } as LogDetails);

    if (logEntry.event === AUDIT_EVENTS.FAILED_LOGIN) {
      this.temporaryBlockUser(logEntry.userId);
    }

    this.notifySecurityTeam(logEntry);
  }

  // Geçici kullanıcı engelleme
  temporaryBlockUser(userId: string | null): void {
    const blockedUsers: Record<string, number> = JSON.parse(localStorage.getItem('blockedUsers') || '{}');
    if (userId) {
      blockedUsers[userId] = Date.now() + (30 * 60 * 1000);
    }
    localStorage.setItem('blockedUsers', JSON.stringify(blockedUsers));
  }

  // Güvenlik ekibini uyar
  notifySecurityTeam(logEntry: LogEntry): void {
    console.error('Güvenlik Uyarısı:', {
      timestamp: logEntry.timestamp,
      event: logEntry.event,
      level: logEntry.level,
      userId: logEntry.userId
    });
  }

  // Log sayısını kontrol et
  trimLogs(): void {
    if (this.logs.length > this.maxLogs) {
      const excessLogs = this.logs.splice(0, this.logs.length - this.maxLogs);
      const criticalLogs = excessLogs.filter(log =>
        log.level === AUDIT_LEVELS.CRITICAL ||
        log.level === AUDIT_LEVELS.SECURITY
      );
      if (criticalLogs.length > 0) {
        this.archiveLogs(criticalLogs);
      }
    }
  }

  // Logları arşivle
  archiveLogs(logs: LogEntry[]): void {
    const archiveKey = `audit_archive_${new Date().toISOString()}`;
    const encryptedArchive = DataEncryption.encrypt(logs);
    localStorage.setItem(archiveKey, encryptedArchive);
  }

  // Client IP adresi
  getClientIP(): string {
    return '127.0.0.1';
  }
}
