// Service for managing world map persistence across app sessions
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface WorldMapMetadata {
  id: string;
  name: string;
  description?: string;
  created: number;
  lastAccessed: number;
  duration: number;
  annotationCount: number;
  file_size: number;
  version: string;
  platform: 'ios' | 'android' | 'web';
  tracking_quality: 'excellent' | 'good' | 'limited' | 'poor';
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  environment_type?: 'indoor' | 'outdoor' | 'mixed';
  lighting_conditions?: 'bright' | 'normal' | 'dim' | 'dark';
}

export interface WorldMapStorageOptions {
  maxStorageSize?: number; // MB
  maxMapsCount?: number;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
  autoBackup?: boolean;
  retentionDays?: number;
}

class WorldMapStorage {
  private static instance: WorldMapStorage;
  private options: WorldMapStorageOptions;

  constructor(options: WorldMapStorageOptions = {}) {
    this.options = {
      maxStorageSize: options.maxStorageSize || 500, // 500MB
      maxMapsCount: options.maxMapsCount || 50,
      compressionEnabled: options.compressionEnabled !== false,
      encryptionEnabled: options.encryptionEnabled || false,
      autoBackup: options.autoBackup || false,
      retentionDays: options.retentionDays || 90,
      ...options,
    };
  }

  static getInstance(options?: WorldMapStorageOptions): WorldMapStorage {
    if (!WorldMapStorage.instance) {
      WorldMapStorage.instance = new WorldMapStorage(options);
    }
    return WorldMapStorage.instance;
  }

  // Save world map to persistent storage
  async saveWorldMap(
    mapId: string,
    mapData: any,
    metadata: Partial<WorldMapMetadata>
  ): Promise<boolean> {
    try {
      // Create full metadata
      const fullMetadata: WorldMapMetadata = {
        id: mapId,
        name: metadata.name || `Map ${new Date().toISOString()}`,
        description: metadata.description,
        created: metadata.created || Date.now(),
        lastAccessed: Date.now(),
        duration: metadata.duration || 0,
        annotationCount: metadata.annotationCount || 0,
        file_size: this.calculateDataSize(mapData),
        version: '1.0',
        platform: Platform.OS as 'ios' | 'android' | 'web',
        tracking_quality: metadata.tracking_quality || 'good',
        location: metadata.location,
        environment_type: metadata.environment_type,
        lighting_conditions: metadata.lighting_conditions,
      };

      // Process map data
      const processedData = await this.processMapData(mapData);

      // Save to storage
      const storageKey = `worldmap_${mapId}`;
      const metadataKey = `worldmap_meta_${mapId}`;

      await Promise.all([
        AsyncStorage.setItem(storageKey, JSON.stringify(processedData)),
        AsyncStorage.setItem(metadataKey, JSON.stringify(fullMetadata)),
      ]);

      // Update storage index
      await this.updateStorageIndex(mapId, fullMetadata);

      // Clean up if needed
      await this.enforceStorageLimits();

      console.log('World map saved:', mapId);
      return true;
    } catch (error) {
      console.error('Failed to save world map:', error);
      return false;
    }
  }

  // Load world map from storage
  async loadWorldMap(mapId: string): Promise<{
    data: any;
    metadata: WorldMapMetadata;
  } | null> {
    try {
      const storageKey = `worldmap_${mapId}`;
      const metadataKey = `worldmap_meta_${mapId}`;

      const [dataStr, metadataStr] = await Promise.all([
        AsyncStorage.getItem(storageKey),
        AsyncStorage.getItem(metadataKey),
      ]);

      if (!dataStr || !metadataStr) {
        return null;
      }

      // Process loaded data
      const data = await this.processLoadedData(JSON.parse(dataStr));
      const metadata: WorldMapMetadata = JSON.parse(metadataStr);

      // Update last accessed
      metadata.lastAccessed = Date.now();
      await AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));

