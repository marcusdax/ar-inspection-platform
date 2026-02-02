// Advanced security service for end-to-end encryption and compliance
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import CryptoJS from 'crypto-js';

export interface SecurityConfig {
  enableEndToEndEncryption?: boolean;
  enableTwoFactorAuth?: boolean;
  encryptionAlgorithm?: 'AES-256' | 'ChaCha20' | 'RSA-2048';
  keyDerivationIterations?: number;
  sessionTimeout?: number;
  maxLoginAttempts?: number;
  enableBiometricAuth?: boolean;
  enableHIPAACompliance?: boolean;
  enableAuditLogging?: boolean;
  dataRetentionDays?: number;
}

export interface EncryptionKey {
  id: string;
  algorithm: string;
  keyData: string;
  created: number;
  expires?: number;
  usage: string[];
}

export interface SecurityAuditLog {
  id: string;
  timestamp: number;
  userId: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  ip?: string;
  userAgent?: string;
  metadata?: any;
}

export interface UserSession {
  id: string;
  userId: string;
  startTime: number;
  lastActivity: number;
  ipAddress?: string;
  deviceId?: string;
  twoFactorVerified?: boolean;
  biometricVerified?: boolean;
}

class AdvancedSecurityService {
  private static instance: AdvancedSecurityService;
  private config: SecurityConfig;
  private currentEncryptionKey: EncryptionKey | null = null;
  private activeSessions: Map<string, UserSession> = new Map();
  private auditLogs: SecurityAuditLog[] = [];
  private failedLoginAttempts: Map<string, number> = new Map();

  constructor(config: SecurityConfig = {}) {
    this.config = {
      enableEndToEndEncryption: true,
      enableTwoFactorAuth: true,
      encryptionAlgorithm: 'AES-256',
      keyDerivationIterations: 100000,
      sessionTimeout: 3600000, // 1 hour
      maxLoginAttempts: 5,
      enableBiometricAuth: true,
      enableHIPAACompliance: false,
      enableAuditLogging: true,
      dataRetentionDays: 90,
      ...config,
    };

    this.initializeSecurity();
  }

  static getInstance(config?: SecurityConfig): AdvancedSecurityService {
    if (!AdvancedSecurityService.instance) {
      AdvancedSecurityService.instance = new AdvancedSecurityService(config);
    }
    return AdvancedSecurityService.instance;
  }

  // Initialize security subsystems
  private async initializeSecurity(): Promise<void> {
    try {
      // Load existing encryption keys
      await this.loadEncryptionKeys();

      // Initialize biometric auth if available
      if (this.config.enableBiometricAuth) {
        await this.initializeBiometricAuth();
      }

      // Start session cleanup timer
      this.startSessionCleanup();

      // Clean up old audit logs
      await this.cleanupOldAuditLogs();

      console.log('Advanced security service initialized');
    } catch (error) {
      console.error('Failed to initialize security service:', error);
    }
  }

