'use client';

import { DataEncryption } from './encryption';
import { safeRandomUUID } from './uuid';

// Log seviyeleri
const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SECURITY: 'SECURITY'
} as const;

type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

interface LogMetadata {
  [key: string]: unknown;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata: LogMetadata;
}

// Güvenli loglama sistemi
class SecureLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  addLog(level: LogLevel, message: string, metadata: LogMetadata = {}): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = {
      id: safeRandomUUID(),
      timestamp,
      level,
      message: this.sanitizeLogMessage(message),
      metadata: this.sanitizeMetadata(metadata)
    };

    this.logs.push(logEntry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    if (level === LOG_LEVELS.SECURITY || level === LOG_LEVELS.ERROR) {
      this.persistSecurityLog(logEntry);
    }

    return logEntry.id;
  }

  sanitizeLogMessage(message: string): string {
    if (typeof message === 'string') {
      return message
        .replace(/password=.*?(&|$)/g, 'password=[MASKED]$1')
        .replace(/token=.*?(&|$)/g, 'token=[MASKED]$1')
        .replace(/(\d{4})\d{8,12}(\d{4})/, '$1********$2');
    }
    return message;
  }

  sanitizeMetadata(metadata: LogMetadata): LogMetadata {
    const sanitized = { ...metadata };
    const sensitiveFields = ['password', 'token', 'creditCard', 'ssn'];

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '[MASKED]';
      }
    });

    return sanitized;
  }

  persistSecurityLog(logEntry: LogEntry): void {
    try {
      const encryptedLog = DataEncryption.encrypt(logEntry);
      const key = `security_log_${logEntry.id}`;
      localStorage.setItem(key, encryptedLog);
    } catch (error) {
      console.error('Güvenlik logu kaydedilemedi:', error);
    }
  }

  getLogs(level: LogLevel | null = null, startDate: string | null = null, endDate: string | null = null): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    if (startDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(endDate));
    }

    return filteredLogs;
  }

  async getSecurityLogs(): Promise<LogEntry[]> {
    const securityLogs: LogEntry[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('security_log_')) {
        try {
          const encryptedLog = localStorage.getItem(key);
          if (encryptedLog) {
            const log = await DataEncryption.decrypt(encryptedLog);
            securityLogs.push(log);
          }
        } catch (error) {
          console.error(`Log çözülemedi (${key}):`, error);
        }
      }
    }
    return securityLogs;
  }

  cleanup(daysToKeep = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.logs = this.logs.filter(log => new Date(log.timestamp) >= cutoffDate);

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('security_log_')) {
        try {
          const encryptedLog = localStorage.getItem(key);
          if (encryptedLog) {
            const log = DataEncryption.decrypt(encryptedLog);
            if (new Date(log.timestamp) < cutoffDate) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          console.error(`Log temizlenemedi (${key}):`, error);
        }
      }
    }
  }
}

interface ErrorResult {
  error: boolean;
  message: string;
  code: string;
}

interface ApiError extends Error {
  response?: { status: number };
  code?: string;
}

// Global hata yakalayıcı
export class ErrorHandler {
  private logger: SecureLogger;

  constructor() {
    this.logger = new SecureLogger();
  }

  handleError(error: ApiError, context: LogMetadata = {}): ErrorResult {
    const errorDetails: LogMetadata = {
      message: error.message,
      stack: error.stack,
      type: error.name,
      code: error.code,
      context
    };

    if (this.isSecurityError(error)) {
      this.logger.addLog(LOG_LEVELS.SECURITY, 'Güvenlik ihlali tespit edildi', errorDetails);
      return { error: true, message: 'Güvenlik hatası', code: 'SECURITY_ERROR' };
    }

    if (this.isApiError(error)) {
      this.logger.addLog(LOG_LEVELS.ERROR, 'API hatası', errorDetails);
      return { error: true, message: 'Servis şu anda kullanılamıyor', code: 'API_ERROR' };
    }

    if (this.isValidationError(error)) {
      this.logger.addLog(LOG_LEVELS.WARN, 'Validasyon hatası', errorDetails);
      return { error: true, message: error.message, code: 'VALIDATION_ERROR' };
    }

    this.logger.addLog(LOG_LEVELS.ERROR, 'Beklenmeyen hata', errorDetails);
    return { error: true, message: 'Beklenmeyen bir hata oluştu', code: 'UNKNOWN_ERROR' };
  }

  isSecurityError(error: ApiError): boolean {
    return error.name === 'SecurityError' ||
           error.code === 'SECURITY_ERROR' ||
           error.message.toLowerCase().includes('security') ||
           error.message.toLowerCase().includes('permission');
  }

  isApiError(error: ApiError): boolean {
    return error.name === 'ApiError' ||
           error.code === 'API_ERROR' ||
           (error.response?.status ?? 0) >= 500;
  }

  isValidationError(error: ApiError): boolean {
    return error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR';
  }

  getErrorLogs(startDate: string | null = null, endDate: string | null = null): LogEntry[] {
    return this.logger.getLogs(LOG_LEVELS.ERROR, startDate, endDate);
  }

  getSecurityLogs(startDate: string | null = null, endDate: string | null = null): LogEntry[] {
    return this.logger.getLogs(LOG_LEVELS.SECURITY, startDate, endDate);
  }
}

export const globalErrorHandler = new ErrorHandler();
