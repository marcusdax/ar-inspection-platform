// AR World Map persistence for maintaining AR experiences across app sessions
import AsyncStorage from '@react-native-async-storage/async-storage';
import ARInterface from './ARInterface';

export interface WorldMapData {
  id: string;
  name: string;
  created: number;
  updated: number;
  duration: number;
  annotationCount: number;
  mapData?: any; // ARKit/ARCore world map data
  thumbnail?: string;
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  metadata?: {
    [key: string]: any;
  };
}

export interface WorldMapOptions {
  maxMaps?: number;
  enableLocation?: boolean;
  compressionQuality?: number;
  autoSave?: boolean;
  retentionDays?: number;
}

class WorldMapManager {
  private currentMapId: string | null = null;
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private options: WorldMapOptions;

  constructor(options: WorldMapOptions = {}) {
    this.options = {
      maxMaps: options.maxMaps || 10,
      enableLocation: options.enableLocation || false,
      compressionQuality: options.compressionQuality || 0.8,
      autoSave: options.autoSave || true,
      retentionDays: options.retentionDays || 30,
      ...options,
    };
  }

  // Get current world map from AR session
  async getCurrentWorldMap(arInterface: ARInterface): Promise<any> {
    try {
      const platform = Platform.OS;
      
      if (platform === 'ios') {
        // Get ARKit world map
        return await NativeModules.ARWorldMapManager.getCurrentWorldMap();
      } else if (platform === 'android') {
        // Get ARCore anchor data
        return await NativeModules.ARCoreManager.getWorldMap();
      } else {
        // Web fallback - return scene state
        return await arInterface.exportSceneState();
      }
    } catch (error) {
      console.error('Failed to get current world map:', error);
      throw error;
    }
  }

  // Start recording a world map
  async startRecording(arInterface: ARInterface, name: string): Promise<string> {
    try {
      if (this.isRecording) {
        throw new Error('Already recording a world map');
      }

      const mapId = this.generateMapId();
      this.currentMapId = mapId;
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      // Initialize world map data
      const worldMapData: WorldMapData = {
        id: mapId,
        name: name || `Map ${new Date().toISOString()}`,
        created: Date.now(),
        updated: Date.now(),
        duration: 0,
        annotationCount: 0,
      };

      // Add location if enabled
      if (this.options.enableLocation) {
        try {
          const location = await this.getCurrentLocation();
          if (location) {
            worldMapData.location = location;
          }
        } catch (error) {
          console.warn('Failed to get location:', error);
        }
      }

      // Start AR session recording if supported
      const platform = Platform.OS;
      if (platform === 'ios') {
        await NativeModules.ARWorldMapManager.startRecording(mapId);
      } else if (platform === 'android') {
        await NativeModules.ARCoreManager.startWorldMapping(mapId);
      }

      // Save initial map data
      await this.saveWorldMap(worldMapData);

      console.log('Started recording world map:', mapId);
      return mapId;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.isRecording = false;
      this.currentMapId = null;
      throw error;
    }
  }