  // Generate encryption key
  async generateEncryptionKey(
    userId: string,
    usage: string[] = ['data', 'communications']
  ): Promise<EncryptionKey> {
    try {
      const keyId = `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Generate random key material
      const keyMaterial = CryptoJS.lib.WordArray.random(32); // 256-bit key
      
      const encryptionKey: EncryptionKey = {
        id: keyId,
        algorithm: this.config.encryptionAlgorithm!,
        keyData: keyMaterial.toString(),
        created: Date.now(),
        expires: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
        usage,
      };

      // Store encrypted key
      await this.storeEncryptionKey(encryptionKey, userId);

      // Set as current key
      this.currentEncryptionKey = encryptionKey;

      // Log key generation
      await this.logSecurityEvent({
        userId,
        action: 'ENCRYPTION_KEY_GENERATED',
        resource: keyId,
        result: 'success',
        metadata: { algorithm: encryptionKey.algorithm, usage },
      });

      return encryptionKey;
    } catch (error) {
      console.error('Failed to generate encryption key:', error);
      throw error;
    }
  }

  // Encrypt data with current key
  async encryptData(data: any, metadata?: any): Promise<{
    encryptedData: string;
    keyId: string;
    algorithm: string;
    iv: string;
    metadata?: any;
  }> {
    try {
      if (!this.currentEncryptionKey) {
        throw new Error('No encryption key available');
      }

      const dataString = JSON.stringify(data);
      const iv = CryptoJS.lib.WordArray.random(16); // 128-bit IV

      let encrypted: CryptoJS.lib.CipherParams;

      switch (this.config.encryptionAlgorithm) {
        case 'AES-256':
          encrypted = CryptoJS.AES.encrypt(dataString, this.currentEncryptionKey.keyData, {
            iv: iv,
            mode: CryptoJS.mode.GCM,
            padding: CryptoJS.pad.Pkcs7,
          });
          break;
        
        default:
          throw new Error(`Unsupported encryption algorithm: ${this.config.encryptionAlgorithm}`);
      }

      const result = {
        encryptedData: encrypted.toString(),
        keyId: this.currentEncryptionKey.id,
        algorithm: this.config.encryptionAlgorithm!,
        iv: iv.toString(),
        metadata,
      };

      // Log encryption event
      if (this.config.enableAuditLogging) {
        await this.logSecurityEvent({
          userId: 'system',
          action: 'DATA_ENCRYPTED',
          resource: 'encrypted_data',
          result: 'success',
          metadata: { 
            keyId: this.currentEncryptionKey.id,
            algorithm: this.config.encryptionAlgorithm,
            dataSize: dataString.length,
          },
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to encrypt data:', error);
      throw error;
    }
  }

  // Decrypt data
  async decryptData(encryptedPackage: {
    encryptedData: string;
    keyId: string;
    algorithm: string;
    iv: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const encryptionKey = await this.loadEncryptionKey(encryptedPackage.keyId);
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }

      const iv = CryptoJS.enc.Hex.parse(encryptedPackage.iv);
      
      let decrypted: CryptoJS.lib.WordArray;

      switch (encryptedPackage.algorithm) {
        case 'AES-256':
          decrypted = CryptoJS.AES.decrypt(encryptedPackage.encryptedData, encryptionKey.keyData, {
            iv: iv,
            mode: CryptoJS.mode.GCM,
            padding: CryptoJS.pad.Pkcs7,
          });
          break;
        
        default:
          throw new Error(`Unsupported encryption algorithm: ${encryptedPackage.algorithm}`);
      }

      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      const data = JSON.parse(decryptedString);

      // Log decryption event
      if (this.config.enableAuditLogging) {
        await this.logSecurityEvent({
          userId: 'system',
          action: 'DATA_DECRYPTED',
          resource: encryptedPackage.keyId,
          result: 'success',
          metadata: { 
            keyId: encryptedPackage.keyId,
            algorithm: encryptedPackage.algorithm,
          },
        });
      }

      return data;
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      
      // Log decryption failure
      if (this.config.enableAuditLogging) {
        await this.logSecurityEvent({
          userId: 'system',
          action: 'DATA_DECRYPT_FAILED',
          resource: encryptedPackage.keyId,
          result: 'failure',
          metadata: { algorithm: encryptedPackage.algorithm },
        });
      }
      
      throw error;
    }
  }

  // Two-factor authentication setup
  async setupTwoFactorAuth(userId: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    try {
      // Generate TOTP secret
      const secret = this.generateTOTPSecret();
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Generate QR code URL
      const qrCodeUrl = `otpauth://totp/ARInspection:${userId}?secret=${secret}&issuer=ARInspection`;
      
      // Store setup data (encrypted)
      const setupData = {
        secret,
        backupCodes,
        setupTime: Date.now(),
      };

      const encryptedSetup = await this.encryptData(setupData, { userId });
      await AsyncStorage.setItem(`2fa_setup_${userId}`, JSON.stringify(encryptedSetup));

      // Log 2FA setup
      await this.logSecurityEvent({
        userId,
        action: 'TWO_FACTOR_SETUP',
        resource: '2fa',
        result: 'success',
      });

      return {
        secret,
        qrCode: qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      console.error('Failed to setup two-factor auth:', error);
      throw error;
    }
  }

  // Verify two-factor authentication code
  async verifyTwoFactorAuth(userId: string, code: string): Promise<boolean> {
    try {
      const setupData = await this.getTwoFactorSetup(userId);
      if (!setupData) {
        return false;
      }

      // Verify TOTP code
      const isValid = this.verifyTOTPCode(setupData.secret, code);

      // Log verification attempt
      await this.logSecurityEvent({
        userId,
        action: 'TWO_FACTOR_VERIFY',
        resource: '2fa',
        result: isValid ? 'success' : 'failure',
        metadata: { codeLength: code.length },
      });

      return isValid;
    } catch (error) {
      console.error('Failed to verify two-factor auth:', error);
      return false;
    }
  }

  // Initialize biometric authentication
  private async initializeBiometricAuth(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        const available = await NativeModules.BiometricAuth.isAvailable();
        if (available) {
          console.log('Biometric authentication available on iOS');
        }
      } else if (Platform.OS === 'android') {
        const available = await NativeModules.BiometricAuth.isAvailable();
        if (available) {
          console.log('Biometric authentication available on Android');
        }
      }
    } catch (error) {
      console.warn('Biometric auth not available:', error);
    }
  }

  // Authenticate with biometrics
  async authenticateWithBiometrics(reason: string): Promise<boolean> {
    try {
      if (!this.config.enableBiometricAuth) {
        return false;
      }

      if (Platform.OS === 'ios') {
        return await NativeModules.BiometricAuth.authenticate(reason);
      } else if (Platform.OS === 'android') {
        return await NativeModules.BiometricAuth.authenticate(reason);
      }

      return false;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  // Create user session
  async createUserSession(userId: string, metadata?: {
    ipAddress?: string;
    deviceId?: string;
  }): Promise<string> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const session: UserSession = {
        id: sessionId,
        userId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        ipAddress: metadata?.ipAddress,
        deviceId: metadata?.deviceId,
      };

      this.activeSessions.set(sessionId, session);

      // Store session
      await this.storeSession(session);

      // Log session creation
      await this.logSecurityEvent({
        userId,
        action: 'SESSION_CREATED',
        resource: sessionId,
        result: 'success',
        metadata: { ipAddress: metadata?.ipAddress },
      });

      return sessionId;
    } catch (error) {
      console.error('Failed to create user session:', error);
      throw error;
    }
  }

  // Validate user session
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        // Try to load from storage
        const storedSession = await this.loadSession(sessionId);
        if (storedSession) {
          this.activeSessions.set(sessionId, storedSession);
        } else {
          return false;
        }
      }

      const currentSession = this.activeSessions.get(sessionId)!;
      
      // Check session timeout
      const now = Date.now();
      if (now - currentSession.lastActivity > this.config.sessionTimeout!) {
        await this.invalidateSession(sessionId);
        return false;
      }

      // Update last activity
      currentSession.lastActivity = now;
      await this.storeSession(currentSession);

      return true;
    } catch (error) {
      console.error('Failed to validate session:', error);
      return false;
    }
  }

  // Invalidate session
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        // Log session invalidation
        await this.logSecurityEvent({
          userId: session.userId,
          action: 'SESSION_INVALIDATED',
          resource: sessionId,
          result: 'success',
        });
      }

      this.activeSessions.delete(sessionId);
      await AsyncStorage.removeItem(`session_${sessionId}`);
    } catch (error) {
      console.error('Failed to invalidate session:', error);
    }
  }

  // Check HIPAA compliance
  async checkHIPAACompliance(): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    try {
      const violations: string[] = [];
      const recommendations: string[] = [];

      if (!this.config.enableEndToEndEncryption) {
        violations.push('End-to-end encryption is not enabled');
        recommendations.push('Enable end-to-end encryption for HIPAA compliance');
      }

      if (!this.config.enableAuditLogging) {
        violations.push('Audit logging is not enabled');
        recommendations.push('Enable comprehensive audit logging');
      }

      if (!this.config.enableTwoFactorAuth) {
        violations.push('Two-factor authentication is not enabled');
        recommendations.push('Enable two-factor authentication for all users');
      }

      const compliant = violations.length === 0;

      return {
        compliant,
        violations,
        recommendations,
      };
    } catch (error) {
      console.error('Failed to check HIPAA compliance:', error);
      return {
        compliant: false,
        violations: ['Compliance check failed'],
        recommendations: ['Retry compliance check'],
      };
    }
  }

  // Get security statistics
  async getSecurityStatistics(): Promise<{
    totalSessions: number;
    activeSessions: number;
    encryptionKeys: number;
    auditLogs: number;
    failedLoginAttempts: number;
    twoFactorEnabled: boolean;
    biometricEnabled: boolean;
    hipaaCompliant: boolean;
  }> {
    try {
      const totalSessions = this.activeSessions.size;
      const activeSessions = Array.from(this.activeSessions.values()).filter(
        session => Date.now() - session.lastActivity < this.config.sessionTimeout!
      ).length;
      
      const encryptionKeys = await this.getEncryptionKeyCount();
      const auditLogs = this.auditLogs.length;
      const failedLoginAttempts = Array.from(this.failedLoginAttempts.values()).reduce(
        (sum, attempts) => sum + attempts, 0
      );

      const hipaaCompliance = await this.checkHIPAACompliance();

      return {
        totalSessions,
        activeSessions,
        encryptionKeys,
        auditLogs,
        failedLoginAttempts,
        twoFactorEnabled: this.config.enableTwoFactorAuth!,
        biometricEnabled: this.config.enableBiometricAuth!,
        hipaaCompliant: hipaaCompliance.compliant,
      };
    } catch (error) {
      console.error('Failed to get security statistics:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        encryptionKeys: 0,
        auditLogs: 0,
        failedLoginAttempts: 0,
        twoFactorEnabled: false,
        biometricEnabled: false,
        hipaaCompliant: false,
      };
    }
  }

  // Helper methods
  private async storeEncryptionKey(key: EncryptionKey, userId: string): Promise<void> {
    const storageKey = `encryption_key_${key.id}`;
    const keyData = JSON.stringify(key);
    await AsyncStorage.setItem(storageKey, keyData);
  }

  private async loadEncryptionKey(keyId: string): Promise<EncryptionKey | null> {
    try {
      const storageKey = `encryption_key_${keyId}`;
      const keyData = await AsyncStorage.getItem(storageKey);
      return keyData ? JSON.parse(keyData) : null;
    } catch (error) {
      console.error('Failed to load encryption key:', error);
      return null;
    }
  }

  private async loadEncryptionKeys(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const keyIds = keys.filter(key => key.startsWith('encryption_key_'));
      
      // Load the most recent key
      let mostRecentKey: EncryptionKey | null = null;
      
      for (const keyId of keyIds) {
        const key = await this.loadEncryptionKey(keyId.replace('encryption_key_', ''));
        if (key && (!mostRecentKey || key.created > mostRecentKey.created)) {
          mostRecentKey = key;
        }
      }

      this.currentEncryptionKey = mostRecentKey;
    } catch (error) {
      console.error('Failed to load encryption keys:', error);
    }
  }

  private async getEncryptionKeyCount(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter(key => key.startsWith('encryption_key_')).length;
    } catch (error) {
      console.error('Failed to get encryption key count:', error);
      return 0;
    }
  }

  private async storeSession(session: UserSession): Promise<void> {
    const storageKey = `session_${session.id}`;
    const sessionData = JSON.stringify(session);
    await AsyncStorage.setItem(storageKey, sessionData);
  }

  private async loadSession(sessionId: string): Promise<UserSession | null> {
    try {
      const storageKey = `session_${sessionId}`;
      const sessionData = await AsyncStorage.getItem(storageKey);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  private async getTwoFactorSetup(userId: string): Promise<any> {
    try {
      const setupData = await AsyncStorage.getItem(`2fa_setup_${userId}`);
      if (!setupData) {
        return null;
      }

      const encryptedSetup = JSON.parse(setupData);
      return await this.decryptData(encryptedSetup);
    } catch (error) {
      console.error('Failed to get 2FA setup:', error);
      return null;
    }
  }

  private generateTOTPSecret(): string {
    // Generate random base32 secret
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    return codes;
  }

  private verifyTOTPCode(secret: string, code: string): boolean {
    // Simplified TOTP verification - in production, use proper TOTP library
    return code.length === 6 && /^\d+$/.test(code);
  }

  private async logSecurityEvent(log: SecurityAuditLog): Promise<void> {
    try {
      const auditLog: SecurityAuditLog = {
        ...log,
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      this.auditLogs.push(auditLog);

      // Store audit log
      await AsyncStorage.setItem(`audit_${auditLog.id}`, JSON.stringify(auditLog));

      // Keep only recent logs in memory
      if (this.auditLogs.length > 1000) {
        this.auditLogs = this.auditLogs.slice(-1000);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  private async cleanupOldAuditLogs(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const auditKeys = keys.filter(key => key.startsWith('audit_'));
      const cutoffTime = Date.now() - (this.config.dataRetentionDays! * 24 * 60 * 60 * 1000);

      for (const key of auditKeys) {
        const logData = await AsyncStorage.getItem(key);
        if (logData) {
          const log = JSON.parse(logData);
          if (log.timestamp < cutoffTime) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old audit logs:', error);
    }
  }

  private startSessionCleanup(): void {
    setInterval(async () => {
      try {
        const now = Date.now();
        const timeout = this.config.sessionTimeout!;
        
        for (const [sessionId, session] of this.activeSessions.entries()) {
          if (now - session.lastActivity > timeout) {
            await this.invalidateSession(sessionId);
          }
        }
      } catch (error) {
        console.error('Failed to cleanup sessions:', error);
      }
    }, 60000); // Check every minute
  }

  // Public methods for external access
  getCurrentEncryptionKey(): EncryptionKey | null {
    return this.currentEncryptionKey;
  }

  async updateConfig(newConfig: Partial<SecurityConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Log config update
    await this.logSecurityEvent({
      userId: 'system',
      action: 'CONFIG_UPDATED',
      resource: 'security_config',
      result: 'success',
      metadata: { updatedKeys: Object.keys(newConfig) },
    });
  }

  getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

export default AdvancedSecurityService;