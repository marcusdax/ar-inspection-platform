// Enhanced AR Service with world map persistence capabilities
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WorldMapManager from './WorldMapManager';
import WorldMapStorage from '../storage/WorldMapStorage';

export interface ARServiceConfig {
  enableWorldMapping?: boolean;
  enablePlaneDetection?: boolean;
  enableLightEstimation?: boolean;
  enableOcclusion?: boolean;
  sessionTimeout?: number;
  autoSaveMaps?: boolean;
  maxConcurrentSessions?: number;
}

export interface ARSession {
  id: string;
  status: 'initializing' | 'running' | 'paused' | 'stopped' | 'error';
  config: ARServiceConfig;
  startTime: number;
  lastUpdate: number;
  metadata?: any;
}

export interface AREvent {
  type: string;
  sessionId: string;
  timestamp: number;
  data?: any;
}

class ARService {
  private eventEmitter: NativeEventEmitter;
  private activeSessions: Map<string, ARSession>;
  private worldMapManager: WorldMapManager | null = null;
  private worldMapStorage: WorldMapStorage | null = null;
  private sessionConfig: ARServiceConfig;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(config: ARServiceConfig = {}) {
    this.activeSessions = new Map();
    this.sessionConfig = {
      enableWorldMapping: true,
      enablePlaneDetection: true,
      enableLightEstimation: true,
      enableOcclusion: false,
      sessionTimeout: 300000, // 5 minutes
      autoSaveMaps: true,
      maxConcurrentSessions: 3,
      ...config,
    };

    this.eventEmitter = new NativeEventEmitter(NativeModules.ARBridge);
    this.setupNativeEventListeners();
    this.initializeWorldMapSupport();
  }

  // Initialize world map support
  private initializeWorldMapSupport(): void {
    if (this.sessionConfig.enableWorldMapping) {
      this.worldMapManager = new WorldMapManager({
        maxMaps: 20,
        enableLocation: true,
        autoSave: this.sessionConfig.autoSaveMaps,
        retentionDays: 90,
      });

      this.worldMapStorage = WorldMapStorage.getInstance({
        maxStorageSize: 500, // 500MB
        maxMapsCount: 50,
        compressionEnabled: true,
        encryptionEnabled: true,
        autoBackup: true,
      });
    }
  }

  // Set up native event listeners
  private setupNativeEventListeners(): void {
    this.eventEmitter.addListener('onARSessionStarted', (event: any) => {
      this.handleNativeEvent('sessionStarted', event);
    });

    this.eventEmitter.addListener('onARSessionStopped', (event: any) => {
      this.handleNativeEvent('sessionStopped', event);
    });

    this.eventEmitter.addListener('onTrackingStateChanged', (event: any) => {
      this.handleNativeEvent('trackingStateChanged', event);
    });

    this.eventEmitter.addListener('onPlaneDetected', (event: any) => {
      this.handleNativeEvent('planeDetected', event);
    });

    this.eventEmitter.addListener('onAnchorAdded', (event: any) => {
      this.handleNativeEvent('anchorAdded', event);
    });

    this.eventEmitter.addListener('onWorldMappingEvent', (event: any) => {
      this.handleNativeEvent('worldMapping', event);
    });
  }

  // Handle native events
  private handleNativeEvent(eventType: string, data: any): void {
    const event: AREvent = {
      type: eventType,
      sessionId: data.sessionId || 'global',
      timestamp: Date.now(),
      data,
    };

    this.emitEvent(eventType, event);

    // Handle specific event types
    switch (eventType) {
      case 'sessionStarted':
        this.handleSessionStarted(event);
        break;
      case 'sessionStopped':
        this.handleSessionStopped(event);
        break;
      case 'worldMapping':
        this.handleWorldMappingEvent(event);
        break;
    }
  }

  // Handle session started
  private handleSessionStarted(event: AREvent): void {
    const session = this.activeSessions.get(event.sessionId);
    if (session) {
      session.status = 'running';
      session.lastUpdate = event.timestamp;
    }
  }

  // Handle session stopped
  private handleSessionStopped(event: AREvent): void {
    const session = this.activeSessions.get(event.sessionId);
    if (session) {
      session.status = 'stopped';
      session.lastUpdate = event.timestamp;
    }
  }

  // Handle world mapping events
  private handleWorldMappingEvent(event: AREvent): void {
    if (!this.worldMapManager) return;

    switch (event.data.type) {
      case 'mappingStarted':
        console.log('World mapping started for session:', event.sessionId);
        break;
      case 'mappingStopped':
        console.log('World mapping stopped for session:', event.sessionId);
        break;
      case 'mapSaved':
        console.log('World map saved:', event.data.mapId);
        break;
      case 'mapLoaded':
        console.log('World map loaded:', event.data.mapId);
        break;
    }
  }

