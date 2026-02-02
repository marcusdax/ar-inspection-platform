// Business analytics service for comprehensive monitoring and reporting
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface AnalyticsConfig {
  enableRealTimeTracking?: boolean;
  enableUserBehaviorTracking?: boolean;
  enablePerformanceMonitoring?: boolean;
  enableBusinessMetrics?: boolean;
  dataRetentionDays?: number;
  batchUploadInterval?: number;
  enableGDPRCompliance?: boolean;
  anonymizeData?: boolean;
}

export interface UserBehaviorEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: 'screen_view' | 'user_action' | 'session_start' | 'session_end' | 'error';
  screenName?: string;
  actionName?: string;
  timestamp: number;
  duration?: number;
  metadata?: {
    [key: string]: any;
  };
}

export interface PerformanceMetric {
  id: string;
  metricType: 'app_start_time' | 'screen_load_time' | 'api_response_time' | 'memory_usage' | 'cpu_usage';
  value: number;
  unit: 'ms' | 'MB' | '%';
  timestamp: number;
  sessionId?: string;
  userId?: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface BusinessMetric {
  id: string;
  metricType: 'inspection_count' | 'user_registrations' | 'active_sessions' | 'revenue' | 'conversion_rate';
  value: number;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  timestamp: number;
  breakdown?: {
    [key: string]: number;
  };
  metadata?: {
    [key: string]: any;
  };
}

export interface AnalyticsReport {
  id: string;
  reportType: 'user_behavior' | 'performance' | 'business' | 'comprehensive';
  period: {
    start: number;
    end: number;
  };
  data: any;
  generatedAt: number;
  format: 'json' | 'csv' | 'pdf';
}

class BusinessAnalyticsService {
  private static instance: BusinessAnalyticsService;
  private config: AnalyticsConfig;
  private userBehaviorEvents: UserBehaviorEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private businessMetrics: BusinessMetric[] = [];
  private sessionStartTime: number | null = null;
  private currentScreen: string | null = null;

  constructor(config: AnalyticsConfig = {}) {
    this.config = {
      enableRealTimeTracking: true,
      enableUserBehaviorTracking: true,
      enablePerformanceMonitoring: true,
      enableBusinessMetrics: true,
      dataRetentionDays: 90,
      batchUploadInterval: 300000, // 5 minutes
      enableGDPRCompliance: true,
      anonymizeData: false,
      ...config,
    };

    this.initializeAnalytics();
  }

  static getInstance(config?: AnalyticsConfig): BusinessAnalyticsService {
    if (!BusinessAnalyticsService.instance) {
      BusinessAnalyticsService.instance = new BusinessAnalyticsService(config);
    }
    return BusinessAnalyticsService.instance;
  }

  // Initialize analytics service
  private async initializeAnalytics(): Promise<void> {
    try {
      // Load cached data
      await this.loadCachedData();

      // Start batch upload timer
      this.startBatchUploadTimer();

      // Clean up old data
      await this.cleanupOldData();

      console.log('Business analytics service initialized');
    } catch (error) {
      console.error('Failed to initialize analytics service:', error);
    }
  }

