import { NetworkInfo } from '@react-native-community/netinfo';
import { ARSceneManager } from './ARSceneManager';

export interface NetworkQuality {
  level: 'excellent' | 'good' | 'fair' | 'poor';
  bandwidthEstimate: number; // kbps
  latency: number; // ms
  packetLoss: number; // percentage
  jitter: number; // ms
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  cellularGeneration?: '2g' | '3g' | '4g' | '5g';
}

export interface BandwidthProfile {
  videoBitrate: number; // kbps
  frameRate: number;
  resolution: {
    width: number;
    height: number;
  };
  codec: 'H264' | 'VP8' | 'VP9';
}

export interface NetworkStats {
  timestamp: number;
  video: {
    sent: {
      bitrate: number;
      framerate: number;
      framesEncoded: number;
      framesSent: number;
      framesDropped: number;
      packetsSent: number;
      packetsLost: number;
      jitter: number;
      qualityLimitationReason?: string;
    };
    received: {
      bitrate: number;
      framerate: number;
      framesDecoded: number;
      framesReceived: number;
      framesDropped: number;
      packetsReceived: number;
      packetsLost: number;
      jitter: number;
    };
  };
  network: {
    localCandidate: {
      type: 'host' | 'srflx' | 'prflx' | 'relay';
      ip: string;
      port: number;
      protocol: 'udp' | 'tcp';
    };
    remoteCandidate: {
      type: 'host' | 'srflx' | 'prflx' | 'relay';
      ip: string;
      port: number;
      protocol: 'udp' | 'tcp';
    };
    candidatePair: {
      state: string;
      nominated: boolean;
      bytesSent: number;
      bytesReceived: number;
      totalRoundTripTime: number;
      currentRoundTripTime: number;
      availableOutgoingBitrate?: number;
      availableIncomingBitrate?: number;
    };
  };
  audio: {
    sent: {
      bitrate: number;
      packetsSent: number;
      packetsLost: number;
    };
    received: {
      bitrate: number;
      packetsReceived: number;
      packetsLost: number;
    };
  };
}

export interface NetworkQualityConfig {
  thresholds: {
    packetLossIncrease: number; // 5% increase triggers downgrade
    roundTripTimeIncrease: number; // 30% increase triggers downgrade
    framesDroppedPerSecond: number; // 5 frames dropped per second
    availableBandwidthRatio: number; // Use 80% of available bandwidth
    minAdaptationInterval: number; // Minimum 5 seconds between adaptations
  };
  bandwidthProfiles: Record<NetworkQuality['level'], BandwidthProfile>;
}

class NetworkQualityService {
  private currentQuality: NetworkQuality = {
    level: 'good',
    bandwidthEstimate: 1500,
    latency: 100,
    packetLoss: 0,
    connectionType: 'wifi',
    cellularGeneration: '4g',
  };
  
  private networkQualityUnsubscribe: (() => void) => void;
  private statsHistory: NetworkStats[] = [];
  private maxHistorySize = 100;
  private listeners: Map<string, Function[]> = new Map();
  
