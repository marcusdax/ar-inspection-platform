import { NativeModules, Platform, NativeEventEmitter } from 'react-native';

interface ARAnchor {
  id: string;
  transform: number[]; // 4x4 matrix
  type: 'plane' | 'image' | 'object' | 'face';
  persistenceKey?: string;
}

interface ARPlane {
  id: string;
  center: { x: number; y: number; z: number };
  extent: { width: number; height: number };
  alignment: 'horizontal' | 'vertical' | 'unknown';
  vertices: Array<{ x: number; y: number; z: number }>;
}

interface ARFrame {
  timestamp: number;
  cameraTransform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
  };
  lightEstimate: {
    ambientIntensity: number;
    ambientColorTemperature: number;
    directionalIntensity: number;
  };
}

class ARSceneManager {
  private isInitialized = false;
  private isRunning = false;
  private anchors: Map<string, ARAnchor> = new Map();
  private planes: Map<string, ARPlane> = new Map();
  private eventEmitter: NativeEventEmitter;
  
  constructor() {
    if (Platform.OS === 'ios') {
      this.eventEmitter = new NativeEventEmitter(NativeModules.ARKitManager);
    } else if (Platform.OS === 'android') {
      this.eventEmitter = new NativeEventEmitter(NativeModules.ARCoreManager);
    }
    
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // Plane detection events
    this.eventEmitter.addListener('onPlaneDetected', (plane: ARPlane) => {
      this.planes.set(plane.id, plane);
      console.log(`Plane detected: ${plane.id}`);
      this.emit('planeDetected', plane);
    });
    
    this.eventEmitter.addListener('onPlaneUpdated', (plane: ARPlane) => {
      this.planes.set(plane.id, plane);
      console.log(`Plane updated: ${plane.id}`);
      this.emit('planeUpdated', plane);
    });
    
    this.eventEmitter.addListener('onPlaneRemoved', (planeId: string) => {
      this.planes.delete(planeId);
      console.log(`Plane removed: ${planeId}`);
      this.emit('planeRemoved', planeId);
    });
    
    // Anchor events
    this.eventEmitter.addListener('onAnchorAdded', (anchor: ARAnchor) => {
      this.anchors.set(anchor.id, anchor);
      console.log(`Anchor added: ${anchor.id}`);
      this.emit('anchorAdded', anchor);
    });
    
    this.eventEmitter.addListener('onAnchorUpdated', (anchor: ARAnchor) => {
      this.anchors.set(anchor.id, anchor);
      console.log(`Anchor updated: ${anchor.id}`);
      this.emit('anchorUpdated', anchor);
    });
    
    this.eventEmitter.addListener('onAnchorRemoved', (anchorId: string) => {
      this.anchors.delete(anchorId);
      console.log(`Anchor removed: ${anchorId}`);
      this.emit('anchorRemoved', anchorId);
    });
    
    // AR session events
    this.eventEmitter.addListener('onSessionInterrupted', () => {
      this.isRunning = false;
      console.warn('AR session interrupted');
      this.emit('sessionInterrupted');
    });
    
    this.eventEmitter.addListener('onSessionResumed', () => {
      this.isRunning = true;
      console.log('AR session resumed');
      this.emit('sessionResumed');
    });
    
    this.eventEmitter.addListener('onTrackingQualityChanged', (quality: string) => {
      console.log(`Tracking quality changed to: ${quality}`);
      this.emit('trackingQualityChanged', quality);
    });
    
    this.eventEmitter.addListener('onARFrameUpdate', (frame: ARFrame) => {
      this.emit('frameUpdate', frame);
    });
  }
  
  async initialize(config: {
    planeDetection: boolean;
    lightEstimation: boolean;
    worldAlignment: 'gravity' | 'gravityAndHeading' | 'camera';
  }): Promise<boolean> {
    if (this.isInitialized) {
      console.log('ARSceneManager already initialized');
      return true;
    }
    
    try {
      if (Platform.OS === 'ios') {
        await NativeModules.ARKitManager.initialize(config);
      } else if (Platform.OS === 'android') {
        await NativeModules.ARCoreManager.initialize(config);
      } else {
        throw new Error('AR not supported on this platform');
      }
      
      this.isInitialized = true;
      console.log('ARSceneManager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize ARSceneManager:', error);
      this.isInitialized = false;
      return false;
    }
  }
  