  // Track user behavior event
  async trackUserBehavior(event: Omit<UserBehaviorEvent, 'id' | 'timestamp'>): Promise<void> {
    try {
      if (!this.config.enableUserBehaviorTracking) {
        return;
      }

      const userBehaviorEvent: UserBehaviorEvent = {
        ...event,
        id: `behavior_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      // Anonymize data if enabled
      if (this.config.anonymizeData) {
        userBehaviorEvent.userId = this.hashUserId(userBehaviorEvent.userId);
        userBehaviorEvent.sessionId = this.hashUserId(userBehaviorEvent.sessionId);
      }

      this.userBehaviorEvents.push(userBehaviorEvent);

      // Store locally
      await this.storeUserBehaviorEvent(userBehaviorEvent);

      // Send to analytics platform if real-time tracking is enabled
      if (this.config.enableRealTimeTracking) {
        await this.uploadUserBehaviorEvent(userBehaviorEvent);
      }

      console.log('User behavior tracked:', userBehaviorEvent.eventType);
    } catch (error) {
      console.error('Failed to track user behavior:', error);
    }
  }

  // Track performance metric
  async trackPerformanceMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): Promise<void> {
    try {
      if (!this.config.enablePerformanceMonitoring) {
        return;
      }

      const performanceMetric: PerformanceMetric = {
        ...metric,
        id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      // Anonymize data if enabled
      if (this.config.anonymizeData && performanceMetric.userId) {
        performanceMetric.userId = this.hashUserId(performanceMetric.userId);
      }

      this.performanceMetrics.push(performanceMetric);

      // Store locally
      await this.storePerformanceMetric(performanceMetric);

      // Send to analytics platform if real-time tracking is enabled
      if (this.config.enableRealTimeTracking) {
        await this.uploadPerformanceMetric(performanceMetric);
      }

      console.log('Performance metric tracked:', performanceMetric.metricType, performanceMetric.value);
    } catch (error) {
      console.error('Failed to track performance metric:', error);
    }
  }

  // Track business metric
  async trackBusinessMetric(metric: Omit<BusinessMetric, 'id' | 'timestamp'>): Promise<void> {
    try {
      if (!this.config.enableBusinessMetrics) {
        return;
      }

      const businessMetric: BusinessMetric = {
        ...metric,
        id: `biz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };

      this.businessMetrics.push(businessMetric);

      // Store locally
      await this.storeBusinessMetric(businessMetric);

      // Send to analytics platform if real-time tracking is enabled
      if (this.config.enableRealTimeTracking) {
        await this.uploadBusinessMetric(businessMetric);
      }

      console.log('Business metric tracked:', businessMetric.metricType, businessMetric.value);
    } catch (error) {
      console.error('Failed to track business metric:', error);
    }
  }

  // Start user session tracking
  startSession(userId: string, sessionId: string): void {
    this.sessionStartTime = Date.now();

    this.trackUserBehavior({
      userId,
      sessionId,
      eventType: 'session_start',
      metadata: {
        platform: Platform.OS,
        appVersion: '1.0.0',
        deviceInfo: this.getDeviceInfo(),
      },
    });
  }

  // End user session tracking
  endSession(userId: string, sessionId: string): void {
    if (this.sessionStartTime) {
      const duration = Date.now() - this.sessionStartTime;

      this.trackUserBehavior({
        userId,
        sessionId,
        eventType: 'session_end',
        duration,
        metadata: {
          sessionDuration: duration,
        },
      });

      this.sessionStartTime = null;
    }
  }

  // Track screen view
  trackScreenView(screenName: string, userId: string, sessionId: string): void {
    // End previous screen view if exists
    if (this.currentScreen) {
      // Calculate screen view duration
      const startTime = Date.now(); // This should be tracked properly in real implementation
      
      this.trackUserBehavior({
        userId,
        sessionId,
        eventType: 'screen_view',
        screenName: this.currentScreen,
        duration: Date.now() - startTime,
      });
    }

    // Start new screen view
    this.currentScreen = screenName;
    
    this.trackUserBehavior({
      userId,
      sessionId,
      eventType: 'screen_view',
      screenName,
    });
  }

  // Track user action
  trackUserAction(
    actionName: string,
    screenName: string,
    userId: string,
    sessionId: string,
    metadata?: any
  ): void {
    this.trackUserBehavior({
      userId,
      sessionId,
      eventType: 'user_action',
      screenName,
      actionName,
      metadata,
    });
  }

  // Track app start performance
  trackAppStartTime(startTime: number, userId?: string, sessionId?: string): void {
    const appStartTime = Date.now() - startTime;

    this.trackPerformanceMetric({
      metricType: 'app_start_time',
      value: appStartTime,
      unit: 'ms',
      userId,
      sessionId,
      metadata: {
        startTime,
        endTime: Date.now(),
      },
    });
  }

  // Track screen load performance
  trackScreenLoadTime(
    screenName: string,
    loadTime: number,
    userId?: string,
    sessionId?: string
  ): void {
    this.trackPerformanceMetric({
      metricType: 'screen_load_time',
      value: loadTime,
      unit: 'ms',
      userId,
      sessionId,
      metadata: {
        screenName,
      },
    });
  }

