// AR world map native module for iOS
import React from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { ARWorldMapManager } = NativeModules;

// Types for ARWorldMapManager
export interface ARWorldMapStatus {
  isAvailable: boolean;
  isSupported: boolean;
  currentMap?: string;
}

export interface WorldMapEvent {
  type: 'mappingStarted' | 'mappingStopped' | 'mappingFailed' | 'mapSaved' | 'mapLoaded';
  mapId?: string;
  error?: string;
  data?: any;
}

class ARWorldMapBridge {
  private eventEmitter: NativeEventEmitter;
  private listeners: Map<string, any[]> = new Map();

  constructor() {
    if (Platform.OS !== 'ios' || !ARWorldMapManager) {
      throw new Error('ARWorldMapManager is not available on this platform');
    }

    this.eventEmitter = new NativeEventEmitter(ARWorldMapManager);
    this.setupEventListeners();
  }

  // Check if world mapping is available
  async isWorldMappingAvailable(): Promise<boolean> {
    try {
      return await ARWorldMapManager.isWorldMappingAvailable();
    } catch (error) {
      console.error('Failed to check world mapping availability:', error);
      return false;
    }
  }

  // Get current world map status
  async getStatus(): Promise<ARWorldMapStatus> {
    try {
      return await ARWorldMapManager.getStatus();
    } catch (error) {
      console.error('Failed to get world map status:', error);
      return {
        isAvailable: false,
        isSupported: false,
      };
    }
  }

  // Start recording world map
  async startRecording(mapId: string): Promise<boolean> {
    try {
      return await ARWorldMapManager.startRecording(mapId);
    } catch (error) {
      console.error('Failed to start world map recording:', error);
      return false;
    }
  }

  // Stop recording world map
  async stopRecording(): Promise<boolean> {
    try {
      return await ARWorldMapManager.stopRecording();
    } catch (error) {
      console.error('Failed to stop world map recording:', error);
      return false;
    }
  }

  // Get current world map data
  async getCurrentWorldMap(): Promise<any> {
    try {
      return await ARWorldMapManager.getCurrentWorldMap();
    } catch (error) {
      console.error('Failed to get current world map:', error);
      return null;
    }
  }

  // Load world map
  async loadWorldMap(worldMapData: any): Promise<boolean> {
    try {
      return await ARWorldMapManager.loadWorldMap(worldMapData);
    } catch (error) {
      console.error('Failed to load world map:', error);
      return false;
    }
  }

  // Save world map to persistent storage
  async saveWorldMap(mapId: string, worldMapData: any): Promise<boolean> {
    try {
      return await ARWorldMapManager.saveWorldMap(mapId, worldMapData);
    } catch (error) {
      console.error('Failed to save world map:', error);
      return false;
    }
  }

  // Delete world map
  async deleteWorldMap(mapId: string): Promise<boolean> {
    try {
      return await ARWorldMapManager.deleteWorldMap(mapId);
    } catch (error) {
      console.error('Failed to delete world map:', error);
      return false;
    }
  }

  // Get all saved world maps
  async getAllWorldMaps(): Promise<any[]> {
    try {
      return await ARWorldMapManager.getAllWorldMaps();
    } catch (error) {
      console.error('Failed to get all world maps:', error);
      return [];
    }
  }

  // Get world map quality metrics
  async getWorldMapQuality(): Promise<{
    trackingQuality: 'limited' | 'normal';
    trackingState: 'notAvailable' | 'limited' | 'normal';
    featureCount: number;
  }> {
    try {
      return await ARWorldMapManager.getWorldMapQuality();
    } catch (error) {
      console.error('Failed to get world map quality:', error);
      return {
        trackingQuality: 'limited',
        trackingState: 'notAvailable',
        featureCount: 0,
      };
    }
  }

  // Reset world mapping
  async resetWorldMapping(): Promise<boolean> {
    try {
      return await ARWorldMapManager.resetWorldMapping();
    } catch (error) {
      console.error('Failed to reset world mapping:', error);
      return false;
    }
  }

  // Set up event listeners
  private setupEventListeners(): void {
    // Listen for world map events
    this.eventEmitter.addListener('onWorldMapEvent', (event: WorldMapEvent) => {
      this.emit(event.type, event);
    });

    // Listen for tracking state changes
    this.eventEmitter.addListener('onTrackingStateChanged', (event: any) => {
      this.emit('trackingStateChanged', event);
    });

    // Listen for mapping progress updates
    this.eventEmitter.addListener('onMappingProgress', (event: any) => {
      this.emit('mappingProgress', event);
    });
  }

  // Event emitter methods
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Clean up all listeners
  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export default ARWorldMapBridge;