  // Start AR session
  async startSession(sessionId: string, config?: Partial<ARServiceConfig>): Promise<boolean> {
    try {
      // Check session limits
      if (this.activeSessions.size >= this.sessionConfig.maxConcurrentSessions!) {
        throw new Error('Maximum concurrent sessions reached');
      }

      // Create session
      const sessionConfig = { ...this.sessionConfig, ...config };
      const session: ARSession = {
        id: sessionId,
        status: 'initializing',
        config: sessionConfig,
        startTime: Date.now(),
        lastUpdate: Date.now(),
      };

      this.activeSessions.set(sessionId, session);

      // Start native AR session
      const platform = Platform.OS;
      let success = false;

      if (platform === 'ios') {
        success = await NativeModules.ARBridge.startARSession(sessionId, sessionConfig);
      } else if (platform === 'android') {
        success = await NativeModules.ARBridge.startARSession(sessionId, sessionConfig);
      } else {
        // Web fallback
        success = this.startWebARSession(sessionId, sessionConfig);
      }

      if (!success) {
        this.activeSessions.delete(sessionId);
        throw new Error('Failed to start AR session');
      }

      // Start world mapping if enabled
      if (sessionConfig.enableWorldMapping && this.worldMapManager) {
        const mapId = `session_${sessionId}_${Date.now()}`;
        await this.worldMapManager.startRecording(null, `Session ${sessionId}`);
      }

      session.status = 'running';
      session.lastUpdate = Date.now();

      console.log('AR session started:', sessionId);
      return true;
    } catch (error) {
      console.error('Failed to start AR session:', error);
      this.activeSessions.delete(sessionId);
      return false;
    }
  }

  // Stop AR session
  async stopSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Stop world mapping if active
      if (this.worldMapManager && session.config.enableWorldMapping) {
        const recordingStatus = this.worldMapManager.getRecordingStatus();
        if (recordingStatus.isRecording) {
          await this.worldMapManager.stopRecording(null);
        }
      }

      // Stop native AR session
      const platform = Platform.OS;
      let success = false;

      if (platform === 'ios') {
        success = await NativeModules.ARBridge.stopARSession(sessionId);
      } else if (platform === 'android') {
        success = await NativeModules.ARBridge.stopARSession(sessionId);
      } else {
        // Web fallback
        success = this.stopWebARSession(sessionId);
      }

      if (success) {
        session.status = 'stopped';
        session.lastUpdate = Date.now();
      }