      console.log('World map loaded:', mapId);
      return { data, metadata };
    } catch (error) {
      console.error('Failed to load world map:', error);
      return null;
    }
  }

  // Delete world map from storage
  async deleteWorldMap(mapId: string): Promise<boolean> {
    try {
      const storageKey = `worldmap_${mapId}`;
      const metadataKey = `worldmap_meta_${mapId}`;

      await Promise.all([
        AsyncStorage.removeItem(storageKey),
        AsyncStorage.removeItem(metadataKey),
      ]);

      // Remove from storage index
      await this.removeFromStorageIndex(mapId);

      console.log('World map deleted:', mapId);
      return true;
    } catch (error) {
      console.error('Failed to delete world map:', error);
      return false;
    }
  }

  // Get all world maps metadata
  async getAllWorldMaps(): Promise<WorldMapMetadata[]> {
    try {
      const indexKey = 'worldmap_index';
      const indexStr = await AsyncStorage.getItem(indexKey);
      
      if (!indexStr) {
        return [];
      }

      const index = JSON.parse(indexStr);
      const metadataList: WorldMapMetadata[] = [];

      for (const mapId of Object.keys(index)) {
        const metadataKey = `worldmap_meta_${mapId}`;
        const metadataStr = await AsyncStorage.getItem(metadataKey);
        
        if (metadataStr) {
          try {
            const metadata = JSON.parse(metadataStr);
            metadataList.push(metadata);
          } catch (error) {
            console.warn('Failed to parse metadata for map:', mapId);
          }
        }
      }

      // Sort by last accessed (most recent first)
      return metadataList.sort((a, b) => b.lastAccessed - a.lastAccessed);
    } catch (error) {
      console.error('Failed to get all world maps:', error);
      return [];
    }
  }

  // Get storage usage statistics
  async getStorageStats(): Promise<{
    totalMaps: number;
    totalSize: number; // bytes
    usedSpace: number; // bytes
    availableSpace: number; // bytes
    oldestMap: WorldMapMetadata | null;
    newestMap: WorldMapMetadata | null;
  }> {
    try {
      const allMaps = await this.getAllWorldMaps();
      
      let totalSize = 0;
      let oldestMap: WorldMapMetadata | null = null;
      let newestMap: WorldMapMetadata | null = null;

      for (const map of allMaps) {
        totalSize += map.file_size;
        
        if (!oldestMap || map.created < oldestMap.created) {
          oldestMap = map;
        }
        
        if (!newestMap || map.created > newestMap.created) {
          newestMap = map;
        }
      }

      const maxStorageBytes = this.options.maxStorageSize! * 1024 * 1024;
      const availableSpace = Math.max(0, maxStorageBytes - totalSize);

      return {
        totalMaps: allMaps.length,
        totalSize,
        usedSpace: totalSize,
        availableSpace,
        oldestMap,
        newestMap,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalMaps: 0,
        totalSize: 0,
        usedSpace: 0,
        availableSpace: 0,
        oldestMap: null,
        newestMap: null,
      };
    }
  }

  // Export world map for sharing
  async exportWorldMap(mapId: string): Promise<string | null> {
    try {
      const worldMapData = await this.loadWorldMap(mapId);
      if (!worldMapData) {
        return null;
      }

      // Create export package
      const exportPackage = {
        version: '1.0',
        exported: Date.now(),
        metadata: worldMapData.metadata,
        data: worldMapData.data,
      };

      return JSON.stringify(exportPackage);
    } catch (error) {
      console.error('Failed to export world map:', error);
      return null;
    }
  }

  // Import world map from shared data
  async importWorldMap(exportData: string): Promise<string | null> {
    try {
      const exportPackage = JSON.parse(exportData);
      
      if (!exportPackage.version || !exportPackage.metadata || !exportPackage.data) {
        throw new Error('Invalid export package format');
      }

      // Generate new ID for imported map
      const newMapId = this.generateMapId();
      const metadata = {
        ...exportPackage.metadata,
        id: newMapId,
        name: `Imported: ${exportPackage.metadata.name}`,
        created: Date.now(),
        lastAccessed: Date.now(),
      };

      const success = await this.saveWorldMap(newMapId, exportPackage.data, metadata);
      return success ? newMapId : null;
    } catch (error) {
      console.error('Failed to import world map:', error);
      return null;
    }
  }

  // Process map data before saving
  private async processMapData(mapData: any): Promise<any> {
    let processedData = mapData;

    // Apply compression if enabled
    if (this.options.compressionEnabled) {
      processedData = await this.compressData(processedData);
    }

    // Apply encryption if enabled
    if (this.options.encryptionEnabled) {
      processedData = await this.encryptData(processedData);
    }

    return processedData;
  }

  // Process loaded data
  private async processLoadedData(data: any): Promise<any> {
    let processedData = data;

    // Apply decryption if enabled
    if (this.options.encryptionEnabled) {
      processedData = await this.decryptData(processedData);
    }

    // Apply decompression if enabled
    if (this.options.compressionEnabled) {
      processedData = await this.decompressData(processedData);
    }

    return processedData;
  }

  // Compress data
  private async compressData(data: any): Promise<any> {
    // Simplified compression - in production, use proper compression
    return {
      compressed: true,
      data: JSON.stringify(data),
    };
  }

  // Decompress data
  private async decompressData(compressedData: any): Promise<any> {
    if (compressedData.compressed) {
      return JSON.parse(compressedData.data);
    }
    return compressedData;
  }

  // Encrypt data
  private async encryptData(data: any): Promise<any> {
    // Simplified encryption - in production, use proper encryption
    return {
      encrypted: true,
      data: btoa(JSON.stringify(data)),
    };
  }

  // Decrypt data
  private async decryptData(encryptedData: any): Promise<any> {
    if (encryptedData.encrypted) {
      return JSON.parse(atob(encryptedData.data));
    }
    return encryptedData;
  }

  // Calculate data size
  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate
  }

  // Update storage index
  private async updateStorageIndex(mapId: string, metadata: WorldMapMetadata): Promise<void> {
    const indexKey = 'worldmap_index';
    const indexStr = await AsyncStorage.getItem(indexKey);
    const index = indexStr ? JSON.parse(indexStr) : {};
    
    index[mapId] = {
      size: metadata.file_size,
      created: metadata.created,
      lastAccessed: metadata.lastAccessed,
    };

    await AsyncStorage.setItem(indexKey, JSON.stringify(index));
  }

  // Remove from storage index
  private async removeFromStorageIndex(mapId: string): Promise<void> {
    const indexKey = 'worldmap_index';
    const indexStr = await AsyncStorage.getItem(indexKey);
    const index = indexStr ? JSON.parse(indexStr) : {};
    
    delete index[mapId];
    await AsyncStorage.setItem(indexKey, JSON.stringify(index));
  }

  // Enforce storage limits
  private async enforceStorageLimits(): Promise<void> {
    const stats = await this.getStorageStats();
    
    // Enforce size limit
    if (stats.usedSpace > this.options.maxStorageSize! * 1024 * 1024) {
      await this.cleanupOldMaps(this.options.maxStorageSize! * 1024 * 1024);
    }

    // Enforce count limit
    if (stats.totalMaps > this.options.maxMapsCount!) {
      await this.cleanupOldMapsByCount(this.options.maxMapsCount!);
    }

    // Enforce retention
    await this.cleanupExpiredMaps();
  }

  // Clean up old maps by size
  private async cleanupOldMaps(targetSize: number): Promise<void> {
    const allMaps = await this.getAllWorldMaps();
    
    // Sort by last accessed (oldest first)
    const sortedMaps = allMaps.sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    let currentSize = 0;
    const mapsToKeep: string[] = [];
    
    // Keep maps until we exceed the target size
    for (const map of sortedMaps) {
      if (currentSize + map.file_size <= targetSize) {
        mapsToKeep.push(map.id);
        currentSize += map.file_size;
      } else {
        break;
      }
    }
    
    // Delete maps beyond the limit
    for (const map of sortedMaps) {
      if (!mapsToKeep.includes(map.id)) {
        await this.deleteWorldMap(map.id);
      }
    }
  }

  // Clean up old maps by count
  private async cleanupOldMapsByCount(maxCount: number): Promise<void> {
    const allMaps = await this.getAllWorldMaps();
    
    if (allMaps.length <= maxCount) {
      return;
    }
    
    // Sort by last accessed (oldest first)
    const sortedMaps = allMaps.sort((a, b) => a.lastAccessed - b.lastAccessed);
    
    // Keep only the most recent maps
    const mapsToKeep = sortedMaps.slice(-maxCount);
    
    // Delete older maps
    for (const map of sortedMaps) {
      if (!mapsToKeep.includes(map)) {
        await this.deleteWorldMap(map.id);
      }
    }
  }

  // Clean up expired maps
  private async cleanupExpiredMaps(): Promise<void> {
    const allMaps = await this.getAllWorldMaps();
    const now = Date.now();
    const retentionMs = this.options.retentionDays! * 24 * 60 * 60 * 1000;
    
    for (const map of allMaps) {
      if (now - map.lastAccessed > retentionMs) {
        await this.deleteWorldMap(map.id);
      }
    }
  }

  // Generate unique map ID
  private generateMapId(): string {
    return `map_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clear all world maps
  async clearAllWorldMaps(): Promise<boolean> {
    try {
      const allMaps = await this.getAllWorldMaps();
      
      for (const map of allMaps) {
        await this.deleteWorldMap(map.id);
      }
      
      // Clear index
      await AsyncStorage.removeItem('worldmap_index');
      
      console.log('All world maps cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear all world maps:', error);
      return false;
    }
  }
}

export default WorldMapStorage;