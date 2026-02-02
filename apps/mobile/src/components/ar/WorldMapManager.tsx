// React component for AR world map management UI
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Button,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import WorldMapManager, { WorldMapData } from '../services/ar/WorldMapManager';
import ARInterface from '../services/ar/ARInterface';
import { useTheme } from '../contexts/ThemeContext';

interface WorldMapManagerProps {
  arInterface: ARInterface;
  onMapLoaded?: (mapData: WorldMapData) => void;
  onMapDeleted?: (mapId: string) => void;
}

const WorldMapManagerComponent: React.FC<WorldMapManagerProps> = ({
  arInterface,
  onMapLoaded,
  onMapDeleted,
}) => {
  const [worldMaps, setWorldMaps] = useState<WorldMapData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMap, setSelectedMap] = useState<WorldMapData | null>(null);
  const [showNewMapModal, setShowNewMapModal] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [recordingStatus, setRecordingStatus] = useState({
    isRecording: false,
    currentMapId: null as string | null,
    duration: 0,
  });

  const { theme } = useTheme();
  const worldMapManager = new WorldMapManager();

  // Load world maps
  const loadWorldMaps = async () => {
    try {
      setRefreshing(true);
      const maps = await worldMapManager.getAllWorldMaps();
      setWorldMaps(maps);
    } catch (error) {
      console.error('Failed to load world maps:', error);
      Alert.alert('Error', 'Failed to load world maps');
    } finally {
      setRefreshing(false);
    }
  };

  // Start recording new world map
  const startRecording = async (name: string) => {
    try {
      setLoading(true);
      const mapId = await worldMapManager.startRecording(arInterface, name);
      setRecordingStatus(worldMapManager.getRecordingStatus());
      setShowNewMapModal(false);
      setNewMapName('');
      Alert.alert('Success', 'Started recording world map');
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    } finally {
      setLoading(false);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      setLoading(true);
      const worldMapData = await worldMapManager.stopRecording(arInterface);
      setRecordingStatus(worldMapManager.getRecordingStatus());
      setWorldMaps(prev => [worldMapData, ...prev]);
      Alert.alert('Success', 'World map saved successfully');
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to save world map');
    } finally {
      setLoading(false);
    }
  };

  // Load world map
  const loadWorldMap = async (mapData: WorldMapData) => {
    try {
      setLoading(true);
      const success = await worldMapManager.loadWorldMap(mapData.id, arInterface);
      if (success) {
        onMapLoaded?.(mapData);
        Alert.alert('Success', 'World map loaded successfully');
      } else {
        Alert.alert('Error', 'Failed to load world map');
      }
    } catch (error) {
      console.error('Failed to load world map:', error);
      Alert.alert('Error', 'Failed to load world map');
    } finally {
      setLoading(false);
    }
  };

  // Delete world map
  const deleteWorldMap = async (mapData: WorldMapData) => {
    Alert.alert(
      'Delete World Map',
      `Are you sure you want to delete "${mapData.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await worldMapManager.deleteWorldMap(mapData.id);
              if (success) {
                setWorldMaps(prev => prev.filter(map => map.id !== mapData.id));
                onMapDeleted?.(mapData.id);
                Alert.alert('Success', 'World map deleted');
              } else {
                Alert.alert('Error', 'Failed to delete world map');
              }
            } catch (error) {
              console.error('Failed to delete world map:', error);
              Alert.alert('Error', 'Failed to delete world map');
            }
          },
        },
      ]
    );
  };

  // Export world map
  const exportWorldMap = async (mapData: WorldMapData) => {
    try {
      const exportData = await worldMapManager.exportWorldMap(mapData.id);
      if (exportData) {
        // In a real app, share the export data
        Alert.alert('Export Success', 'World map exported successfully');
      } else {
        Alert.alert('Error', 'Failed to export world map');
      }
    } catch (error) {
      console.error('Failed to export world map:', error);
      Alert.alert('Error', 'Failed to export world map');
    }
  };

  // Format duration
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

  // Format date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Update recording status
  useEffect(() => {
    const interval = setInterval(() => {
      if (recordingStatus.isRecording) {
        setRecordingStatus(worldMapManager.getRecordingStatus());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [recordingStatus.isRecording]);

  // Load world maps on mount
  useEffect(() => {
    loadWorldMaps();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statusText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    recordingStatus: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    recordingIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#ff0000',
      marginRight: 8,
    },
    list: {
      flex: 1,
    },
    mapItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    mapHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    mapThumbnail: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 12,
    },
    mapInfo: {
      flex: 1,
    },
    mapName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    mapDetails: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    mapActions: {
      flexDirection: 'row',
      marginTop: 12,
    },
    actionButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      marginRight: 8,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '500',
    },
    loadButton: {
      backgroundColor: theme.colors.primary,
    },
    loadButtonText: {
      color: theme.colors.background,
    },
    deleteButton: {
      backgroundColor: '#ff4444',
    },
    deleteButtonText: {
      color: '#ffffff',
    },
    exportButton: {
      backgroundColor: theme.colors.secondary,
    },
    exportButtonText: {
      color: theme.colors.background,
    },
    modal: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      padding: 20,
      borderRadius: 12,
      width: '80%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 16,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    button: {
      marginLeft: 12,
    },
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    fabText: {
      fontSize: 24,
      color: theme.colors.background,
      fontWeight: 'bold',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
  });

  const renderWorldMap = ({ item }: { item: WorldMapData }) => (
    <View style={styles.mapItem}>
      <View style={styles.mapHeader}>
        {item.thumbnail && (
          <Image source={{ uri: item.thumbnail }} style={styles.mapThumbnail} />
        )}
        <View style={styles.mapInfo}>
          <Text style={styles.mapName}>{item.name}</Text>
          <Text style={styles.mapDetails}>
            Created: {formatDate(item.created)}
          </Text>
          <Text style={styles.mapDetails}>
            Duration: {formatDuration(item.duration)}
          </Text>
          <Text style={styles.mapDetails}>
            Annotations: {item.annotationCount}
          </Text>
        </View>
      </View>
      <View style={styles.mapActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.loadButton]}
          onPress={() => loadWorldMap(item)}
        >
          <Text style={[styles.actionButtonText, styles.loadButtonText]}>
            Load
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.exportButton]}
          onPress={() => exportWorldMap(item)}
        >
          <Text style={[styles.actionButtonText, styles.exportButtonText]}>
            Export
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteWorldMap(item)}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>World Maps</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {worldMaps.length} maps saved
          </Text>
          {recordingStatus.isRecording && (
            <View style={styles.recordingStatus}>
              <View style={styles.recordingIndicator} />
              <Text style={styles.statusText}>
                Recording: {formatDuration(recordingStatus.duration)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {worldMaps.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No world maps saved yet. Start recording to create your first map.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={worldMaps}
          renderItem={renderWorldMap}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={loadWorldMaps}
            />
          }
        />
      )}

      {/* Recording Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (recordingStatus.isRecording) {
            stopRecording();
          } else {
            setShowNewMapModal(true);
          }
        }}
        disabled={loading}
      >
        <Text style={styles.fabText}>
          {recordingStatus.isRecording ? '⏹' : '+'}
        </Text>
      </TouchableOpacity>

      {/* New Map Modal */}
      <Modal
        visible={showNewMapModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewMapModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New World Map</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter map name"
              value={newMapName}
              onChangeText={setNewMapName}
              placeholderTextColor={theme.colors.textSecondary}
            />
            <View style={styles.buttonContainer}>
              <Button
                title="Cancel"
                onPress={() => setShowNewMapModal(false)}
                color={theme.colors.textSecondary}
              />
              <View style={styles.button}>
                <Button
                  title="Start Recording"
                  onPress={() => startRecording(newMapName)}
                  disabled={!newMapName.trim() || loading}
                  color={theme.colors.primary}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
};

export default WorldMapManagerComponent;