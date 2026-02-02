// React component for real-time performance monitoring dashboard
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import PerformanceOptimizationService, { PerformanceMetrics } from '../../services/performance/PerformanceOptimizationService';
import { useTheme } from '../../contexts/ThemeContext';

const { width: screenWidth } = require('Dimensions').get('window');

interface PerformanceMonitorProps {
  performanceService: PerformanceOptimizationService;
  onOptimizationApplied?: (optimizations: string[]) => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  performanceService,
  onOptimizationApplied,
}) => {
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [baselineMetrics, setBaselineMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'memory' | 'cpu' | 'rendering' | 'network'>('overview');

  const { theme } = useTheme();

  // Load performance data
  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      
      const metrics = performanceService.getCurrentMetrics();
      const baseline = performanceService.getPerformanceBaseline();
      const currentAlerts = performanceService.getAlerts();
      const history = performanceService.getOptimizationHistory();

      setCurrentMetrics(metrics);
      setBaselineMetrics(baseline);
      setAlerts(currentAlerts);
      setOptimizationHistory(history);
    } catch (error) {
      console.error('Failed to load performance data:', error);
      Alert.alert('Error', 'Failed to load performance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Apply optimizations manually
  const applyOptimizations = async () => {
    try {
      setLoading(true);
      
      // This would trigger the optimization process
      const optimizations = ['memory', 'cpu', 'rendering'];
      
      Alert.alert(
        'Apply Optimizations',
        'This will apply performance optimizations to improve app performance. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Apply',
            onPress: () => {
              onOptimizationApplied?.(optimizations);
              loadPerformanceData();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to apply optimizations:', error);
      Alert.alert('Error', 'Failed to apply optimizations');
    } finally {
      setLoading(false);
    }
  };

  // Generate performance report
  const generateReport = async () => {
    try {
      const report = await performanceService.generatePerformanceReport();
      
      Alert.alert(
        'Performance Report',
        `Current Performance Status:\n` +
        `Memory: ${report.current?.memory.used}MB\n` +
        `CPU: ${report.current?.cpu.usage}%\n` +
        `FPS: ${report.current?.rendering.fps}\n` +
        `Alerts: ${report.alerts.length}\n` +
        `Recommendations: ${report.recommendations.length}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to generate report:', error);
      Alert.alert('Error', 'Failed to generate performance report');
    }
  };

  // Load data on mount
  useEffect(() => {
    loadPerformanceData();
    
    // Refresh data every 5 seconds
    const interval = setInterval(loadPerformanceData, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatValue = (value: number, unit: string): string => {
    if (unit === 'bytes') {
      return `${(value / 1024 / 1024).toFixed(1)}MB`;
    } else if (unit === 'percentage') {
      return `${value.toFixed(1)}%`;
    } else if (unit === 'ms') {
      return `${value.toFixed(0)}ms`;
    } else if (unit === 'fps') {
      return `${value.toFixed(0)} FPS`;
    }
    return value.toString();
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number; critical: number }): string => {
    if (value <= thresholds.good) return '#00ff00';
    if (value <= thresholds.warning) return '#ffaa00';
    return '#ff0000';
  };

  const getMetricStatus = (current: number, baseline: number | null): 'improved' | 'degraded' | 'stable' => {
    if (!baseline) return 'stable';
    const change = ((current - baseline) / baseline) * 100;
    if (change > 10) return 'degraded';
    if (change < -10) return 'improved';
    return 'stable';
  };

  const chartConfig = {
    backgroundColor: theme.colors.background,
    backgroundGradientFrom: theme.colors.background,
    backgroundGradientTo: theme.colors.background,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(${theme.colors.primary}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${theme.colors.text}, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const renderOverviewTab = () => {
    if (!currentMetrics) return null;

    return (
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.metricTitle, { color: theme.colors.text }]}>Memory Usage</Text>
          <Text
            style={[
              styles.metricValue,
              {
                color: getStatusColor(currentMetrics.memory.used, {
                  good: 100,
                  warning: 150,
                  critical: 200,
                }),
              },
            ]}
          >
            {formatValue(currentMetrics.memory.used, 'bytes')}
          </Text>
          <Text style={[styles.metricSubtitle, { color: theme.colors.textSecondary }]}>
            Available: {formatValue(currentMetrics.memory.available, 'bytes')}
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.metricTitle, { color: theme.colors.text }]}>CPU Usage</Text>
          <Text
            style={[
              styles.metricValue,
              {
                color: getStatusColor(currentMetrics.cpu.usage, {
                  good: 50,
                  warning: 70,
                  critical: 90,
                }),
              },
            ]}
          >
            {formatValue(currentMetrics.cpu.usage, 'percentage')}
          </Text>
          <Text style={[styles.metricSubtitle, { color: theme.colors.textSecondary }]}>
            Threads: {currentMetrics.cpu.threads}
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.metricTitle, { color: theme.colors.text }]}>Frame Rate</Text>
          <Text
            style={[
              styles.metricValue,
              {
                color: getStatusColor(currentMetrics.rendering.fps, {
                  good: 55,
                  warning: 45,
                  critical: 30,
                }),
              },
            ]}
          >
            {formatValue(currentMetrics.rendering.fps, 'fps')}
          </Text>
          <Text style={[styles.metricSubtitle, { color: theme.colors.textSecondary }]}>
            Dropped: {currentMetrics.rendering.droppedFrames}
          </Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.metricTitle, { color: theme.colors.text }]}>Battery</Text>
          <Text
            style={[
              styles.metricValue,
              {
                color: getStatusColor(currentMetrics.battery.level, {
                  good: 50,
                  warning: 20,
                  critical: 10,
                }),
              },
            ]}
          >
            {formatValue(currentMetrics.battery.level, 'percentage')}
          </Text>
          <Text style={[styles.metricSubtitle, { color: theme.colors.textSecondary }]}>
            {currentMetrics.battery.isCharging ? 'Charging' : `Drain: ${currentMetrics.battery.drainRate.toFixed(1)}%/h`}
          </Text>
        </View>
      </View>
    );
  };

  const renderMemoryTab = () => {
    if (!currentMetrics) return null;

    const memoryData = {
      labels: ['Used', 'Available', 'Peak'],
      datasets: [{
        data: [
          currentMetrics.memory.used,
          currentMetrics.memory.available,
          currentMetrics.memory.peak,
        ],
      }],
    };

    return (
      <View>
        <View style={[styles.chartContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
            Memory Usage (MB)
          </Text>
          <BarChart
            data={memoryData}
            width={screenWidth - 40}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </View>

        <View style={[styles.detailsContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>
            Memory Details
          </Text>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Used Memory
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatValue(currentMetrics.memory.used, 'bytes')}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Available Memory
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatValue(currentMetrics.memory.available, 'bytes')}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Peak Memory
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatValue(currentMetrics.memory.peak, 'bytes')}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Memory Leaks
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {currentMetrics.memory.leaks}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCPUTab = () => {
    if (!currentMetrics) return null;

    const cpuData = {
      labels: ['Current', 'Peak'],
      datasets: [{
        data: [
          currentMetrics.cpu.usage,
          currentMetrics.cpu.peakUsage,
        ],
      }],
    };

    return (
      <View>
        <View style={[styles.chartContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
            CPU Usage (%)
          </Text>
          <BarChart
            data={cpuData}
            width={screenWidth - 40}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </View>

        <View style={[styles.detailsContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>
            CPU Details
          </Text>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Current Usage
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatValue(currentMetrics.cpu.usage, 'percentage')}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Peak Usage
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatValue(currentMetrics.cpu.peakUsage, 'percentage')}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Threads
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {currentMetrics.cpu.threads}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRenderingTab = () => {
    if (!currentMetrics) return null;

    const renderingData = {
      labels: ['FPS', 'JS Frame', 'Native Frame'],
      datasets: [{
        data: [
          currentMetrics.rendering.fps,
          currentMetrics.rendering.jsFrameTime,
          currentMetrics.rendering.nativeFrameTime,
        ],
      }],
    };

    return (
      <View>
        <View style={[styles.chartContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.chartTitle, { color: theme.colors.text }]}>
            Rendering Performance
          </Text>
          <BarChart
            data={renderingData}
            width={screenWidth - 40}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
          />
        </View>

        <View style={[styles.detailsContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>
            Rendering Details
          </Text>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Frame Rate
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatValue(currentMetrics.rendering.fps, 'fps')}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Dropped Frames
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {currentMetrics.rendering.droppedFrames}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              JS Frame Time
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatValue(currentMetrics.rendering.jsFrameTime, 'ms')}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
              Native Frame Time
            </Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
              {formatValue(currentMetrics.rendering.nativeFrameTime, 'ms')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderNetworkTab = () => {
    if (!currentMetrics) return null;

    return (
      <View style={[styles.detailsContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.detailsTitle, { color: theme.colors.text }]}>
          Network Performance
        </Text>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
            Latency
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {formatValue(currentMetrics.network.latency, 'ms')}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
            Bandwidth
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {(currentMetrics.network.bandwidth / 1000).toFixed(1)} Mbps
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
            Packet Loss
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {formatValue(currentMetrics.network.packetLoss, 'percentage')}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
            Connection Type
          </Text>
          <Text style={[styles.detailValue, { color: theme.colors.text }]}>
            {currentMetrics.network.connectionType}
          </Text>
        </View>
      </View>
    );
  };

  const renderAlerts = () => {
    if (alerts.length === 0) {
      return (
        <View style={[styles.noAlertsContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.noAlertsText, { color: theme.colors.textSecondary }]}>
            No performance alerts
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.alertsContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Performance Alerts
        </Text>
        {alerts.slice(0, 5).map((alert, index) => (
          <View key={alert.id} style={[styles.alertItem, { backgroundColor: theme.colors.card }]}>
            <View style={styles.alertHeader}>
              <Text style={[styles.alertType, { color: theme.colors.text }]}>
                {alert.type.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.alertSeverity,
                  {
                    color:
                      alert.severity === 'critical'
                        ? '#ff0000'
                        : alert.severity === 'high'
                        ? '#ffaa00'
                        : alert.severity === 'medium'
                        ? '#ffdd00'
                        : '#00ff00',
                  },
                ]}
              >
                {alert.severity.toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.alertMessage, { color: theme.colors.text }]}>
              {alert.message}
            </Text>
            <Text style={[styles.alertTime, { color: theme.colors.textSecondary }]}>
              {new Date(alert.timestamp).toLocaleString()}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    tabContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.card,
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    tabTextActive: {
      color: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      padding: 20,
    },
    metricCard: {
      flex: 1,
      minWidth: '45%',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    metricTitle: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
    },
    metricValue: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    metricSubtitle: {
      fontSize: 12,
    },
    chartContainer: {
      margin: 20,
      padding: 16,
      borderRadius: 12,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 16,
    },
    chart: {
      borderRadius: 16,
    },
    detailsContainer: {
      margin: 20,
      padding: 16,
      borderRadius: 12,
    },
    detailsTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 16,
    },
    detailItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    detailLabel: {
      fontSize: 14,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '500',
    },
    alertsContainer: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 16,
    },
    alertItem: {
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
    },
    alertHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    alertType: {
      fontSize: 12,
      fontWeight: '600',
    },
    alertSeverity: {
      fontSize: 12,
      fontWeight: '500',
    },
    alertMessage: {
      fontSize: 14,
      marginBottom: 4,
    },
    alertTime: {
      fontSize: 12,
    },
    noAlertsContainer: {
      margin: 20,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    noAlertsText: {
      fontSize: 16,
    },
    actionsContainer: {
      flexDirection: 'row',
      padding: 20,
      gap: 12,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    optimizeButton: {
      backgroundColor: theme.colors.primary,
    },
    reportButton: {
      backgroundColor: theme.colors.secondary,
    },
    actionButtonText: {
      color: theme.colors.background,
      fontSize: 16,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Monitor</Text>
        
        <View style={styles.tabContainer}>
          {(['overview', 'memory', 'cpu', 'rendering', 'network'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                selectedTab === tab && styles.tabActive,
              ]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab && styles.tabTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPerformanceData();
            }}
            tintColor={theme.colors.primary}
          />
        }
      >
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'memory' && renderMemoryTab()}
        {selectedTab === 'cpu' && renderCPUTab()}
        {selectedTab === 'rendering' && renderRenderingTab()}
        {selectedTab === 'network' && renderNetworkTab()}
        
        {renderAlerts()}
      </ScrollView>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.optimizeButton]}
          onPress={applyOptimizations}
        >
          <Text style={styles.actionButtonText}>Apply Optimizations</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.reportButton]}
          onPress={generateReport}
        >
          <Text style={styles.actionButtonText}>Generate Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PerformanceMonitor;