import React, { useState, useEffect, useRef } from 'react';
import { LineChart, LineChartProps } from 'react-chart-kit';
import {
  Dimensions,
  StyleSheet,
  View,
  Text,
  Box,
  Paper,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import NetworkQualityService, {
  NetworkQuality,
  BandwidthProfile,
} from '../services/NetworkQualityService';

interface ChartData {
  timestamp: number;
  bandwidth: number;
  latency: number;
  packetLoss: number;
  qualityScore: number;
}

const VideoQualityDashboard: React.FC = () => {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLive, setIsLive] = useState(false);
  const chartRef = useRef<LineChart>(null);
  const [selectedMetric, setSelectedMetric] = useState<'bandwidth' | 'latency' | 'packetLoss' | 'qualityScore' | 'framerate'>('bandwidth');
  const timeWindow = 60; // 60 seconds of data

  useEffect(() => {
    // Update chart data every second
    const interval = setInterval(() => {
      const networkQuality = NetworkQualityService.getCurrentQuality();
      const networkStats = NetworkQualityService.getStatsHistory(10);
      
      if (networkStats.length > 0) {
        const latestStats = networkStats[networkStats.length - 1];
        const newDataPoint: ChartData = {
          timestamp: latestStats.timestamp,
          bandwidth: latestStats.video.received.bitrate || 0,
          latency: latestStats.video.received.latency || 0,
          packetLoss: latestStats.video.received.packetsLost || 0,
          qualityScore: NetworkQualityService.calculateQualityScore(networkQuality),
        };
        
        setChartData(prev => {
          const newData = [...prev, newDataPoint];
          
          // Keep only recent data
          if (newData.length > timeWindow) {
            return newData.slice(-timeWindow);
          }
          
          setChartData(newData);
        });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [chartData, timeWindow, isLive]);

  const handleStartLive = () => {
    setIsLive(true);
    console.log('Starting quality monitoring');
  };

  const handleStopLive = () => {
    setIsLive(false);
    console.log('Stopping quality monitoring');
  };

  const renderChart = (metric: 'bandwidth' | 'latency' | 'packetLoss' | 'qualityScore') => {
    const dataForMetric = chartData.map(d => ({
      timestamp: d.timestamp,
      value: metric === 'bandwidth' ? d.bandwidth :
            metric === 'latency' ? d.latency :
            metric === 'packetLoss' ? d.packetLoss :
            metric === 'qualityScore' ? d.qualityScore :
            metric === 'framerate' ? d.video.received?.framerate || 0 :
            0,
    }));

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>
          {metric.charAt(0).toUpperCase() + ' Trend (Last ' + timeWindow + 's)'}
        </Text>
        <LineChart
          ref={chartRef}
          style={styles.chart}
          data={dataForMetric}
          width={Dimensions.get('window').width - 40}
          height={200}
          {...LineChartProps}
        />
        <View style={styles.chartLegend}>
          <Text style={styles.legendText}>
            {metric.charAt(0).toUpperCase()}: {dataForMetric[dataForMetric.length - 1]?.value || 0} kbps}
          </Text>
        </View>
      </View>
    );
  };

  const getChartData = () => {
    switch (selectedMetric) {
      case 'bandwidth':
        return chartData.map(d => ({ ...d, value: d.bandwidth }));
      case 'latency':
        return chartData.map(d => ({ ...d, value: d.latency }));
      case 'packetLoss':
        return chartData.map(d => ({ ...d, value: d.packetLoss }));
      case 'qualityScore':
        return chartData.map(d => ({ ...d, value: d.qualityScore }));
      case 'framerate':
        return chartData.map(d => ({ ...d, value: d.video.received?.framerate || 0 }));
      default:
        return chartData.map(d => ({ ...d, value: 0 }));
    }
  };

  const getNetworkQualityText = (quality: NetworkQuality): string => {
    switch (quality.level) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'fair':
        return 'Fair';
      case 'poor':
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  const formatValue = (value: number, unit: string = 'Mbps'): string => {
    switch (unit) {
      case 'bps':
        return `${value.toFixed(0)} kbps`;
      case 'ms':
        return `${value.toFixed(0)} ms`;
      case '%':
        return `${(value * 100).toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Video Quality Dashboard</Text>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.networkStatus}>
            Network: {getNetworkQualityText(NetworkQualityService.getCurrentQuality())}
          </Text>
          <Text style={styles.bandwidth}>
            {formatValue(NetworkQualityService.getCurrentQuality().bandwidthEstimate, 'Mbps')}
          </Text>
        </Box>
        </Box>
        
        {isLive ? (
          <Text style={styles.liveIndicator}>● LIVE</Text>
        ) : (
          <Text style={styles.liveIndicator}>○ OFF</Text>
        )}
        
        <View style={styles.controlButtons}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleStartLive}
          >
            <Text style={styles.buttonText}>Start Monitoring</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, !isLive && styles.buttonActive]}
            onPress={handleStopLive}
          >
            <Text style={styles.buttonText}>Stop Monitoring</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Paper sx={{ p: 2 }}>
        <Text style={styles.sectionTitle}>Real-time Metrics</Text>
        
        <View style={styles.metricGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Bandwidth</Text>
            <Text style={styles.metricValue}>
              {formatValue(NetworkQualityService.getCurrentQuality().bandwidthEstimate, 'Mbps')}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Latency</Text>
            <Text style={styles.metricValue}>
              {NetworkQualityService.getCurrentQuality().latency}ms}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Packet Loss</Text>
            <Text style={metricsValue}>
              {(NetworkQualityService.getCurrentQuality().packetLoss * 100).toFixed(1)}%
            </Text>
          </View>
        </View>
        </View>

        {renderChart('bandwidth')}
        {renderChart('latency')}
        {renderChart('packetLoss')}
        {renderChart('qualityScore')}
      </Paper>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  networkStatus: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  bandwidth: {
    fontSize: 14,
    color: '#666',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  liveIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00FF00',
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonActive: {
    backgroundColor: '#005600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  chartContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  chart: {
    flex: 1,
  },
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  controlPanel: {
    flex: 1,
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    },
});

export default VideoQualityDashboard;