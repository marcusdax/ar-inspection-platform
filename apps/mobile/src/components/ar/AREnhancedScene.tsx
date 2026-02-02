// Enhanced AR scene with world map persistence capabilities
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WorldMapManager from '../services/ar/WorldMapManager';
import WorldMapStorage from '../services/storage/WorldMapStorage';
import { useTheme } from '../contexts/ThemeContext';
import { ARInterface, ARAnnotation } from '../services/ar/ARInterface';

interface AREnhancedSceneProps {
  onAnnotationAdded?: (annotation: ARAnnotation) => void;
  onAnnotationSelected?: (annotation: ARAnnotation) => void;
  onWorldMapLoaded?: (mapId: string) => void;
  showWorldMapControls?: boolean;
}

const AREnhancedScene: React.FC<AREnhancedSceneProps> = ({
  onAnnotationAdded,
  onAnnotationSelected,
  onWorldMapLoaded,
  showWorldMapControls = true,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [worldMapManager] = useState(() => new WorldMapManager());
  const [worldMapStorage] = useState(() => WorldMapStorage.getInstance());
  const [recordingStatus, setRecordingStatus] = useState({
    isRecording: false,
    currentMapId: null as string | null,
    duration: 0,
  });
  const [trackingQuality, setTrackingQuality] = useState<'limited' | 'normal'>('limited');

  const { theme } = useTheme();

  // Initialize AR scene
  useEffect(() => {
    if (isReady && webViewRef.current) {
      initializeARScene();
      setupWorldMapListeners();
    }
  }, [isReady]);

  // Update recording status
  useEffect(() => {
    const interval = setInterval(() => {
      if (recordingStatus.isRecording) {
        setRecordingStatus(worldMapManager.getRecordingStatus());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [recordingStatus.isRecording]);

  const initializeARScene = () => {
    if (!webViewRef.current) return;

    const initScript = `
      (function() {
        // Initialize enhanced AR scene with world map support
        window.arEnhanced = {
          worldMapData: null,
          isMapping: false,
          trackingQuality: 'limited',
          anchorPoints: [],
          
          // Initialize AR scene
          initialize() {
            this.setupEventListeners();
            this.initializeTracking();
            console.log('Enhanced AR scene initialized');
          },
          
          // Setup event listeners
          setupEventListeners() {
            window.addEventListener('message', (event) => {
              const message = JSON.parse(event.data);
              this.handleMessage(message);
            });
          },
          
          // Handle messages from React Native
          handleMessage(message) {
            switch (message.type) {
              case 'START_WORLD_MAPPING':
                this.startWorldMapping(message.mapId);
                break;
              case 'STOP_WORLD_MAPPING':
                this.stopWorldMapping();
                break;
              case 'LOAD_WORLD_MAP':
                this.loadWorldMap(message.mapData);
                break;
              case 'UPDATE_TRACKING_QUALITY':
                this.trackingQuality = message.quality;
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'TRACKING_QUALITY_CHANGED',
                  quality: message.quality,
                }));
                break;
            }
          },
          
          // Initialize world tracking
          initializeTracking() {
            // Initialize ARKit/ARCore tracking
            if (typeof ARKit !== 'undefined') {
              this.initializeARKitTracking();
            } else if (typeof ARCore !== 'undefined') {
              this.initializeARCoreTracking();
            } else {
              console.warn('No AR framework available');
            }
          },
          
          // Initialize ARKit tracking
          initializeARKitTracking() {
            ARKit.init({
              worldAlignment: ARKit.WorldAlignment.gravity,
              planeDetection: ARKit.PlaneDetection.horizontal,
              runOptions: ARKit.RunOptions.resetTracking,
            }).then(() => {
              this.updateTrackingQuality('normal');
              console.log('ARKit tracking initialized');
            }).catch(error => {
              console.error('Failed to initialize ARKit:', error);
            });
          },
          
          // Initialize ARCore tracking
          initializeARCoreTracking() {
            ARCore.init({
              planeDetection: ARCore.PlaneDetection.horizontal,
              lightEstimation: true,
            }).then(() => {
              this.updateTrackingQuality('normal');
              console.log('ARCore tracking initialized');
            }).catch(error => {
              console.error('Failed to initialize ARCore:', error);
            });
          },
          
          // Start world mapping
          startWorldMapping(mapId) {
            this.isMapping = true;
            this.worldMapData = {
              id: mapId,
              anchors: [],
              features: [],
              timestamp: Date.now(),
            };
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'WORLD_MAPPING_STARTED',
              mapId: mapId,
            }));
          },
          
          // Stop world mapping
          stopWorldMapping() {
            this.isMapping = false;
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'WORLD_MAPPING_STOPPED',
              mapData: this.worldMapData,
            }));
          },
          
          // Load world map
          loadWorldMap(mapData) {
            this.worldMapData = mapData;
            
            // Restore anchors
            if (mapData.anchors) {
              mapData.anchors.forEach(anchor => {
                this.restoreAnchor(anchor);
              });
            }
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'WORLD_MAP_LOADED',
              mapId: mapData.id,
            }));
          },
          
          // Restore anchor from world map
          restoreAnchor(anchorData) {
            const anchor = {
              id: anchorData.id,
              position: anchorData.position,
              rotation: anchorData.rotation,
              type: anchorData.type,
              data: anchorData.data,
            };
            
            this.anchorPoints.push(anchor);
            
            // Visualize the restored anchor
            this.visualizeAnchor(anchor);
          },
          
          // Visualize anchor
          visualizeAnchor(anchor) {
            // Create 3D visualization for anchor
            const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const mesh = new THREE.Mesh(geometry, material);
            
            mesh.position.set(...anchor.position);
            mesh.rotation.set(...anchor.rotation);
            
            if (window.scene) {
              window.scene.add(mesh);
            }
          },
          
          // Update tracking quality
          updateTrackingQuality(quality) {
            this.trackingQuality = quality;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'TRACKING_QUALITY_CHANGED',
              quality: quality,
            }));
          },
          
          // Add anchor to world map
          addAnchorToMap(anchor) {
            if (this.isMapping && this.worldMapData) {
              this.worldMapData.anchors.push({
                id: anchor.id,
                position: anchor.position,
                rotation: anchor.rotation,
                type: anchor.type,
                data: anchor.data,
                timestamp: Date.now(),
              });
            }
          },
          
          // Get world map data
          getWorldMapData() {
            return this.worldMapData;
          },
          
          // Check tracking quality
          getTrackingQuality() {
            return this.trackingQuality;
          },
        };
        
        // Initialize the enhanced AR scene
        window.arEnhanced.initialize();
      })();
    `;

    webViewRef.current.injectJavaScript(initScript);
  };

  const setupWorldMapListeners = () => {
    if (!webViewRef.current) return;

    const listenerScript = `
      (function() {
        // Listen for AR tracking events
        if (typeof ARKit !== 'undefined') {
          ARKit.addEventListener('trackingState', (state) => {
            const quality = state.isAvailable ? 'normal' : 'limited';
            window.arEnhanced.updateTrackingQuality(quality);
          });
        }
        
        if (typeof ARCore !== 'undefined') {
          ARCore.addEventListener('trackingState', (state) => {
            const quality = state.tracking === ARCore.TrackingState.tracking ? 'normal' : 'limited';
            window.arEnhanced.updateTrackingQuality(quality);
          });
        }
      })();
    `;

    webViewRef.current.injectJavaScript(listenerScript);
  };

  const startWorldMapping = async (mapId: string) => {
    try {
      const success = await worldMapManager.startRecording(null, `Map ${new Date().toISOString()}`);
      if (success) {
        setRecordingStatus(worldMapManager.getRecordingStatus());
        
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            window.arEnhanced.startWorldMapping('${mapId}');
          `);
        }
      }
    } catch (error) {
      console.error('Failed to start world mapping:', error);
    }
  };

  const stopWorldMapping = async () => {
    try {
      // Get world map data from WebView
      if (webViewRef.current) {
        await webViewRef.current.injectJavaScript(`
          window.arEnhanced.stopWorldMapping();
        `);
      }
      
      const worldMapData = await worldMapManager.stopRecording(null);
      setRecordingStatus(worldMapManager.getRecordingStatus());
      
      console.log('World mapping stopped:', worldMapData);
    } catch (error) {
      console.error('Failed to stop world mapping:', error);
    }
  };

  const loadWorldMap = async (mapId: string) => {
    try {
      const worldMapData = await worldMapStorage.loadWorldMap(mapId);
      if (worldMapData) {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(`
            window.arEnhanced.loadWorldMap(${JSON.stringify(worldMapData.data)});
          `);
        }
        
        onWorldMapLoaded?.(mapId);
      }
    } catch (error) {
      console.error('Failed to load world map:', error);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'TRACKING_QUALITY_CHANGED':
          setTrackingQuality(message.quality);
          break;
        case 'WORLD_MAPPING_STARTED':
          console.log('World mapping started:', message.mapId);
          break;
        case 'WORLD_MAPPING_STOPPED':
          console.log('World mapping stopped');
          break;
        case 'WORLD_MAP_LOADED':
          console.log('World map loaded:', message.mapId);
          onWorldMapLoaded?.(message.mapId);
          break;
      }
    } catch (error) {
      console.error('Failed to handle WebView message:', error);
    }
  };

  const getTrackingQualityColor = () => {
    return trackingQuality === 'normal' ? '#00ff00' : '#ffaa00';
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    webView: {
      flex: 1,
    },
    controls: {
      position: 'absolute',
      top: 50,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderRadius: 12,
      padding: 16,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    statusText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '500',
    },
    trackingIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    button: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '500',
    },
    recordingButton: {
      backgroundColor: '#ff4444',
    },
  });

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.webView}
        source={{
          html: getAREnhancedHTML(),
          baseUrl: '',
        }}
        onMessage={handleWebViewMessage}
        onLoad={() => setIsReady(true)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        scalesPageToFit={false}
        scrollEnabled={false}
      />

      {showWorldMapControls && (
        <View style={styles.controls}>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>
              Tracking: {trackingQuality.toUpperCase()}
            </Text>
            <View
              style={[
                styles.trackingIndicator,
                { backgroundColor: getTrackingQualityColor() },
              ]}
            />
          </View>
          
          {recordingStatus.isRecording && (
            <Text style={styles.statusText}>
              Recording: {Math.floor(recordingStatus.duration / 1000)}s
            </Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                recordingStatus.isRecording && styles.recordingButton,
              ]}
              onPress={() => {
                if (recordingStatus.isRecording) {
                  stopWorldMapping();
                } else {
                  startWorldMapping(worldMapManager.generateMapId());
                }
              }}
            >
              <Text style={styles.buttonText}>
                {recordingStatus.isRecording ? 'Stop' : 'Record'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// Enhanced AR HTML content with world map support
const getAREnhancedHTML = () => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AR Enhanced Scene</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
            background: #000;
        }
        
        #ar-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
        }
        
        #controls {
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 12px;
            padding: 16px;
            color: white;
            z-index: 10;
        }
        
        .control-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
            margin-left: 8px;
        }
        
        .status-normal {
            background: #00ff00;
        }
        
        .status-limited {
            background: #ffaa00;
        }
        
        .button {
            background: #007AFF;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .button.recording {
            background: #ff4444;
        }
        
        .button-row {
            display: flex;
            justify-content: space-around;
            gap: 8px;
        }
    </style>
</head>
<body>
    <div id="ar-container">
        <canvas id="ar-canvas"></canvas>
    </div>
    
    <div id="controls">
        <div class="control-row">
            <span>Tracking: <span id="tracking-status">INITIALIZING</span></span>
            <span class="status-indicator status-limited" id="tracking-indicator"></span>
        </div>
        
        <div class="control-row" id="recording-status" style="display: none;">
            <span>Recording: <span id="recording-time">0s</span></span>
        </div>
        
        <div class="button-row">
            <button class="button" id="record-button" onclick="toggleRecording()">Start Recording</button>
            <button class="button" onclick="testWorldMapping()">Test Mapping</button>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/GLTFLoader.js"></script>
    
    <script>
        let scene, camera, renderer;
        let isRecording = false;
        let recordingStartTime = 0;
        let worldMapData = null;
        
        // Initialize Three.js scene
        function initThreeJS() {
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            
            renderer = new THREE.WebGLRenderer({
                canvas: document.getElementById('ar-canvas'),
                alpha: true,
                antialias: true,
            });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            
            // Add lights
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
            directionalLight.position.set(0, 1, 0);
            scene.add(directionalLight);
            
            // Set initial camera position
            camera.position.set(0, 1.6, 3);
            camera.lookAt(0, 0, 0);
            
            // Handle window resize
            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
            
            animate();
        }
        
        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            
            // Update recording time
            if (isRecording) {
                const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
                document.getElementById('recording-time').textContent = elapsed + 's';
            }
            
            renderer.render(scene, camera);
        }
        
        // Toggle recording
        function toggleRecording() {
            const button = document.getElementById('record-button');
            const recordingStatus = document.getElementById('recording-status');
            
            if (isRecording) {
                // Stop recording
                isRecording = false;
                button.textContent = 'Start Recording';
                button.classList.remove('recording');
                recordingStatus.style.display = 'none';
                
                // Stop world mapping
                if (window.arEnhanced) {
                    window.arEnhanced.stopWorldMapping();
                }
            } else {
                // Start recording
                isRecording = true;
                recordingStartTime = Date.now();
                button.textContent = 'Stop Recording';
                button.classList.add('recording');
                recordingStatus.style.display = 'flex';
                
                // Start world mapping
                if (window.arEnhanced) {
                    const mapId = 'map_' + Date.now();
                    window.arEnhanced.startWorldMapping(mapId);
                }
            }
        }
        
        // Test world mapping
        function testWorldMapping() {
            if (!window.arEnhanced) {
                console.error('AR Enhanced not initialized');
                return;
            }
            
            // Create test anchor
            const testAnchor = {
                id: 'test_anchor_' + Date.now(),
                position: [0, 0, -2],
                rotation: [0, 0, 0],
                type: 'test',
                data: { message: 'Test anchor for world mapping' },
            };
            
            // Add to world map
            window.arEnhanced.addAnchorToMap(testAnchor);
            
            // Visualize anchor
            window.arEnhanced.visualizeAnchor(testAnchor);
            
            console.log('Test anchor added to world map:', testAnchor);
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            initThreeJS();
            
            // Wait for enhanced AR to be available
            setTimeout(() => {
                if (window.arEnhanced) {
                    updateTrackingStatus(window.arEnhanced.getTrackingQuality());
                }
            }, 1000);
        });
        
        // Update tracking status display
        function updateTrackingStatus(quality) {
            const status = document.getElementById('tracking-status');
            const indicator = document.getElementById('tracking-indicator');
            
            status.textContent = quality.toUpperCase();
            indicator.className = 'status-indicator status-' + quality;
        }
        
        // Listen for tracking quality changes
        window.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'TRACKING_QUALITY_CHANGED') {
                updateTrackingStatus(message.quality);
            }
        });
        
        // Expose functions to global scope
        window.toggleRecording = toggleRecording;
        window.testWorldMapping = testWorldMapping;
        window.updateTrackingStatus = updateTrackingStatus;
    </script>
</body>
</html>
`;

export default AREnhancedScene;