import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SocketService from '../../services/SocketService';
import ARSceneManager from '../../services/ARSceneManager';
import { Annotation, Annotation3D } from '../../../shared/types/annotations';

interface ARAnnotationPanelProps {
  annotations: Annotation[];
  onAnnotationCreate: (annotation: any) => void;
  onAnnotationUpdate: (annotation: any) => void;
  onAnnotationDelete: (annotationId: string) => void;
}

const ARAnnotationPanel: React.FC<ARAnnotationPanelProps> = ({
  annotations,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
}) => {
  const [arAnnotations, setARAnnotations] = useState<Annotation3D[]>([]);
  const [isARMode, setIsARMode] = useState(false);
  const [selectedType, setSelectedType] = useState<'sphere' | 'box' | 'arrow' | 'text' | 'circle' | 'line'>('sphere');
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [strokeWidth, setStrokeWidth] = useState(3);

  useEffect(() => {
    // Convert 2D annotations to 3D AR annotations
    const converted3D = annotations.map(ann => {
      if ('points' in ann) {
        // Convert 2D points to 3D position using ARSceneManager
        return {
          id: ann.id,
          type: ann.type as any,
          position: { x: 0, y: 0, z: 1 }, // Default 1m away
          color: ann.color,
          strokeWidth: ann.strokeWidth,
          text: ann.text,
          fontSize: ann.fontSize,
          createdAt: ann.createdAt,
          createdBy: ann.createdBy,
        } as Annotation3D;
      }
      return null;
    }).filter(Boolean) as Annotation3D[];

    setARAnnotations(converted3D);
  }, [annotations]);

  const handleAnnotationCreate = async () => {
    if (!isARMode) return;

    try {
      const annotation: Annotation3D = {
        id: `ar_ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: selectedType,
        position: { x: 0, y: 0, z: -2 }, // Place 2m in front of user
        color: selectedColor,
        strokeWidth,
        createdAt: Date.now(),
        createdBy: 'current_user',
      };

      // Create AR anchor and 3D annotation
      const anchorId = await ARSceneManager.createAnchor(annotation.position);
      
      if (anchorId) {
        const finalAnnotation = { ...annotation, id: anchorId };
        setARAnnotations(prev => [...prev, finalAnnotation]);
        onAnnotationCreate?.(finalAnnotation);
      }
    } catch (error) {
      console.error('Failed to create AR annotation:', error);
    }
  };

  const handleAnnotationSelect = (annotationId: string) => {
    // In a real implementation, this would handle selection
    console.log('Selected AR annotation:', annotationId);
  };

  const handleAnnotationDelete = async (annotationId: string) => {
    try {
      await ARSceneManager.removeAnchor(annotationId);
      setARAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
      onAnnotationDelete?.(annotationId);
    } catch (error) {
      console.error('Failed to remove AR annotation:', error);
    }
  };

  const renderAnnotationList = () => {
    return arAnnotations.map(annotation => (
      <View key={annotation.id} style={styles.annotationItem}>
        <View style={[styles.annotationIcon, { backgroundColor: annotation.color }]} />
        <View style={styles.annotationInfo}>
          <Text style={styles.annotationType}>{annotation.type.toUpperCase()}</Text>
          <Text style={styles.annotationTime}>
            {new Date(annotation.createdAt).toLocaleTimeString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleAnnotationDelete(annotation.id)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AR Annotations</Text>
        <TouchableOpacity
          style={[styles.arToggle, isARMode && styles.arToggleActive]}
          onPress={() => setIsARMode(!isARMode)}
        >
          <Text style={styles.arToggleText}>
            {isARMode ? '2D Mode' : 'AR Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      {isARMode && (
        <View style={styles.arControls}>
          <View style={styles.toolSelector}>
            <Text style={styles.toolLabel}>Type:</Text>
            {['sphere', 'box', 'arrow', 'text', 'circle', 'line'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.toolOption,
                  selectedType === type && styles.toolOptionSelected
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={styles.toolOptionText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toolSelector}>
            <Text style={styles.toolLabel}>Color:</Text>
            <View style={styles.colorPicker}>
              {['#FF0000', '#00FF00', '#0000FF', '#FFD700', '#000000'].map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    selectedColor === color && styles.colorOptionSelected
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  <View style={[styles.colorSwatch, { backgroundColor: color }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.toolSelector}>
            <Text style={styles.toolLabel}>Width:</Text>
            <View style={styles.widthSlider}>
              {[1, 3, 5, 7, 10].map(width => (
                <TouchableOpacity
                  key={width}
                  style={[
                    styles.widthOption,
                    strokeWidth === width && styles.widthOptionSelected
                  ]}
                  onPress={() => setStrokeWidth(width)}
                >
                  <View style={[styles.widthBar, { height: width * 2 }]} />
                  <Text style={styles.widthText}>{width}px</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleAnnotationCreate}
          >
            <Text style={styles.createButtonText}>Add AR Annotation</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.annotationsList}>
        <Text style={styles.sectionTitle}>
          {isARMode ? 'AR Annotations' : '2D Annotations'}
        </Text>
        {renderAnnotationList()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  arToggle: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  arToggleActive: {
    backgroundColor: '#007AFF',
  },
  arToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  arControls: {
    padding: 16,
    backgroundColor: '#fff',
  },
  toolSelector: {
    marginBottom: 16,
  },
  toolLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  toolOption: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 8,
  },
  toolOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  toolOptionText: {
    fontSize: 12,
    color: '#333',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 24,
    height: 24,
    borderRadius: 4,
    margin: 4,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  colorOptionSelected: {
    borderColor: '#007AFF',
  },
  colorSwatch: {
    flex: 1,
  },
  widthSlider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  widthOption: {
    alignItems: 'center',
    marginRight: 8,
  },
  widthBar: {
    width: 60,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  widthText: {
    fontSize: 10,
    color: '#333',
    marginLeft: 4,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  annotationsList: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  annotationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  annotationIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  annotationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  annotationType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  annotationTime: {
    fontSize: 10,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ARAnnotationPanel;