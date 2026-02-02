// React component for real-time analytics dashboard
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import BusinessAnalyticsService from '../services/analytics/BusinessAnalyticsService';
import { useTheme } from '../contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface AnalyticsDashboardProps {
  analyticsService: BusinessAnalyticsService;
  onExport?: (data: any) => void;
}

interface DashboardData {
  activeUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  topScreens: Array<{ screenName: string; views: number }>;
  performanceMetrics: {
    appStartTime: number;
    screenLoadTime: number;
    apiResponseTime: number;
  };
  businessMetrics: {
    inspectionCount: number;
    userRegistrations: number;
    conversionRate: number;
  };
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  analyticsService,
  onExport,
}) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('24h');

  const { theme } = useTheme();

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadDashboardData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(loadDashboardData, 300000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getPerformanceColor = (value: number, threshold: { good: number; warning: number }): string => {
    if (value <= threshold.good) return '#00ff00';
    if (value <= threshold.warning) return '#ffaa00';
    return '#ff0000';
  };

  const chartConfig = {
    backgroundColor: theme.colors.background,
    backgroundGradientFrom: theme.colors.background,
    backgroundGradientTo: theme.colors.background,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${theme.colors.primary}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${theme.colors.text}, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const pieChartConfig = {
    color: (opacity = 1) => `rgba(${theme.colors.primary}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(${theme.colors.text}, ${opacity})`,
  };

  if (loading && !dashboardData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading analytics...
        </Text>
      </View>
    );
  }

  const performanceChartData = dashboardData ? {
    labels: ['App Start', 'Screen Load', 'API Response'],
    datasets: [{
      data: [
        dashboardData.performanceMetrics.appStartTime / 1000, // Convert to seconds
        dashboardData.performanceMetrics.screenLoadTime / 1000,
        dashboardData.performanceMetrics.apiResponseTime / 1000,
      ],
    }],
  } : null;

  const businessMetricsData = dashboardData ? {
    labels: ['Inspections', 'Registrations', 'Conv. Rate %'],
    datasets: [{
      data: [
        dashboardData.businessMetrics.inspectionCount,
        dashboardData.businessMetrics.userRegistrations,
        dashboardData.businessMetrics.conversionRate * 100,
      ],
    }],
  } : null;

  const topScreensData = dashboardData ? {
    labels: dashboardData.topScreens.slice(0, 5).map(screen => 
      screen.screenName.length > 10 ? screen.screenName.substring(0, 10) + '...' : screen.screenName
    ),
    datasets: [{
      data: dashboardData.topScreens.slice(0, 5).map(screen => screen.views),
    }],
  } : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadDashboardData();
          }}
          tintColor={theme.colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Analytics Dashboard
        </Text>
        <View style={styles.periodSelector}>
          {(['24h', '7d', '30d'] as const).map(period => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && [
                  styles.periodButtonActive,
                  { backgroundColor: theme.colors.primary },
                ],
                { borderColor: theme.colors.border },
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  { color: selectedPeriod === period ? theme.colors.background : theme.colors.text },
                ]}
              >
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Key Metrics
        </Text>
        
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
              {dashboardData?.activeUsers || 0}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Active Users
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
              {formatNumber(dashboardData?.totalSessions || 0)}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Total Sessions
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
              {formatDuration(dashboardData?.averageSessionDuration || 0)}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Avg. Session
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
              {dashboardData?.topScreens.length || 0}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>
              Screen Types
            </Text>
          </View>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Performance Metrics
        </Text>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          {performanceChartData && (
            <BarChart
              data={performanceChartData}
              width={screenWidth - 40}
              height={200}
              chartConfig={chartConfig}
              style={styles.chart}
            />
          )}
          
          <View style={styles.performanceDetails}>
            <View style={styles.performanceItem}>
              <Text style={[styles.performanceLabel, { color: theme.colors.textSecondary }]}>
                App Start
              </Text>
              <Text
                style={[
                  styles.performanceValue,
                  {
                    color: getPerformanceColor(
                      dashboardData?.performanceMetrics.appStartTime || 0,
                      { good: 2000, warning: 4000 }
                    ),
                  },
                ]}
              >
                {formatDuration(dashboardData?.performanceMetrics.appStartTime || 0)}
              </Text>
            </View>

            <View style={styles.performanceItem}>
              <Text style={[styles.performanceLabel, { color: theme.colors.textSecondary }]}>
                Screen Load
              </Text>
              <Text
                style={[
                  styles.performanceValue,
                  {
                    color: getPerformanceColor(
                      dashboardData?.performanceMetrics.screenLoadTime || 0,
                      { good: 1000, warning: 2000 }
                    ),
                  },
                ]}
              >
                {formatDuration(dashboardData?.performanceMetrics.screenLoadTime || 0)}
              </Text>
            </View>

            <View style={styles.performanceItem}>
              <Text style={[styles.performanceLabel, { color: theme.colors.textSecondary }]}>
                API Response
              </Text>
              <Text
                style={[
                  styles.performanceValue,
                  {
                    color: getPerformanceColor(
                      dashboardData?.performanceMetrics.apiResponseTime || 0,
                      { good: 500, warning: 1500 }
                    ),
                  },
                ]}
              >
                {formatDuration(dashboardData?.performanceMetrics.apiResponseTime || 0)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Business Metrics */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Business Metrics
        </Text>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          {businessMetricsData && (
            <BarChart
              data={businessMetricsData}
              width={screenWidth - 40}
              height={200}
              chartConfig={chartConfig}
              style={styles.chart}
            />
          )}
        </View>
      </View>

      {/* Top Screens */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Top Screens
        </Text>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          {topScreensData && (
            <BarChart
              data={topScreensData}
              width={screenWidth - 40}
              height={200}
              chartConfig={chartConfig}
              style={styles.chart}
            />
          )}
          
          <View style={styles.screenList}>
            {dashboardData?.topScreens.slice(0, 5).map((screen, index) => (
              <View key={screen.screenName} style={styles.screenItem}>
                <Text style={[styles.screenRank, { color: theme.colors.textSecondary }]}>
                  #{index + 1}
                </Text>
                <Text
                  style={[
                    styles.screenName,
                    { color: theme.colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {screen.screenName}
                </Text>
                <Text style={[styles.screenViews, { color: theme.colors.primary }]}>
                  {formatNumber(screen.views)} views
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Export Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Export Data
        </Text>

        <View style={styles.exportActions}>
          <TouchableOpacity
            style={[
              styles.exportButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => onExport?.(dashboardData)}
          >
            <Text style={[styles.exportButtonText, { color: theme.colors.background }]}>
              Export as JSON
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.exportButton,
              styles.exportButtonSecondary,
              { borderColor: theme.colors.primary },
            ]}
            onPress={() => analyticsService.exportData('csv').then(console.log)}
          >
            <Text style={[styles.exportButtonText, { color: theme.colors.primary }]}>
              Export as CSV
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Refresh Status */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
          Last updated: {new Date().toLocaleString()}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodButtonActive: {},
  periodButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  performanceDetails: {
    marginTop: 16,
  },
  performanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  performanceLabel: {
    flex: 1,
    fontSize: 14,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  screenList: {
    marginTop: 16,
  },
  screenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  screenRank: {
    width: 30,
    fontSize: 12,
    fontWeight: '600',
  },
  screenName: {
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  screenViews: {
    fontSize: 12,
    fontWeight: '500',
  },
  exportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});

export default AnalyticsDashboard;