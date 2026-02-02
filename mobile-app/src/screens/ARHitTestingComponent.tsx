import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import ARSceneManager from '../services/ARSceneManager';
import { ARHitTestingService } from '../services/ARHitTestingService';

interface SurfaceInfo {
  position: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
  distance: number;
  id?: string;
}

const ARHitTestingComponent: React.FC = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [hitResults, setHitResults] = useState<any[]>([]);
  const [testPoint, setTestPoint] = useState({ x: 0.5, y: 0.5 });
  const [surfaceInfo, setSurfaceInfo] = useState<SurfaceInfo | null>(null);
  const [isVisualizationMode, setIsVisualizationMode] = useState(false);

  const { width, height } = Dimensions.get('window');
  const centerX = width / 2;
  const centerY = height / 2;

  useEffect(() => {
    // Listen for hit test events
    ARSceneManager.on('hitTestResult', (result) => {
      setHitResults(prev => {
        const visualizationData = ARHitTestingService.calculateHitTestVisualization(testPoint, result);
        return [...prev, visualizationData];
      });
    });
  }, []);

  const startHitTest = () => {
    setIsTesting(true);
    setHitResults([]);
    setSurfaceInfo(null);
    
    // Perform single hit test
    ARHitTestingService.performHitTest(testPoint.x, testPoint.y)
      .then(results => {
        setHitResults(results);
      })
      .catch(error => {
        console.error('Hit test failed:', error);
        setIsTesting(false);
      });
  };

  const performContinuousHitTesting = () => {
    setIsTesting(true);
    setHitResults([]);
    setSurfaceInfo(null);
    
    // Perform continuous hit test
    ARHitTestingService.performContinuousHitTesting(
      testPoint,
      {
        sampleCount: 20,
        endPoint: { x: centerX + 0.3, y: centerY - 0.2 },
      }
    ).then(results => {
      setHitResults(results);
      })
      .catch(error => {
        console.error('Continuous hit test failed:', error);
        setIsTesting(false);
      });
  });
  };

  const performSmartHitTest = async () => {
    setIsTesting(true);
    setHitResults([]);
    setSurfaceInfo(null);
    
    try {
      const result = await ARHitTestingService.performSmartHitTest(
        testPoint,
        {
          maxDistance: 0.5,
          preferHorizontalPlanes: true,
          minPlaneSize: 0.1,
        }
      );
      
      if (result) {
        setHitResults([result]);
        const surfaceAnalysis = await ARHitTestingService.performSurfaceAnalysis(result);
        setSurfaceInfo(surfaceAnalysis);
      }
    } catch (error) {
      console.error('Smart hit test failed:', error);
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setHitResults([]);
    setSurfaceInfo(null);
  };

  const toggleVisualization = () => {
    setIsVisualizationMode(!isVisualizationMode);
  };

  const renderHitTestVisualization = () => {
    if (!isVisualizationMode || hitResults.length === 0) {
      return null;
    }

    const scale = 50; // Scale factor for visualization

    return (
      <View style={styles.visualizationContainer}>
        {hitResults.map((result, index) => {
          const x = centerX + (result.position.x * scale);
          const y = centerY - (result.position.y * scale);
          
          return (
            <View
              key={index}
              style={[
                styles.hitPoint,
                {
                  left: x - 8,
                  top: y - 8,
                  backgroundColor: result.color,
                },
              ]}
            />
            );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Control Panel */}
      <View style={styles.controlPanel}>
        <Text style={styles.title}>AR Hit Testing</Text>
        
        <View style={styles.buttonGroup}>
          <Text style={styles.label}>Test Point:</Text>
          <View style={styles.testPoint}>
            <Text>X: {testPoint.x.toFixed(2)}</Text>
            <Text>Y: {testPoint.y.toFixed(2)}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.button}
            onPress={startHitTest}
          >
            <Text>Single Hit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.button}
            onPress={performContinuousHitTesting}
          >
            <Text>Continuous Test</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.button}
            onPress={performSmartHitTest}
          >
            <Text>Smart Test</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonGroup}>
          <Text style={styles.label}>Visualization:</Text>
          <TouchableOpacity
            style={[styles.button, isVisualizationMode && styles.buttonActive]}
            onPress={toggleVisualization}
          >
            <Text>{isVisualizationMode ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.button}
            onPress={clearResults}
          >
            <Text>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Surface Info */}
      {surfaceInfo && (
        <View style={styles.surfaceInfo}>
          <Text style={styles.title}>Surface Analysis</Text>
          <Text>Type: {surfaceInfo.surfaceType}</Text>
          <Text>Flat: {surfaceInfo.isFlat ? 'Yes' : 'No'}</Text>
          <Text>Area: {surfaceInfo.area.toFixed(2)}m²</Text>
          <Text>Normal: ({surfaceInfo.normal.x.toFixed(2)}, {surfaceInfo.normal.y.toFixed(2)}, {surfaceInfo.normal.z.toFixed(2)})</Text>
          {Text>Confidence: {surfaceInfo.confidence ? 'High' : 'Low'}</Text>
          <Text>Score: {surfaceInfo.score}</Text>
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.title}>Hit Test Results</Text>
        <Text style={styles.resultCount}>{hitResults.length} results found</Text>
        
        {isTesting && (
          <Text style={styles.testingText}>Testing...</Text>
        )}
        
        {renderHitTestVisualization()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  controlPanel: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  buttonActive: {
    backgroundColor: '#0056b3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  testPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  testingText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  surfaceInfo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  visualizationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  hitPoint: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
});

export default ARHitTestingComponent;