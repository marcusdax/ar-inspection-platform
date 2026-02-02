import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useAuth } from '../contexts/AuthContext';

const VideoSessionScreen: React.FC = () => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('idle');

  useEffect(() => {
    // In Phase 2, this will be enhanced with actual WebRTC implementation
    const startCamera = async () => {
      try {
        // Mock camera access
        console.log('Starting camera for session');
        setIsStreaming(true);
        setSessionStatus('active');
      } catch (error) {
        console.error('Failed to start camera:', error);
        Alert.alert('Error', 'Failed to access camera');
      }
    };

    startCamera();
  }, []);

  const handleEndSession = () => {
    setIsStreaming(false);
    setSessionStatus('ended');
    Alert.alert(
      'Session Ended',
      'Inspection session has been completed',
      [
        { text: 'OK', onPress: () => console.log('Session ended confirmed') },
      ]
    );
  };

  const handleFlipCamera = () => {
    console.log('Flipping camera');
    // In Phase 2, this will toggle between front/back camera
  };

  return (
    <View style={styles.container}>
      {localStream ? (
        <RTCView
          streamURL={localStream}
          style={styles.video}
          objectFit="cover"
          mirror={true}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Initializing camera...
          </Text>
        </View>
      )}
      
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            isStreaming && styles.endButton
          ]}
          onPress={isStreaming ? handleEndSession : () => {}}
        >
          <Text style={styles.buttonText}>
            {isStreaming ? 'End Session' : 'Start Session'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleFlipCamera}
          disabled={!isStreaming}
        >
          <Text style={styles.buttonText}>
            Flip Camera
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Status: {sessionStatus}
        </Text>
        <Text style={styles.userInfo}>
          User: {user?.email || 'Guest'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  video: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  placeholderText: {
    color: 'white',
    fontSize: 18,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 100,
  },
  endButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statusBar: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
  userInfo: {
    color: 'white',
    fontSize: 12,
    textAlign: 'right',
  },
});

export default VideoSessionScreen;