      console.log('AR session stopped:', sessionId);
      return success;
    } catch (error) {
      console.error('Failed to stop AR session:', error);
      return false;
    }
  }

  // Pause AR session
  async pauseSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return false;
      }

      const platform = Platform.OS;
      let success = false;

      if (platform === 'ios') {
        success = await NativeModules.ARBridge.pauseARSession(sessionId);
      } else if (platform === 'android') {
        success = await NativeModules.ARBridge.pauseARSession(sessionId);
      }

      if (success) {
        session.status = 'paused';
        session.lastUpdate = Date.now();
      }

      return success;
    } catch (error) {
      console.error('Failed to pause AR session:', error);
      return false;
    }
  }

  // Resume AR session
  async resumeSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        return false;
      }

      const platform = Platform.OS;
      let success = false;

      if (platform === 'ios') {
        success = await NativeModules.ARBridge.resumeARSession(sessionId);
      } else if (platform === 'android') {
        success = await NativeModules.ARBridge.resumeARSession(sessionId);
      }

      if (success) {
        session.status = 'running';
        session.lastUpdate = Date.now();
      }

      return success;
    } catch (error) {
      console.error('Failed to resume AR session:', error);
      return false;
    }
  }

  // Get session status
  getSession(sessionId: string): ARSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  // Get all active sessions
  getAllSessions(): ARSession[] {
    return Array.from(this.activeSessions.values());
  }

  // Start world mapping for a session
  async startWorldMapping(sessionId: string, mapName?: string): Promise<string | null> {
    if (!this.worldMapManager) {
      throw new Error('World mapping not enabled');
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const mapId = await this.worldMapManager.startRecording(null, mapName || `Map ${sessionId}`);
    
    // Update session metadata
    session.metadata = {
      ...session.metadata,
      worldMapId: mapId,
      worldMappingStarted: Date.now(),
    };

    return mapId;
  }

  // Stop world mapping for a session
  async stopWorldMapping(sessionId: string): Promise<any> {
    if (!this.worldMapManager) {
      throw new Error('World mapping not enabled');
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const worldMapData = await this.worldMapManager.stopRecording(null);
    
    // Update session metadata
    session.metadata = {
      ...session.metadata,
      worldMappingStopped: Date.now(),
      worldMapData,
    };

    return worldMapData;
  }

  // Save world map
  async saveWorldMap(sessionId: string, metadata?: any): Promise<boolean> {
    if (!this.worldMapManager || !this.worldMapStorage) {
      return false;
    }

    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return false;
    }

    try {
      // Get current world map data
      const recordingStatus = this.worldMapManager.getRecordingStatus();
      if (!recordingStatus.currentMapId) {
        return false;
      }

      const worldMapData = await this.worldMapManager.stopRecording(null);
      
      // Save to storage
      const success = await this.worldMapStorage.saveWorldMap(
        recordingStatus.currentMapId,
        worldMapData.mapData,
        {
          ...metadata,
          sessionId,
          name: metadata?.name || `Session ${sessionId}`,
          duration: worldMapData.duration,
          annotationCount: worldMapData.annotationCount,
        }
      );

      return success;
    } catch (error) {
      console.error('Failed to save world map:', error);
      return false;
    }
  }

  // Load world map
  async loadWorldMap(mapId: string, sessionId: string): Promise<boolean> {
    if (!this.worldMapStorage) {
      return false;
    }

    try {
      const worldMapData = await this.worldMapStorage.loadWorldMap(mapId);
      if (!worldMapData) {
        return false;
      }

      // Load world map in native AR session
      const platform = Platform.OS;
      let success = false;

      if (platform === 'ios') {
        success = await NativeModules.ARBridge.loadWorldMap(sessionId, worldMapData.data);
      } else if (platform === 'android') {
        success = await NativeModules.ARBridge.loadWorldMap(sessionId, worldMapData.data);
      }

      if (success) {
        // Update session metadata
        const session = this.activeSessions.get(sessionId);
        if (session) {
          session.metadata = {
            ...session.metadata,
            loadedWorldMapId: mapId,
            worldMapLoaded: Date.now(),
          };
        }
      }

      return success;
    } catch (error) {
      console.error('Failed to load world map:', error);
      return false;
    }
  }

  // Get world map manager
  getWorldMapManager(): WorldMapManager | null {
    return this.worldMapManager;
  }

  // Get world map storage
  getWorldMapStorage(): WorldMapStorage | null {
    return this.worldMapStorage;
  }

  // Get tracking quality
  async getTrackingQuality(sessionId: string): Promise<'limited' | 'normal'> {
    try {
      const platform = Platform.OS;
      
      if (platform === 'ios') {
        return await NativeModules.ARBridge.getTrackingQuality(sessionId);
      } else if (platform === 'android') {
        return await NativeModules.ARBridge.getTrackingQuality(sessionId);
      } else {
        return 'normal'; // Web fallback
      }
    } catch (error) {
      console.error('Failed to get tracking quality:', error);
      return 'limited';
    }
  }

  // Add event listener
  addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  // Remove event listener
  removeEventListener(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  // Emit event
  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in AR event listener:', error);
        }
      });
    }
  }

  // Clean up expired sessions
  cleanupExpiredSessions(): void {
    const now = Date.now();
    const timeout = this.sessionConfig.sessionTimeout!;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastUpdate > timeout) {
        this.stopSession(sessionId).catch(error => {
          console.error('Failed to cleanup expired session:', error);
        });
        this.activeSessions.delete(sessionId);
      }
    }
  }

  // Web AR session implementation
  private startWebARSession(sessionId: string, config: ARServiceConfig): boolean {
    // Simplified Web AR implementation
    console.log('Starting Web AR session:', sessionId, config);
    return true;
  }

  private stopWebARSession(sessionId: string): boolean {
    // Simplified Web AR implementation
    console.log('Stopping Web AR session:', sessionId);
    return true;
  }

  // Update session configuration
  updateConfig(config: Partial<ARServiceConfig>): void {
    this.sessionConfig = { ...this.sessionConfig, ...config };
  }

  // Get current configuration
  getConfig(): ARServiceConfig {
    return { ...this.sessionConfig };
  }

  // Clean up all resources
  cleanup(): void {
    // Stop all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      this.stopSession(sessionId).catch(error => {
        console.error('Failed to stop session during cleanup:', error);
      });
    }
    this.activeSessions.clear();

    // Clean up event listeners
    this.eventListeners.clear();
  }
}

export default ARService;