  // Stop recording and save world map
  async stopRecording(arInterface: ARInterface): Promise<WorldMapData> {
    try {
      if (!this.isRecording || !this.currentMapId) {
        throw new Error('Not currently recording');
      }

      const duration = Date.now() - this.recordingStartTime;
      
      // Get final world map data
      const mapData = await this.getCurrentWorldMap(arInterface);
      
      // Get current annotations
      const annotations = await arInterface.getAllAnnotations();
      
      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(arInterface);

      // Update world map data
      const worldMapData: WorldMapData = {
        id: this.currentMapId,
        name: `Map ${new Date().toISOString()}`,
        created: Date.now() - duration,
        updated: Date.now(),
        duration: duration,
        annotationCount: annotations.length,
        mapData: mapData,
        thumbnail: thumbnail,
      };

      // Stop AR session recording
      const platform = Platform.OS;
      if (platform === 'ios') {
        await NativeModules.ARWorldMapManager.stopRecording();
      } else if (platform === 'android') {
        await NativeModules.ARCoreManager.stopWorldMapping();
      }

      // Save final world map
      await this.saveWorldMap(worldMapData);

      // Clean up old maps if needed
      await this.cleanupOldMaps();

      // Reset recording state
      this.isRecording = false;
      const savedMapId = this.currentMapId;
      this.currentMapId = null;

      console.log('Stopped recording world map:', savedMapId);
      return worldMapData;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  // Load and restore a world map
  async loadWorldMap(mapId: string, arInterface: ARInterface): Promise<boolean> {
    try {
      const worldMapData = await this.getWorldMap(mapId);
      if (!worldMapData || !worldMapData.mapData) {
        throw new Error('World map not found or invalid');
      }

      const platform = Platform.OS;
      
      if (platform === 'ios') {
        // Restore ARKit world map
        const success = await NativeModules.ARWorldMapManager.loadWorldMap(
          worldMapData.mapData
        );
        
        if (success) {
          // Restore annotations
          await this.restoreAnnotations(worldMapData, arInterface);
        }
        
        return success;
      } else if (platform === 'android') {
        // Restore ARCore anchors
        const success = await NativeModules.ARCoreManager.loadWorldMap(
          worldMapData.mapData
        );
        
        if (success) {
          // Restore annotations
          await this.restoreAnnotations(worldMapData, arInterface);
        }
        
        return success;
      } else {
        // Web fallback - restore scene state
        return await arInterface.importSceneState(worldMapData.mapData);
      }
    } catch (error) {
      console.error('Failed to load world map:', error);
      return false;
    }
  }

  // Save world map to storage
  private async saveWorldMap(worldMapData: WorldMapData): Promise<void> {
    try {
      const key = `worldmap_${worldMapData.id}`;
      const value = JSON.stringify(worldMapData);
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Failed to save world map:', error);
      throw error;
    }
  }

  // Get world map from storage
  async getWorldMap(mapId: string): Promise<WorldMapData | null> {
    try {
      const key = `worldmap_${mapId}`;
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Failed to get world map:', error);
      return null;
    }
  }

  // Get all saved world maps
  async getAllWorldMaps(): Promise<WorldMapData[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const mapKeys = keys.filter(key => key.startsWith('worldmap_'));
      
      const maps: WorldMapData[] = [];
      for (const key of mapKeys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const mapData = JSON.parse(value);
            maps.push(mapData);
          }
        } catch (error) {
          console.warn('Failed to parse world map:', key, error);
        }
      }

      // Sort by updated date (newest first)
      return maps.sort((a, b) => b.updated - a.updated);
    } catch (error) {
      console.error('Failed to get all world maps:', error);
      return [];
    }
  }

  // Delete a world map
  async deleteWorldMap(mapId: string): Promise<boolean> {
    try {
      const key = `worldmap_${mapId}`;
      await AsyncStorage.removeItem(key);
      console.log('Deleted world map:', mapId);
      return true;
    } catch (error) {
      console.error('Failed to delete world map:', error);
      return false;
    }
  }

  // Update world map metadata
  async updateWorldMapMetadata(
    mapId: string,
    metadata: Partial<WorldMapData>
  ): Promise<boolean> {
    try {
      const worldMapData = await this.getWorldMap(mapId);
      if (!worldMapData) {
        return false;
      }

      const updatedData = {
        ...worldMapData,
        ...metadata,
        updated: Date.now(),
      };

      await this.saveWorldMap(updatedData);
      return true;
    } catch (error) {
      console.error('Failed to update world map metadata:', error);
      return false;
    }
  }

  // Clean up old maps based on retention policy
  private async cleanupOldMaps(): Promise<void> {
    try {
      const maps = await this.getAllWorldMaps();
      
      // Remove maps older than retention period
      const retentionMs = this.options.retentionDays! * 24 * 60 * 60 * 1000;
      const now = Date.now();
      
      for (const map of maps) {
        if (now - map.updated > retentionMs) {
          await this.deleteWorldMap(map.id);
        }
      }

      // Keep only the most recent maps if exceeding maxMaps
      if (maps.length > this.options.maxMaps!) {
        const mapsToDelete = maps
          .sort((a, b) => b.updated - a.updated)
          .slice(this.options.maxMaps!);
        
        for (const map of mapsToDelete) {
          await this.deleteWorldMap(map.id);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old maps:', error);
    }
  }

  // Generate thumbnail from current AR view
  private async generateThumbnail(arInterface: ARInterface): Promise<string | undefined> {
    try {
      // Capture screenshot from AR view
      const screenshot = await arInterface.captureScreenshot();
      
      if (screenshot) {
        // Compress and convert to base64 thumbnail
        return await this.compressImage(screenshot);
      }
    } catch (error) {
      console.warn('Failed to generate thumbnail:', error);
    }
    return undefined;
  }

  // Compress image for thumbnail
  private async compressImage(imageData: string): Promise<string> {
    try {
      // Simple base64 compression (in a real app, use image compression library)
      const maxSize = 200; // Max thumbnail dimension
      const quality = this.options.compressionQuality || 0.8;
      
      // This is a simplified implementation
      // In production, use proper image compression
      return imageData;
    } catch (error) {
      console.error('Failed to compress image:', error);
      return imageData;
    }
  }

  // Restore annotations from world map
  private async restoreAnnotations(
    worldMapData: WorldMapData,
    arInterface: ARInterface
  ): Promise<void> {
    try {
      // This would restore annotations that were saved with the world map
      // Implementation depends on how annotations are stored
      console.log('Restoring annotations for map:', worldMapData.id);
    } catch (error) {
      console.error('Failed to restore annotations:', error);
    }
  }

  // Get current location
  private async getCurrentLocation(): Promise<any> {
    return new Promise((resolve, reject) => {
      // In a real implementation, use geolocation API
      resolve({
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 0,
      });
    });
  }

  // Generate unique map ID
  private generateMapId(): string {
    return `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get recording status
  getRecordingStatus(): {
    isRecording: boolean;
    currentMapId: string | null;
    duration: number;
  } {
    const duration = this.isRecording 
      ? Date.now() - this.recordingStartTime 
      : 0;
      
    return {
      isRecording: this.isRecording,
      currentMapId: this.currentMapId,
      duration: duration,
    };
  }

  // Export world map for sharing
  async exportWorldMap(mapId: string): Promise<string | null> {
    try {
      const worldMapData = await this.getWorldMap(mapId);
      if (!worldMapData) {
        return null;
      }

      // Create export package
      const exportData = {
        version: '1.0',
        mapData: worldMapData,
        exported: Date.now(),
      };

      return JSON.stringify(exportData);
    } catch (error) {
      console.error('Failed to export world map:', error);
      return null;
    }
  }

  // Import world map from shared data
  async importWorldMap(exportData: string): Promise<string | null> {
    try {
      const importData = JSON.parse(exportData);
      
      if (!importData.version || !importData.mapData) {
        throw new Error('Invalid world map export data');
      }

      // Generate new ID for imported map
      const newMapId = this.generateMapId();
      const worldMapData = {
        ...importData.mapData,
        id: newMapId,
        name: `Imported: ${importData.mapData.name}`,
        updated: Date.now(),
      };

      await this.saveWorldMap(worldMapData);
      return newMapId;
    } catch (error) {
      console.error('Failed to import world map:', error);
      return null;
    }
  }
}

export default WorldMapManager;