  private config: NetworkQualityConfig = {
    thresholds: {
      packetLossIncrease: 0.05,
      roundTripTimeIncrease: 0.3,
      framesDroppedPerSecond: 5,
      availableBandwidthRatio: 0.8,
      minAdaptationInterval: 5000, // 5 seconds
    },
    bandwidthProfiles: {
      excellent: {
        videoBitrate: 4000,
        frameRate: 30,
        resolution: { width: 1920, height: 1080 },
        codec: 'VP9',
      },
      good: {
        videoBitrate: 2500,
        frameRate: 30,
        resolution: { width: 1280, height: 720 },
        codec: 'H264',
      },
      fair: {
        videoBitrate: 1000,
        frameRate: 24,
        resolution: { width: 854, height: 480 },
        codec: 'H264',
      },
      poor: {
        videoBitrate: 500,
        frameRate: 15,
        resolution: { width: 640, height: 360 },
        codec: 'H264',
      },
    },
  };

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    try {
      // Get initial network state
      const networkState = await NetInfo.fetch();
      this.updateNetworkState(networkState);
      
      // Subscribe to network changes
      this.setupNetworkListeners();
      
      console.log('NetworkQualityService initialized');
    } catch (error) {
      console.error('Failed to initialize NetworkQualityService:', error);
    }
  }

  private setupNetworkListeners(): void {
    NetInfo.addEventListener(state => {
      this.updateNetworkState(state);
    });
  }

  private updateNetworkState(state: any): void {
    const oldQuality = { ...this.currentQuality };
    const newQuality = this.calculateNetworkQuality(state);
    
    // Update quality level based on network state
    if (oldQuality.level !== newQuality.level || oldQuality.bandwidthEstimate !== newQuality.bandwidthEstimate) {
      this.currentQuality = newQuality;
      
      // Notify listeners of quality change
      this.emit('qualityChanged', newQuality);
      
      console.log(`Network quality: ${newQuality.level} (${newQuality.bandwidthEstimate} kbps, ${newQuality.latency}ms)`);
    }
  }

  private calculateNetworkQuality(state: any): NetworkQuality {
    const { type, details } = state;
    let level: NetworkQuality['level'] = 'good';
    let bandwidthEstimate = 1500;
    let latency = 100;
    let packetLoss = 0;
    let jitter = 0;
    let connectionType: NetworkQuality['connectionType'] = 'wifi';
    
    // Adjust based on connection type
    switch (type) {
      case 'wifi':
        // Assume good wifi
        bandwidthEstimate = 2000;
        latency = 50;
        connectionType = 'wifi';
        break;
      case 'cellular':
        // Adjust based on cellular generation
        const cellularGeneration = this.getCellularGeneration(details);
        switch (cellularGeneration) {
          case '5g':
            bandwidthEstimate = 1000;
            latency = 300;
            connectionType = 'cellular';
            break;
          case '4g':
            bandwidthEstimate = 1500;
            latency = 200;
            connectionType = 'cellular';
            break;
          case '3g':
            bandwidthEstimate = 800;
            latency = 400;
            connectionType = 'cellular';
            break;
          case '2g':
            bandwidthEstimate = 500;
            latency = 800;
            connectionType = 'cellular';
            break;
          default:
            bandwidthEstimate = 200;
            latency = 1000;
            connectionType = 'cellular';
            break;
        }
        break;
        
      case 'ethernet':
        bandwidthEstimate = 1000;
        latency = 10;
        connectionType = 'ethernet';
        break;
        
      case 'none':
      case 'unknown':
        bandwidthEstimate = 100;
        latency = 1000;
        connectionType = 'unknown';
        break;
    }
    
    // Adjust based on latency
    if (latency < 50) {
      level = 'excellent';
    } else if (latency < 100) {
      level = 'good';
    } else if (latency < 300) {
      level = 'fair';
    } else if (latency < 500) {
      level = 'poor';
    }
    
    // Adjust based on packet loss
    if (packetLoss > 1) {
      level = 'poor';
    } else if (packetLoss > 0.5) {
      level = 'fair';
    }
    
    // Final adjustment based on bandwidth
    if (bandwidthEstimate > 2000) {
      level = 'excellent';
    } else if (bandwidthEstimate > 1000) {
      level = 'good';
    } else if (bandwidthEstimate > 500) {
      level = 'fair';
    }
    
    // Downgrade if poor conditions detected
    if (latency > 500 || packetLoss > 2) {
      level = 'poor';
    }
    
    // Upgrade if excellent conditions and bandwidth available
    if (level === 'good' && bandwidthEstimate > 2500) {
      level = 'excellent';
    }
    
    return {
      level,
      bandwidthEstimate,
      latency,
      packetLoss,
      jitter,
      connectionType,
      cellularGeneration,
    };
  }

  getBandwidthProfile(level?: NetworkQuality['level']): BandwidthProfile {
    return this.config.bandwidthProfiles[level || 'good'];
  }

  getCurrentQuality(): NetworkQuality {
    return { ...this.currentQuality };
  }

  // Event handling
  on(event: string, callback: (quality: NetworkQuality) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: (quality: NetworkQuality) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      if (callback) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      } else {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, quality: NetworkQuality): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(quality);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  // Method to get cellular generation from network details
  private getCellularGeneration(details: any): '5g' | '4g' | '3g' | '2g' | 'unknown' {
    // This is a simplified implementation
    // In production, you'd use more detailed device detection
    const effectiveType = details?.effectiveType || details?.type;
    
    switch (effectiveType) {
      case 'NR_NEW_RADIO_TECHNOLOGY':
        return '5g';
      case 'NR_LTE':
        return '4g';
      case 'NR_UMTS':
      return '3g';
      case 'NR_CDMA':
        return '3g';
      case 'TD_SCDMA':
        return '2g';
      case 'NR_IDEN':
        return '2g';
      case 'NR_GSM':
      return '2g';
      case 'NR_EDGE':
        return '5g';
      default:
        return 'unknown';
    }
  }

  async measureNetworkQuality(): Promise<void> {
    try {
      const networkState = await NetInfo.fetch();
      this.updateNetworkState(networkState);
    } catch (error) {
      console.error('Failed to measure network quality:', error);
    }
  }

  cleanup(): void {
    this.listeners.clear();
    this.statsHistory = [];
  }
}

export default NetworkQualityService;