  // Track API response time
  trackAPIResponseTime(
    endpoint: string,
    responseTime: number,
    statusCode: number,
    userId?: string,
    sessionId?: string
  ): void {
    this.trackPerformanceMetric({
      metricType: 'api_response_time',
      value: responseTime,
      unit: 'ms',
      userId,
      sessionId,
      metadata: {
        endpoint,
        statusCode,
      },
    });
  }

  // Track inspection count
  async trackInspectionCount(userId: string, sessionId: string, inspectionType: string): Promise<void> {
    await this.trackBusinessMetric({
      metricType: 'inspection_count',
      value: 1,
      period: 'daily',
      breakdown: {
        [inspectionType]: 1,
      },
      metadata: {
        userId,
        sessionId,
        inspectionType,
      },
    });
  }

  // Generate analytics report
  async generateReport(
    reportType: AnalyticsReport['reportType'],
    period: {
      start: number;
      end: number;
    },
    format: AnalyticsReport['format'] = 'json'
  ): Promise<AnalyticsReport> {
    try {
      let reportData: any = {};

      switch (reportType) {
        case 'user_behavior':
          reportData = await this.generateUserBehaviorReport(period);
          break;
        case 'performance':
          reportData = await this.generatePerformanceReport(period);
          break;
        case 'business':
          reportData = await this.generateBusinessReport(period);
          break;
        case 'comprehensive':
          reportData = await this.generateComprehensiveReport(period);
          break;
      }

      const report: AnalyticsReport = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        reportType,
        period,
        data: reportData,
        generatedAt: Date.now(),
        format,
      };

      // Store report
      await this.storeReport(report);

      return report;
    } catch (error) {
      console.error('Failed to generate report:', error);
      throw error;
    }
  }

