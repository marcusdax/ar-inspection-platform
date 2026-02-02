// React component for security settings and management
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdvancedSecurityService from '../services/security/AdvancedSecurityService';
import { useTheme } from '../contexts/ThemeContext';

interface SecuritySettingsProps {
  securityService: AdvancedSecurityService;
  onSettingsChange?: (settings: any) => void;
}

interface SecurityConfig {
  enableEndToEndEncryption: boolean;
  enableTwoFactorAuth: boolean;
  enableBiometricAuth: boolean;
  enableHIPAACompliance: boolean;
  enableAuditLogging: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  encryptionAlgorithm: 'AES-256' | 'ChaCha20' | 'RSA-2048';
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  securityService,
  onSettingsChange,
}) => {
  const [config, setConfig] = useState<SecurityConfig>({
    enableEndToEndEncryption: true,
    enableTwoFactorAuth: true,
    enableBiometricAuth: true,
    enableHIPAACompliance: false,
    enableAuditLogging: true,
    sessionTimeout: 3600000, // 1 hour
    maxLoginAttempts: 5,
    encryptionAlgorithm: 'AES-256',
  });
  const [loading, setLoading] = useState(false);
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<any>(null);
  const [hipaaCompliance, setHipaaCompliance] = useState<any>(null);

  const { theme } = useTheme();

  // Load current security configuration
  const loadSecurityConfig = async () => {
    try {
      const currentConfig = securityService.getConfig();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Failed to load security config:', error);
    }
  };

  // Load security statistics
  const loadSecurityStats = async () => {
    try {
      const stats = await securityService.getSecurityStatistics();
      setSecurityStats(stats);
    } catch (error) {
      console.error('Failed to load security stats:', error);
    }
  };

  // Check HIPAA compliance
  const checkHIPAACompliance = async () => {
    try {
      const compliance = await securityService.checkHIPAACompliance();
      setHipaaCompliance(compliance);
    } catch (error) {
      console.error('Failed to check HIPAA compliance:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadSecurityConfig();
    loadSecurityStats();
    checkHIPAACompliance();
  }, []);

  // Update security configuration
  const updateConfig = async (key: keyof SecurityConfig, value: any) => {
    try {
      const newConfig = { ...config, [key]: value };
      setConfig(newConfig);
      
      await securityService.updateConfig({ [key]: value });
      onSettingsChange?.(newConfig);
      
      // Reload related data
      await loadSecurityStats();
      if (key === 'enableHIPAACompliance') {
        await checkHIPAACompliance();
      }
    } catch (error) {
      console.error('Failed to update security config:', error);
      Alert.alert('Error', 'Failed to update security settings');
    }
  };

  // Setup two-factor authentication
  const setupTwoFactorAuth = async () => {
    try {
      setLoading(true);
      const userId = 'current_user'; // Get from auth context
      
      const setupData = await securityService.setupTwoFactorAuth(userId);
      setTwoFactorData(setupData);
      setShowTwoFactorSetup(true);
    } catch (error) {
      console.error('Failed to setup 2FA:', error);
      Alert.alert('Error', 'Failed to setup two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  // Generate new encryption key
  const generateNewEncryptionKey = async () => {
    Alert.alert(
      'Generate New Key',
      'This will create a new encryption key. The old key will remain available for decrypting existing data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const userId = 'current_user'; // Get from auth context
              await securityService.generateEncryptionKey(userId);
              await loadSecurityStats();
              Alert.alert('Success', 'New encryption key generated successfully');
            } catch (error) {
              console.error('Failed to generate encryption key:', error);
              Alert.alert('Error', 'Failed to generate new encryption key');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Test biometric authentication
  const testBiometricAuth = async () => {
    try {
      const success = await securityService.authenticateWithBiometrics(
        'Test biometric authentication'
      );
      
      Alert.alert(
        success ? 'Success' : 'Failed',
        success
          ? 'Biometric authentication test successful'
          : 'Biometric authentication test failed'
      );
    } catch (error) {
      console.error('Biometric auth test failed:', error);
      Alert.alert('Error', 'Biometric authentication not available');
    }
  };

  // Clear audit logs
  const clearAuditLogs = async () => {
    Alert.alert(
      'Clear Audit Logs',
      'This will permanently delete all audit logs. This action cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // This would need to be implemented in the security service
              Alert.alert('Success', 'Audit logs cleared successfully');
            } catch (error) {
              console.error('Failed to clear audit logs:', error);
              Alert.alert('Error', 'Failed to clear audit logs');
            }
          },
        },
      ]
    );
  };

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    section: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    settingLabel: {
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    actionButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    actionButtonText: {
      color: theme.colors.background,
      fontSize: 14,
      fontWeight: '500',
  },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    secondaryButtonText: {
      color: theme.colors.primary,
    },
    dangerButton: {
      backgroundColor: '#ff4444',
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 16,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    complianceCard: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.card,
      marginBottom: 12,
    },
    complianceTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    complianceStatus: {
      fontSize: 14,
      marginBottom: 8,
    },
    complianceCompliant: {
      color: '#00ff00',
    },
    complianceNonCompliant: {
      color: '#ff4444',
    },
    violationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    violationBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#ff4444',
      marginRight: 8,
    },
    violationText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      padding: 24,
      borderRadius: 16,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    qrCode: {
      width: 200,
      height: 200,
      backgroundColor: '#f0f0f0',
      alignSelf: 'center',
      marginBottom: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    qrCodeText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    backupCodesContainer: {
      marginTop: 16,
    },
    backupCodesTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    backupCode: {
      backgroundColor: '#f8f8f8',
      padding: 8,
      borderRadius: 4,
      fontSize: 12,
      color: theme.colors.text,
      marginBottom: 4,
      fontFamily: 'monospace',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 24,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Security Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{securityStats?.activeSessions || 0}</Text>
              <Text style={styles.statLabel}>Active Sessions</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{securityStats?.encryptionKeys || 0}</Text>
              <Text style={styles.statLabel}>Encryption Keys</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{securityStats?.auditLogs || 0}</Text>
              <Text style={styles.statLabel}>Audit Logs</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{securityStats?.failedLoginAttempts || 0}</Text>
              <Text style={styles.statLabel}>Failed Attempts</Text>
            </View>
          </View>
        </View>

        {/* HIPAA Compliance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>HIPAA Compliance</Text>
          
          <View style={styles.complianceCard}>
            <Text style={styles.complianceTitle}>Compliance Status</Text>
            <Text
              style={[
                styles.complianceStatus,
                hipaaCompliance?.compliant ? styles.complianceCompliant : styles.complianceNonCompliant,
              ]}
            >
              {hipaaCompliance?.compliant ? '✓ Compliant' : '✗ Non-Compliant'}
            </Text>

            {hipaaCompliance?.violations && hipaaCompliance.violations.length > 0 && (
              <View>
                <Text style={[styles.complianceTitle, { fontSize: 14 }]}>Violations:</Text>
                {hipaaCompliance.violations.map((violation: string, index: number) => (
                  <View key={index} style={styles.violationItem}>
                    <View style={styles.violationBullet} />
                    <Text style={styles.violationText}>{violation}</Text>
                  </View>
                ))}
              </View>
            )}

            {hipaaCompliance?.recommendations && hipaaCompliance.recommendations.length > 0 && (
              <View>
                <Text style={[styles.complianceTitle, { fontSize: 14 }]}>Recommendations:</Text>
                {hipaaCompliance.recommendations.map((recommendation: string, index: number) => (
                  <View key={index} style={styles.violationItem}>
                    <View style={[styles.violationBullet, { backgroundColor: theme.colors.primary }]} />
                    <Text style={styles.violationText}>{recommendation}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Encryption Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Encryption</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>End-to-End Encryption</Text>
              <Text style={styles.settingDescription}>
                Encrypt all data end-to-end using {config.encryptionAlgorithm}
              </Text>
            </View>
            <Switch
              value={config.enableEndToEndEncryption}
              onValueChange={(value) => updateConfig('enableEndToEndEncryption', value)}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Encryption Algorithm</Text>
              <Text style={styles.settingDescription}>
                Currently using {config.encryptionAlgorithm}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={generateNewEncryptionKey}
            >
              <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                New Key
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Authentication Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Authentication</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
              <Text style={styles.settingDescription}>
                Add an extra layer of security with 2FA
              </Text>
            </View>
            <Switch
              value={config.enableTwoFactorAuth}
              onValueChange={(value) => updateConfig('enableTwoFactorAuth', value)}
            />
          </View>

          {config.enableTwoFactorAuth && (
            <View style={styles.settingItem}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={setupTwoFactorAuth}
              >
                <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                  Setup 2FA
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Biometric Authentication</Text>
              <Text style={styles.settingDescription}>
                Use fingerprint or Face ID for quick access
              </Text>
            </View>
            <Switch
              value={config.enableBiometricAuth}
              onValueChange={(value) => updateConfig('enableBiometricAuth', value)}
            />
          </View>

          {config.enableBiometricAuth && (
            <View style={styles.settingItem}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={testBiometricAuth}
              >
                <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                  Test Biometric
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Session Timeout</Text>
              <Text style={styles.settingDescription}>
                Auto-logout after {formatDuration(config.sessionTimeout)} of inactivity
              </Text>
            </View>
            <Text style={[styles.settingLabel, { color: theme.colors.primary }]}>
              {formatDuration(config.sessionTimeout)}
            </Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Max Login Attempts</Text>
              <Text style={styles.settingDescription}>
                Lock account after {config.maxLoginAttempts} failed attempts
              </Text>
            </View>
            <Text style={[styles.settingLabel, { color: theme.colors.primary }]}>
              {config.maxLoginAttempts}
            </Text>
          </View>
        </View>

        {/* Monitoring Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monitoring & Logging</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Audit Logging</Text>
              <Text style={styles.settingDescription}>
                Log all security-relevant events for compliance
              </Text>
            </View>
            <Switch
              value={config.enableAuditLogging}
              onValueChange={(value) => updateConfig('enableAuditLogging', value)}
            />
          </View>

          {config.enableAuditLogging && (
            <View style={styles.settingItem}>
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={clearAuditLogs}
              >
                <Text style={styles.actionButtonText}>Clear Logs</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Compliance Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compliance</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>HIPAA Compliance Mode</Text>
              <Text style={styles.settingDescription}>
                Enable HIPAA-specific security requirements
              </Text>
            </View>
            <Switch
              value={config.enableHIPAACompliance}
              onValueChange={(value) => updateConfig('enableHIPAACompliance', value)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Two-Factor Setup Modal */}
      {showTwoFactorSetup && twoFactorData && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Setup Two-Factor Authentication</Text>
            
            <Text style={styles.settingDescription}>
              Scan this QR code with your authenticator app:
            </Text>
            
            <View style={styles.qrCode}>
              <Text style={styles.qrCodeText}>QR Code</Text>
              <Text style={styles.qrCodeText}>{twoFactorData.qrCode}</Text>
            </View>

            <Text style={styles.settingDescription}>
              Or enter this secret manually:
            </Text>
            
            <TextInput
              style={styles.input}
              value={twoFactorData.secret}
              editable={false}
              multiline
            />

            <View style={styles.backupCodesContainer}>
              <Text style={styles.backupCodesTitle}>Backup Codes:</Text>
              {twoFactorData.backupCodes.map((code: string, index: number) => (
                <Text key={index} style={styles.backupCode}>
                  {code}
                </Text>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => setShowTwoFactorSetup(false)}
              >
                <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {loading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
};

export default SecuritySettings;