  async startSession(): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('ARSceneManager not initialized');
    }
    
    if (this.isRunning) {
      console.log('AR session already running');
      return true;
    }
    
    try {
      if (Platform.OS === 'ios') {
        await NativeModules.ARKitManager.startSession();
      } else if (Platform.OS === 'android') {
        await NativeModules.ARCoreManager.startSession();
      }
      
      this.isRunning = true;
      console.log('AR session started');
      return true;
    } catch (error) {
      console.error('Failed to start AR session:', error);
      return false;
    }
  }
  
  async pauseSession(): Promise<void> {
    if (!this.isInitialized || !this.isRunning) {
      return;
    }
    
    try {
      if (Platform.OS === 'ios') {
        await NativeModules.ARKitManager.pauseSession();
      } else if (Platform.OS === 'android') {
        await NativeModules.ARCoreManager.pauseSession();
      }
      
      console.log('AR session paused');
    } catch (error) {
      console.error('Failed to pause AR session:', error);
    }
  }
  
  async resumeSession(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    try {
      if (Platform.OS === 'ios') {
        await NativeModules.ARKitManager.resumeSession();
      } else if (Platform.OS === 'android') {
        await NativeModules.ARCoreManager.resumeSession();
      }
      
      this.isRunning = true;
      console.log('AR session resumed');
    } catch (error) {
      console.error('Failed to resume AR session:', error);
    }
  }
  
  async stopSession(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    try {
      if (Platform.OS === 'ios') {
        await NativeModules.ARKitManager.stopSession();
      } else if (Platform.OS === 'android') {
        await NativeModules.ARCoreManager.stopSession();
      }
      
      this.isRunning = false;
      this.anchors.clear();
      this.planes.clear();
      console.log('AR session stopped');
    } catch (error) {
      console.error('Failed to stop AR session:', error);
    }
  }
  
  async performHitTest(
    screenPoint: { x: number; y: number },
    type: 'existingPlane' | 'estimatedHorizontalPlane' | 'estimatedVerticalPlane' | 'featurePoint' = 'existingPlane'
  ): Promise<Array<{
    position: { x: number; y: number; z: number };
    distance: number;
    planeId?: string;
    transform: number[];
  }>> {
    if (!this.isInitialized || !this.isRunning) {
      return [];
    }
    
    try {
      if (Platform.OS === 'ios') {
        return await NativeModules.ARKitManager.hitTest(screenPoint.x, screenPoint.y, type);
      } else if (Platform.OS === 'android') {
        return await NativeModules.ARCoreManager.hitTest(screenPoint.x, screenPoint.y);
      }
      
      return [];
    } catch (error) {
      console.error('Hit test failed:', error);
      return [];
    }
  }
  
  async createAnchor(position: { x: number; y: number; z: number }): Promise<string | null> {
    if (!this.isInitialized || !this.isRunning) {
      throw new Error('AR session not running');
    }
    
    try {
      let anchorId: string;
      
      if (Platform.OS === 'ios') {
        anchorId = await NativeModules.ARKitManager.createAnchor(position);
      } else if (Platform.OS === 'android') {
        anchorId = await NativeModules.ARCoreManager.createAnchor(position);
      }
      
      if (anchorId) {
        const anchor: ARAnchor = {
          id: anchorId,
          transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Identity matrix
          type: 'plane'
        };
        
        this.anchors.set(anchorId, anchor);
        return anchorId;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to create anchor:', error);
      return null;
    }
  }
  
  async removeAnchor(anchorId: string): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    try {
      if (Platform.OS === 'ios') {
        await NativeModules.ARKitManager.removeAnchor(anchorId);
      } else if (Platform.OS === 'android') {
        await NativeModules.ARCoreManager.removeAnchor(anchorId);
      }
      
      this.anchors.delete(anchorId);
      console.log(`Anchor removed: ${anchorId}`);
    } catch (error) {
      console.error('Failed to remove anchor:', error);
    }
  }
  
  async saveWorldMap(): Promise<string | null> {
    if (!this.isInitialized || !this.isRunning) {
      return null;
    }
    
    try {
      let worldMapData: string;
      
      if (Platform.OS === 'ios') {
        worldMapData = await NativeModules.ARKitManager.saveWorldMap();
      } else if (Platform.OS === 'android') {
        worldMapData = await NativeModules.ARCoreManager.saveCloudAnchor();
      }
      
      console.log('World map saved');
      return worldMapData;
    } catch (error) {
      console.error('Failed to save world map:', error);
      return null;
    }
  }
  
  async loadWorldMap(worldMapData: string): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }
    
    try {
      let success: boolean;
      
      if (Platform.OS === 'ios') {
        success = await NativeModules.ARKitManager.loadWorldMap(worldMapData);
      } else if (Platform.OS === 'android') {
        success = await NativeModules.ARCoreManager.loadCloudAnchor(worldMapData);
      }
      
      if (success) {
        console.log('World map loaded successfully');
      }
      
      return success;
    } catch (error) {
      console.error('Failed to load world map:', error);
      return false;
    }
  }
  
  // Camera and session state
  async getCameraTransform(): Promise<{
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
  }> {
    if (!this.isInitialized || !this.isRunning) {
      throw new Error('AR session not running');
    }
    
    try {
      if (Platform.OS === 'ios') {
        return await NativeModules.ARKitManager.getCameraTransform();
      } else if (Platform.OS === 'android') {
        return await NativeModules.ARCoreManager.getCameraTransform();
      }
      
      return {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 }
      };
    } catch (error) {
      console.error('Failed to get camera transform:', error);
      throw error;
    }
  }
  
  async captureARFrame(): Promise<{
    image: string; // base64 encoded
    depthMap?: string; // base64 encoded depth data
    cameraTransform: number[];
    timestamp: number;
  }> {
    if (!this.isInitialized || !this.isRunning) {
      throw new Error('AR session not running');
    }
    
    try {
      if (Platform.OS === 'ios') {
        return await NativeModules.ARKitManager.captureFrame();
      } else if (Platform.OS === 'android') {
        return await NativeModules.ARCoreManager.captureFrame();
      }
      
      throw new Error('AR frame capture not supported on this platform');
    } catch (error) {
      console.error('Failed to capture AR frame:', error);
      throw error;
    }
  }
  
  // Utility methods
  getPlanes(): ARPlane[] {
    return Array.from(this.planes.values());
  }
  
  getAnchors(): ARAnchor[] {
    return Array.from(this.anchors.values());
  }
  
  isSessionRunning(): boolean {
    return this.isRunning;
  }
  
  isSessionInitialized(): boolean {
    return this.isInitialized;
  }
  
  // Event handling
  private listeners: Map<string, Function[]> = new Map();
  
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  off(event: string, callback?: Function): void {
    if (!this.listeners.has(event)) return;
    
    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }
  
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }
  
  cleanup(): void {
    this.listeners.clear();
    this.anchors.clear();
    this.planes.clear();
    
    if (this.isRunning) {
      this.stopSession();
    }
    
    this.isInitialized = false;
    this.isRunning = false;
  }
}

export default ARSceneManager;