  // Get real-time analytics dashboard data
  async getDashboardData(): Promise<{
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
  }> {
    try {
      const now = Date.now();
      const last24Hours = now - (24 * 60 * 60 * 1000);

      // Filter recent events
      const recentUserBehavior = this.userBehaviorEvents.filter(
        event => event.timestamp >= last24Hours
      );
      const recentPerformance = this.performanceMetrics.filter(
        metric => metric.timestamp >= last24Hours
      );
      const recentBusiness = this.businessMetrics.filter(
        metric => metric.timestamp >= last24Hours
      );

      // Calculate metrics
      const activeUsers = new Set(recentUserBehavior.map(e => e.userId)).size;
      const sessions = recentUserBehavior.filter(e => e.eventType === 'session_start');
      const totalSessions = sessions.length;

      // Calculate average session duration
      const sessionEndEvents = recentUserBehavior.filter(e => e.eventType === 'session_end' && e.duration);
      const averageSessionDuration = sessionEndEvents.length > 0
        ? sessionEndEvents.reduce((sum, event) => sum + (event.duration || 0), 0) / sessionEndEvents.length
        : 0;

      // Top screens
      const screenViews = recentUserBehavior.filter(e => e.eventType === 'screen_view' && e.screenName);
      const screenCounts: { [key: string]: number } = {};
      screenViews.forEach(event => {
        if (event.screenName) {
          screenCounts[event.screenName] = (screenCounts[event.screenName] || 0) + 1;
        }
      });
      const topScreens = Object.entries(screenCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([screenName, views]) => ({ screenName, views }));

      // Performance metrics
      const appStartMetrics = recentPerformance.filter(m => m.metricType === 'app_start_time');
      const screenLoadMetrics = recentPerformance.filter(m => m.metricType === 'screen_load_time');
      const apiMetrics = recentPerformance.filter(m => m.metricType === 'api_response_time');

      const performanceMetrics = {
        appStartTime: appStartMetrics.length > 0
          ? appStartMetrics.reduce((sum, m) => sum + m.value, 0) / appStartMetrics.length
          : 0,
        screenLoadTime: screenLoadMetrics.length > 0
          ? screenLoadMetrics.reduce((sum, m) => sum + m.value, 0) / screenLoadMetrics.length
          : 0,
        apiResponseTime: apiMetrics.length > 0
          ? apiMetrics.reduce((sum, m) => sum + m.value, 0) / apiMetrics.length
          : 0,
      };

      // Business metrics
      const inspectionMetrics = recentBusiness.filter(m => m.metricType === 'inspection_count');
      const registrationMetrics = recentBusiness.filter(m => m.metricType === 'user_registrations');
      const conversionMetrics = recentBusiness.filter(m => m.metricType === 'conversion_rate');

      const businessMetrics = {
        inspectionCount: inspectionMetrics.reduce((sum, m) => sum + m.value, 0),
        userRegistrations: registrationMetrics.reduce((sum, m) => sum + m.value, 0),
        conversionRate: conversionMetrics.length > 0
          ? conversionMetrics.reduce((sum, m) => sum + m.value, 0) / conversionMetrics.length
          : 0,
      };

      return {
        activeUsers,
        totalSessions,
        averageSessionDuration,
        topScreens,
        performanceMetrics,
        businessMetrics,
      };
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  // Helper methods
  private async loadCachedData(): Promise<void> {
    try {
      // Load user behavior events
      const behaviorKeys = await AsyncStorage.getAllKeys();
      const behaviorEventKeys = behaviorKeys.filter(key => key.startsWith('behavior_'));
      
      for (const key of behaviorEventKeys) {
        const eventData = await AsyncStorage.getItem(key);
        if (eventData) {
          this.userBehaviorEvents.push(JSON.parse(eventData));
        }
      }

      // Load performance metrics
      const perfKeys = behaviorKeys.filter(key => key.startsWith('perf_'));
      for (const key of perfKeys) {
        const metricData = await AsyncStorage.getItem(key);
        if (metricData) {
          this.performanceMetrics.push(JSON.parse(metricData));
        }
      }

      // Load business metrics
      const bizKeys = behaviorKeys.filter(key => key.startsWith('biz_'));
      for (const key of bizKeys) {
        const metricData = await AsyncStorage.getItem(key);
        if (metricData) {
          this.businessMetrics.push(JSON.parse(metricData));
        }
      }

      console.log('Cached analytics data loaded');
    } catch (error) {
      console.error('Failed to load cached data:', error);
    }
  }

  private async storeUserBehaviorEvent(event: UserBehaviorEvent): Promise<void> {
    await AsyncStorage.setItem(`behavior_${event.id}`, JSON.stringify(event));
  }

  private async storePerformanceMetric(metric: PerformanceMetric): Promise<void> {
    await AsyncStorage.setItem(`perf_${metric.id}`, JSON.stringify(metric));
  }

  private async storeBusinessMetric(metric: BusinessMetric): Promise<void> {
    await AsyncStorage.setItem(`biz_${metric.id}`, JSON.stringify(metric));
  }

  private async storeReport(report: AnalyticsReport): Promise<void> {
    await AsyncStorage.setItem(`report_${report.id}`, JSON.stringify(report));
  }

  private async uploadUserBehaviorEvent(event: UserBehaviorEvent): Promise<void> {
    // Send to analytics server
    console.log('Uploading user behavior event:', event.id);
  }

  private async uploadPerformanceMetric(metric: PerformanceMetric): Promise<void> {
    // Send to analytics server
    console.log('Uploading performance metric:', metric.id);
  }

  private async uploadBusinessMetric(metric: BusinessMetric): Promise<void> {
    // Send to analytics server
    console.log('Uploading business metric:', metric.id);
  }

  private async cleanupOldData(): Promise<void> {
    try {
      const cutoffTime = Date.now() - (this.config.dataRetentionDays! * 24 * 60 * 60 * 1000);
      const keys = await AsyncStorage.getAllKeys();

      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.timestamp && parsed.timestamp < cutoffTime) {
            await AsyncStorage.removeItem(key);
          }
        }
      }

      // Clean up in-memory arrays
      this.userBehaviorEvents = this.userBehaviorEvents.filter(
        event => event.timestamp >= cutoffTime
      );
      this.performanceMetrics = this.performanceMetrics.filter(
        metric => metric.timestamp >= cutoffTime
      );
      this.businessMetrics = this.businessMetrics.filter(
        metric => metric.timestamp >= cutoffTime
      );

      console.log('Old analytics data cleaned up');
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  private startBatchUploadTimer(): void {
    setInterval(async () => {
      if (!this.config.enableRealTimeTracking) {
        // Batch upload non-real-time data
        await this.batchUploadData();
      }
    }, this.config.batchUploadInterval!);
  }

  private async batchUploadData(): Promise<void> {
    try {
      // Upload pending events
      for (const event of this.userBehaviorEvents) {
        await this.uploadUserBehaviorEvent(event);
      }

      for (const metric of this.performanceMetrics) {
        await this.uploadPerformanceMetric(metric);
      }

      for (const businessMetric of this.businessMetrics) {
        await this.uploadBusinessMetric(businessMetric);
      }

      console.log('Batch upload completed');
    } catch (error) {
      console.error('Failed to batch upload data:', error);
    }
  }

  private hashUserId(userId: string): string {
    // Simple hashing for anonymization
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user_${Math.abs(hash)}`;
  }

  private getDeviceInfo(): any {
    return {
      platform: Platform.OS,
      version: Platform.Version,
    };
  }

  private async generateUserBehaviorReport(period: { start: number; end: number }): Promise<any> {
    const events = this.userBehaviorEvents.filter(
      event => event.timestamp >= period.start && event.timestamp <= period.end
    );

    return {
      totalEvents: events.length,
      eventTypeBreakdown: events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }),
      screenViews: events.filter(e => e.eventType === 'screen_view').length,
      userActions: events.filter(e => e.eventType === 'user_action').length,
      uniqueUsers: new Set(events.map(e => e.userId)).size,
    };
  }

  private async generatePerformanceReport(period: { start: number; end: number }): Promise<any> {
    const metrics = this.performanceMetrics.filter(
      metric => metric.timestamp >= period.start && metric.timestamp <= period.end
    );

    return {
      totalMetrics: metrics.length,
      metricTypeBreakdown: metrics.reduce((acc, metric) => {
        acc[metric.metricType] = (acc[metric.metricType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }),
      averageAppStartTime: this.calculateAverage(metrics, 'app_start_time'),
      averageScreenLoadTime: this.calculateAverage(metrics, 'screen_load_time'),
      averageAPIResponseTime: this.calculateAverage(metrics, 'api_response_time'),
    };
  }

  private async generateBusinessReport(period: { start: number; end: number }): Promise<any> {
    const metrics = this.businessMetrics.filter(
      metric => metric.timestamp >= period.start && metric.timestamp <= period.end
    );

    return {
      totalMetrics: metrics.length,
      metricTypeBreakdown: metrics.reduce((acc, metric) => {
        acc[metric.metricType] = (acc[metric.metricType] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }),
      totalInspections: this.sumByType(metrics, 'inspection_count'),
      totalRegistrations: this.sumByType(metrics, 'user_registrations'),
      averageConversionRate: this.calculateAverage(metrics, 'conversion_rate'),
    };
  }

  private async generateComprehensiveReport(period: { start: number; end: number }): Promise<any> {
    return {
      userBehavior: await this.generateUserBehaviorReport(period),
      performance: await this.generatePerformanceReport(period),
      business: await this.generateBusinessReport(period),
    };
  }

  private calculateAverage(metrics: PerformanceMetric[], type: string): number {
    const filtered = metrics.filter(m => m.metricType === type);
    return filtered.length > 0
      ? filtered.reduce((sum, m) => sum + m.value, 0) / filtered.length
      : 0;
  }

  private sumByType(metrics: BusinessMetric[], type: string): number {
    return metrics
      .filter(m => m.metricType === type)
      .reduce((sum, m) => sum + m.value, 0);
  }

  // Public methods for external access
  async updateConfig(newConfig: Partial<AnalyticsConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    console.log('Analytics config updated');
  }

  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  async exportData(format: 'json' | 'csv'): Promise<string> {
    const data = {
      userBehaviorEvents: this.userBehaviorEvents,
      performanceMetrics: this.performanceMetrics,
      businessMetrics: this.businessMetrics,
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      // Convert to CSV format
      return this.convertToCSV(data);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    return 'user_behavior_events,performance_metrics,business_metrics\n' +
           `${data.userBehaviorEvents.length},${data.performanceMetrics.length},${data.businessMetrics.length}\n`;
  }
}

export default BusinessAnalyticsService;