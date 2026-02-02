// Hook for AR world map management
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import WorldMapManager, { WorldMapData } from '../services/ar/WorldMapManager';
import WorldMapStorage from '../storage/WorldMapStorage';
import ARService from '../services/ar/ARService';

interface UseWorldMapOptions {
  autoSave?: boolean;
  maxMaps?: number;
  retentionDays?: number;
}

interface UseWorldMapReturn {
  worldMaps: WorldMapData[];
  loading: boolean;
  error: string | null;
  isRecording: boolean;
  recordingDuration: number;
  currentMapId: string | null;
  startRecording: (name: string) => Promise<string | null>;
  stopRecording: () => Promise<WorldMapData | null>;
  loadWorldMap: (mapId: string) => Promise<boolean>;
  saveWorldMap: (mapId: string, metadata?: any) => Promise<boolean>;
  deleteWorldMap: (mapId: string) => Promise<boolean>;
  exportWorldMap: (mapId: string) => Promise<string | null>;
  importWorldMap: (data: string) => Promise<string | null>;
  refreshWorldMaps: () => Promise<void>;
  updateMapMetadata: (mapId: string, metadata: Partial<WorldMapData>) => Promise<boolean>;
}

export const useWorldMap = (
  arService: ARService,
  options: UseWorldMapOptions = {}
): UseWorldMapReturn => {
  const [worldMaps, setWorldMaps] = useState<WorldMapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);

  const worldMapManagerRef = useRef<WorldMapManager | null>(null);
  const worldMapStorageRef = useRef<WorldMapStorage | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize managers
  useEffect(() => {
    worldMapManagerRef.current = arService.getWorldMapManager();
    worldMapStorageRef.current = arService.getWorldMapStorage();

    if (!worldMapManagerRef.current || !worldMapStorageRef.current) {
      setError('World map support not available');
    }
  }, [arService]);

  // Load world maps
  const refreshWorldMaps = useCallback(async () => {
    if (!worldMapManagerRef.current) return;

    try {
      setLoading(true);
      setError(null);
      
      const maps = await worldMapManagerRef.current.getAllWorldMaps();
      setWorldMaps(maps);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load world maps';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load world maps on mount
  useEffect(() => {
    refreshWorldMaps();
  }, [refreshWorldMaps]);

  // Update recording duration
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        if (worldMapManagerRef.current) {
          const status = worldMapManagerRef.current.getRecordingStatus();
          setRecordingDuration(status.duration);
        }
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setRecordingDuration(0);
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Start recording
  const startRecording = useCallback(async (name: string): Promise<string | null> => {
    if (!worldMapManagerRef.current) {
      setError('World map manager not available');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use the service to start world mapping
      const mapId = await arService.startWorldMapping('default', name);
      
      if (mapId) {
        setIsRecording(true);
        setCurrentMapId(mapId);
        
        // Refresh world maps list
        await refreshWorldMaps();
        
        return mapId;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [arService, refreshWorldMaps]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<WorldMapData | null> => {
    if (!worldMapManagerRef.current) {
      setError('World map manager not available');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use the service to stop world mapping
      const worldMapData = await arService.stopWorldMapping('default');
      
      if (worldMapData) {
        setIsRecording(false);
        setCurrentMapId(null);
        
        // Refresh world maps list
        await refreshWorldMaps();
        
        return worldMapData;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop recording';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [arService, refreshWorldMaps]);

  // Load world map
  const loadWorldMap = useCallback(async (mapId: string): Promise<boolean> => {
    if (!worldMapManagerRef.current) {
      setError('World map manager not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const success = await arService.loadWorldMap(mapId, 'default');
      
      if (success) {
        Alert.alert('Success', 'World map loaded successfully');
      } else {
        Alert.alert('Error', 'Failed to load world map');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load world map';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [arService]);

  // Save world map
  const saveWorldMap = useCallback(async (
    mapId: string,
    metadata?: any
  ): Promise<boolean> => {
    if (!worldMapStorageRef.current) {
      setError('World map storage not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const success = await arService.saveWorldMap('default', metadata);
      
      if (success) {
        // Refresh world maps list
        await refreshWorldMaps();
        Alert.alert('Success', 'World map saved successfully');
      } else {
        Alert.alert('Error', 'Failed to save world map');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save world map';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [arService, refreshWorldMaps]);

  // Delete world map
  const deleteWorldMap = useCallback(async (mapId: string): Promise<boolean> => {
    if (!worldMapManagerRef.current) {
      setError('World map manager not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const success = await worldMapManagerRef.current.deleteWorldMap(mapId);
      
      if (success) {
        // Refresh world maps list
        await refreshWorldMaps();
        Alert.alert('Success', 'World map deleted successfully');
      } else {
        Alert.alert('Error', 'Failed to delete world map');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete world map';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshWorldMaps]);

  // Export world map
  const exportWorldMap = useCallback(async (mapId: string): Promise<string | null> => {
    if (!worldMapManagerRef.current) {
      setError('World map manager not available');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const exportData = await worldMapManagerRef.current.exportWorldMap(mapId);
      
      if (exportData) {
        Alert.alert('Success', 'World map exported successfully');
      } else {
        Alert.alert('Error', 'Failed to export world map');
      }
      
      return exportData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export world map';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Import world map
  const importWorldMap = useCallback(async (data: string): Promise<string | null> => {
    if (!worldMapManagerRef.current) {
      setError('World map manager not available');
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const mapId = await worldMapManagerRef.current.importWorldMap(data);
      
      if (mapId) {
        // Refresh world maps list
        await refreshWorldMaps();
        Alert.alert('Success', 'World map imported successfully');
      } else {
        Alert.alert('Error', 'Failed to import world map');
      }
      
      return mapId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import world map';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshWorldMaps]);

  // Update map metadata
  const updateMapMetadata = useCallback(async (
    mapId: string,
    metadata: Partial<WorldMapData>
  ): Promise<boolean> => {
    if (!worldMapManagerRef.current) {
      setError('World map manager not available');
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const success = await worldMapManagerRef.current.updateWorldMapMetadata(mapId, metadata);
      
      if (success) {
        // Refresh world maps list
        await refreshWorldMaps();
      } else {
        Alert.alert('Error', 'Failed to update map metadata');
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update map metadata';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshWorldMaps]);

  // Update recording status from manager
  useEffect(() => {
    const updateRecordingStatus = () => {
      if (worldMapManagerRef.current) {
        const status = worldMapManagerRef.current.getRecordingStatus();
        setIsRecording(status.isRecording);
        setCurrentMapId(status.currentMapId);
        setRecordingDuration(status.duration);
      }
    };

    updateRecordingStatus();
    
    // Check recording status periodically
    const interval = setInterval(updateRecordingStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    worldMaps,
    loading,
    error,
    isRecording,
    recordingDuration,
    currentMapId,
    startRecording,
    stopRecording,
    loadWorldMap,
    saveWorldMap,
    deleteWorldMap,
    exportWorldMap,
    importWorldMap,
    refreshWorldMaps,
    updateMapMetadata,
  };
};

export default useWorldMap;