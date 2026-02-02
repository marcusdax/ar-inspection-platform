// React component for deployment management and environment switching
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import ProductionDeploymentService, { DeploymentConfig, BuildInfo } from '../../services/deployment/ProductionDeploymentService';
import { useTheme } from '../../contexts/ThemeContext';

interface DeploymentManagerProps {
  deploymentService: ProductionDeploymentService;
  onDeploymentChanged?: (config: DeploymentConfig) => void;
}

const DeploymentManager: React.FC<DeploymentManagerProps> = ({
  deploymentService,
  onDeploymentChanged,
}) => {
  const [config, setConfig] = useState<DeploymentConfig | null>(null);
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [deploymentStatus, setDeploymentStatus] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<Map<string, any>>(new Map());
  const [deploymentHistory, setDeploymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFeatureFlagEditor, setShowFeatureFlagEditor] = useState(false);
  const [selectedFeatureFlag, setSelectedFeatureFlag] = useState<string | null>(null);

  const { theme } = useTheme();

  // Load deployment data
  const loadDeploymentData = async () => {
    try {
      setLoading(true);
      
      const currentConfig = deploymentService.getConfig();
      const currentBuildInfo = deploymentService.getBuildInfo();
      const currentStatus = deploymentService.getDeploymentStatus();
      const currentFlags = deploymentService.getFeatureFlags();
      const history = deploymentService.getDeploymentHistory();

      setConfig(currentConfig);
      setBuildInfo(currentBuildInfo);
      setDeploymentStatus(currentStatus);
      setFeatureFlags(currentFlags);
      setDeploymentHistory(history);
    } catch (error) {
      console.error('Failed to load deployment data:', error);
      Alert.alert('Error', 'Failed to load deployment data');
    } finally {
      setLoading(false);
    }
  };

  // Switch environment
  const switchEnvironment = async (environment: 'development' | 'staging' | 'production') => {
    Alert.alert(
      `Switch to ${environment}?`,
      'This will restart the app with the new environment configuration. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: async () => {
            try {
              setLoading(true);
              await deploymentService.switchEnvironment(environment);
              await loadDeploymentData();
              onDeploymentChanged?.(deploymentService.getConfig());
              Alert.alert('Success', `Switched to ${environment} environment`);
            } catch (error) {
              console.error('Failed to switch environment:', error);
              Alert.alert('Error', 'Failed to switch environment');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Deploy new version
  const deployNewVersion = () => {
    Alert.alert(
      'Deploy New Version',
      'This will deploy the current build as a new version. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deploy',
          onPress: async () => {
            try {
              setLoading(true);
              const status = await deploymentService.deployNewVersion({
                version: '1.0.1',
                buildNumber: '101',
              });
              await loadDeploymentData();
              Alert.alert(
                status.status === 'success' ? 'Success' : 'Failed',
                status.message || 'Deployment completed'
              );
            } catch (error) {
              console.error('Failed to deploy:', error);
              Alert.alert('Error', 'Failed to deploy new version');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Rollback deployment
  const rollbackDeployment = () => {
    Alert.alert(
      'Rollback Deployment',
      'This will rollback to the previous stable version. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rollback',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const status = await deploymentService.rollback();
              await loadDeploymentData();
              Alert.alert(
                status.status === 'success' ? 'Success' : 'Failed',
                status.message || 'Rollback completed'
              );
            } catch (error) {
              console.error('Failed to rollback:', error);
              Alert.alert('Error', 'Failed to rollback deployment');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Toggle feature flag
  const toggleFeatureFlag = async (flagKey: string) => {
    try {
      const flag = featureFlags.get(flagKey);
      if (flag) {
        const updatedFlag = { ...flag, enabled: !flag.enabled };
        await deploymentService.updateFeatureFlag(updatedFlag);
        await loadDeploymentData();
      }
    } catch (error) {
      console.error('Failed to toggle feature flag:', error);
      Alert.alert('Error', 'Failed to update feature flag');
    }
  };

  // Update feature flag rollout
  const updateFeatureRollout = async (flagKey: string, rolloutPercentage: number) => {
    try {
      const flag = featureFlags.get(flagKey);
      if (flag) {
        const updatedFlag = { ...flag, rolloutPercentage };
        await deploymentService.updateFeatureFlag(updatedFlag);
        await loadDeploymentData();
      }
    } catch (error) {
      console.error('Failed to update feature flag rollout:', error);
      Alert.alert('Error', 'Failed to update feature flag');
    }
  };

  // Load data on mount
  useEffect(() => {
    loadDeploymentData();
  }, []);

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success':
        return '#00ff00';
      case 'failed':
        return '#ff0000';
      case 'pending':
        return '#ffaa00';
      case 'rolled_back':
        return '#5856D6';
      default:
        return '#666666';
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
    card: {
      backgroundColor: theme.colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    infoValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '500',
      flex: 2,
      textAlign: 'right',
    },
    environmentSelector: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    envButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    envButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    envButtonInactive: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    envButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    envButtonTextActive: {
      color: theme.colors.background,
    },
    envButtonTextInactive: {
      color: theme.colors.text,
    },
    actionsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    deployButton: {
      backgroundColor: theme.colors.primary,
    },
    rollbackButton: {
      backgroundColor: '#ff4444',
    },
    actionButtonText: {
      color: theme.colors.background,
      fontSize: 14,
      fontWeight: '500',
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    statusText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    featureFlagItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    featureFlagInfo: {
      flex: 1,
    },
    featureFlagName: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 4,
    },
    featureFlagDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    featureFlagControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rolloutInput: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 4,
      padding: 8,
      width: 80,
      textAlign: 'center',
      color: theme.colors.text,
    },
    historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    historyInfo: {
      flex: 1,
    },
    historyVersion: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 2,
    },
    historyTime: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    historyStatus: {
      fontSize: 12,
      fontWeight: '500',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
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
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 24,
    },
  });

  if (!config || !buildInfo) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.text }}>Loading deployment data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Environment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environment</Text>
          
          <View style={styles.environmentSelector}>
            {(['development', 'staging', 'production'] as const).map(env => (
              <TouchableOpacity
                key={env}
                style={[
                  styles.envButton,
                  config.environment === env ? styles.envButtonActive : styles.envButtonInactive,
                ]}
                onPress={() => switchEnvironment(env)}
              >
                <Text
                  style={[
                    styles.envButtonText,
                    config.environment === env ? styles.envButtonTextActive : styles.envButtonTextInactive,
                  ]}
                >
                  {env.charAt(0).toUpperCase() + env.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Current Environment</Text>
              <Text style={styles.infoValue}>{config.environment.toUpperCase()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>API Endpoint</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{config.apiEndpoint}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>{config.version} (Build {config.buildNumber})</Text>
            </View>
          </View>
        </View>

        {/* Build Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Build Information</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build ID</Text>
              <Text style={styles.infoValue}>{buildInfo.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build Time</Text>
              <Text style={styles.infoValue}>{formatTimestamp(buildInfo.timestamp)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>{buildInfo.platform}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Commit Hash</Text>
              <Text style={styles.infoValue}>{buildInfo.commitHash.substring(0, 8)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Branch</Text>
              <Text style={styles.infoValue}>{buildInfo.branch}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build Type</Text>
              <Text style={styles.infoValue}>{buildInfo.buildType}</Text>
            </View>
          </View>
        </View>

        {/* Deployment Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deployment Status</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(deploymentStatus?.status || 'unknown') },
                  ]}
                />
                <Text style={styles.statusText}>{deploymentStatus?.status || 'Unknown'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Deployment Time</Text>
              <Text style={styles.infoValue}>
                {deploymentStatus?.deploymentTime ? formatTimestamp(deploymentStatus.deploymentTime) : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rollback Available</Text>
              <Text style={styles.infoValue}>{deploymentStatus?.rollbackAvailable ? 'Yes' : 'No'}</Text>
            </View>
            {deploymentStatus?.lastRollbackTime && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Rollback</Text>
                <Text style={styles.infoValue}>{formatTimestamp(deploymentStatus.lastRollbackTime)}</Text>
              </View>
            )}
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.deployButton]}
              onPress={deployNewVersion}
            >
              <Text style={styles.actionButtonText}>Deploy New</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.rollbackButton]}
              onPress={rollbackDeployment}
              disabled={!deploymentStatus?.rollbackAvailable}
            >
              <Text style={styles.actionButtonText}>Rollback</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Flags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feature Flags</Text>
          
          <View style={styles.card}>
            {Array.from(featureFlags.entries()).map(([key, flag]) => (
              <View key={key} style={styles.featureFlagItem}>
                <View style={styles.featureFlagInfo}>
                  <Text style={styles.featureFlagName}>{flag.key}</Text>
                  <Text style={styles.featureFlagDescription}>
                    Rollout: {flag.rolloutPercentage}% | 
                    {flag.conditions?.environment ? ` Env: ${flag.conditions.environment.join(', ')}` : ''}
                  </Text>
                </View>
                <View style={styles.featureFlagControls}>
                  <Switch
                    value={flag.enabled}
                    onValueChange={() => toggleFeatureFlag(key)}
                  />
                  <TextInput
                    style={styles.rolloutInput}
                    value={flag.rolloutPercentage.toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text, 10);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        updateFeatureRollout(key, value);
                      }
                    }}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Deployment History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deployment History</Text>
          
          <View style={styles.card}>
            {deploymentHistory.length === 0 ? (
              <Text style={[styles.infoValue, { textAlign: 'center', paddingVertical: 20 }]}>
                No deployment history available
              </Text>
            ) : (
              deploymentHistory.slice(-10).reverse().map((deployment, index) => (
                <View key={deployment.deploymentId} style={styles.historyItem}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyVersion}>
                      {deployment.buildInfo.version} (Build {deployment.buildInfo.buildNumber})
                    </Text>
                    <Text style={styles.historyTime}>
                      {formatTimestamp(deployment.timestamp)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.historyStatus,
                      { backgroundColor: getStatusColor(deployment.status) + '20' },
                    ]}
                  >
                    {deployment.status}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default DeploymentManager;