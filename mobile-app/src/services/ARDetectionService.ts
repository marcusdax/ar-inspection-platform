import { Platform } from 'react-native';
import { check, PERMISSIONS, RESULTS } from 'react-native-permissions';

interface ARCapabilities {
  isSupported: boolean;
  platform: 'ios' | 'android' | 'unsupported';
  arKitVersion?: string;
  arCoreVersion?: string;
  concurrentCameraSupport: boolean;
  depthCameraSupport: boolean;
  lidarSupport: boolean;
}

class ARDetectionService {
  async checkARSupport(): Promise<ARCapabilities> {
    try {
      if (Platform.OS === 'ios') {
        return await this.checkARKitSupport();
      } else if (Platform.OS === 'android') {
        return await this.checkARCoreSupport();
      }
      
      return {
        isSupported: false,
        platform: 'unsupported',
      };
    } catch (error) {
      console.error('AR detection failed:', error);
      return {
        isSupported: false,
        platform: 'unsupported',
      };
    }
  }
  
  private async checkARKitSupport(): Promise<ARCapabilities> {
    // Check for ARKit availability
    const hasARKit = await this.checkPermission(PERMISSIONS.IOS.CAMERA);
    
    if (!hasARKit) {
      return {
        isSupported: false,
        platform: 'ios',
      };
    }
    
    // Check iOS version - ARKit requires iOS 11+
    const iosVersion = parseInt(Platform.Version as string, 10);
    const arKitSupported = iosVersion >= 11;
    
    // Check for specific ARKit features
    const hasARKit2 = iosVersion >= 12; // ARKit 2.0 features
    const hasARKit3 = iosVersion >= 13; // ARKit 3.0 features
    const hasARKit4 = iosVersion >= 14; // ARKit 4.0 features
    const hasARKit5 = iosVersion >= 15; // ARKit 5.0 features
    const hasARKit6 = iosVersion >= 16; // ARKit 6.0 features
    
    // Check device capabilities
    const deviceHasFaceID = await this.checkFaceIDSupport();
    const deviceHasTrueDepthCamera = await this.checkTrueDepthCameraSupport();
    const deviceHasLiDAR = await this.checkLiDARSupport();
    
    return {
      isSupported: arKitSupported,
      platform: 'ios',
      arKitVersion: this.getARKitVersion(hasARKit, hasARKit2, hasARKit3, hasARKit4, hasARKit5, hasARKit6),
      concurrentCameraSupport: deviceHasTrueDepthCamera,
      depthCameraSupport: deviceHasTrueDepthCamera,
      lidarSupport: deviceHasLiDAR,
    };
  }
  
  private async checkARCoreSupport(): Promise<ARCapabilities> {
    // Check for ARCore availability
    const hasCamera = await this.checkPermission(PERMISSIONS.ANDROID.CAMERA);
    
    if (!hasCamera) {
      return {
        isSupported: false,
        platform: 'android',
      };
    }
    
    // Check Android version - ARCore requires Android 7.0+ (API 24+)
    const androidVersion = parseInt(Platform.Version as string, 10);
    const arCoreSupported = androidVersion >= 24;
    
    // Check for ARCore Play Services
    const hasARCorePlayServices = await this.checkARCorePlayServices();
    
    // Check device capabilities
    const deviceHasOpenGL3 = androidVersion >= 18; // OpenGL ES 3.0
    const deviceHasCamera2 = androidVersion >= 23; // Camera2 API
    const deviceHasDepthCamera = await this.checkAndroidDepthSupport();
    const deviceHasMotionTracking = androidVersion >= 26; // Motion tracking API
    
    return {
      isSupported: arCoreSupported && hasARCorePlayServices,
      platform: 'android',
      arCoreVersion: this.getARCoreVersion(arCoreSupported, androidVersion),
      concurrentCameraSupport: deviceHasCamera2,
      depthCameraSupport: deviceHasDepthCamera,
      lidarSupport: false, // Android doesn't have LiDAR
    };
  }
  
  private getARKitVersion(
    hasARKit: boolean,
    hasARKit2: boolean,
    hasARKit3: boolean,
    hasARKit4: boolean,
    hasARKit5: boolean,
    hasARKit6: boolean
  ): string {
    if (!hasARKit) return 'Not supported';
    if (hasARKit6) return '6.0';
    if (hasARKit5) return '5.0';
    if (hasARKit4) return '4.0';
    if (hasARKit3) return '3.0';
    if (hasARKit2) return '2.0';
    return '1.0';
  }
  
  private getARCoreVersion(isSupported: boolean, androidVersion: number): string {
    if (!isSupported) return 'Not supported';
    
    // ARCore version mapping based on Android version
    if (androidVersion >= 33) return '1.41.0';
    if (androidVersion >= 32) return '1.40.0';
    if (androidVersion >= 31) return '1.39.0';
    if (androidVersion >= 30) return '1.38.0';
    if (androidVersion >= 29) return '1.36.0';
    if (androidVersion >= 28) return '1.34.0';
    if (androidVersion >= 27) return '1.33.0';
    if (androidVersion >= 26) return '1.30.0';
    if (androidVersion >= 25) return '1.25.0';
    return '1.0.0';
  }
  
  private async checkPermission(permission: string): Promise<boolean> {
    try {
      const result = await check(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error(`Permission check failed for ${permission}:`, error);
      return false;
    }
  }
  
  private async requestPermission(permission: string): Promise<boolean> {
    try {
      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error(`Permission request failed for ${permission}:`, error);
      return false;
    }
  }
  
  private async checkFaceIDSupport(): Promise<boolean> {
    // Check if device supports Face ID (TrueDepth camera)
    // This is a simplified check - in production you'd use device-specific APIs
    const faceIDCapableDevices = [
      'iPhone10,3', 'iPhone10,6',
      'iPhone11,1', 'iPhone11,2', 'iPhone11,3', 'iPhone11,4', 'iPhone11,5', 'iPhone11,6', 'iPhone11,7', 'iPhone11,8',
      'iPhone12,1', 'iPhone12,2', 'iPhone12,3', 'iPhone12,4', 'iPhone12,5', 'iPhone12,6', 'iPhone12,7', 'iPhone12,8',
      'iPhone13,1', 'iPhone13,2', 'iPhone13,3', 'iPhone13,4', 'iPhone13,5', 'iPhone13,6', 'iPhone13,7', 'iPhone13,8',
      'iPhone14,1', 'iPhone14,2', 'iPhone14,3', 'iPhone14,4', 'iPhone14,5', 'iPhone14,6', 'iPhone14,7', 'iPhone14,8',
    ];
    
    return faceIDCapableDevices.includes(Platform.constants?.Model || '');
  }
  
  private async checkTrueDepthCameraSupport(): Promise<boolean> {
    // Check for TrueDepth camera (front-facing with depth)
    const trueDepthCapableDevices = [
      'iPhone10,3', 'iPhone10,6',
      'iPhone11,1', 'iPhone11,2', 'iPhone11,3', 'iPhone11,4', 'iPhone11,5', 'iPhone11,6', 'iPhone11,7', 'iPhone11,8',
      'iPhone12,1', 'iPhone12,2', 'iPhone12,3', 'iPhone12,4', 'iPhone12,5', 'iPhone12,6', 'iPhone12,7', 'iPhone12,8',
      'iPhone13,1', 'iPhone13,2', 'iPhone13,3', 'iPhone13,4', 'iPhone13,5', 'iPhone13,6', 'iPhone13,7', 'iPhone13,8',
      'iPhone14,1', 'iPhone14,2', 'iPhone14,3', 'iPhone14,4', 'iPhone14,5', 'iPhone14,6', 'iPhone14,7', 'iPhone14,8',
    ];
    
    return trueDepthCapableDevices.includes(Platform.constants?.Model || '');
  }
  
  private async checkLiDARSupport(): Promise<boolean> {
    // Check for LiDAR scanner
    const liDARCapableDevices = [
      'iPhone12,9', 'iPhone13,1', 'iPhone13,2', 'iPhone13,3', 'iPhone13,4',
      'iPhone14,1', 'iPhone14,2', 'iPhone14,3', 'iPhone14,4', 'iPhone14,5', 'iPhone14,6', 'iPhone14,7', 'iPhone14,8',
      'iPhone15,1', 'iPhone15,2', 'iPhone15,3', 'iPhone15,4', 'iPhone15,5', 'iPhone15,6', 'iPhone15,7', 'iPhone15,8',
    ];
    
    return liDARCapableDevices.includes(Platform.constants?.Model || '');
  }
  
  private async checkAndroidDepthSupport(): Promise<boolean> {
    // Android depth camera support
    const androidVersion = parseInt(Platform.Version as string, 10);
    return androidVersion >= 26; // Android 8.0+ has depth camera API
  }
  
  private async checkARCorePlayServices(): Promise<boolean> {
    // Check if ARCore Play Services is available
    // In production, this would use Google Play Services availability check
    // For now, assume it's available if Android version supports ARCore
    const androidVersion = parseInt(Platform.Version as string, 10);
    return androidVersion >= 24;
  }
  
  async requestCameraPermission(): Promise<boolean> {
    const cameraPermission = Platform.OS === 'ios' 
      ? PERMISSIONS.IOS.CAMERA 
      : PERMISSIONS.ANDROID.CAMERA;
      
    const hasPermission = await this.checkPermission(cameraPermission);
    if (hasPermission) {
      return true;
    }
    
    console.log('Requesting camera permission...');
    return await this.requestPermission(cameraPermission);
  }
  
  getDeviceCapabilities(): {
    concurrentCameraSupport: boolean;
    depthCameraSupport: boolean;
    lidarSupport: boolean;
  } {
    if (Platform.OS === 'ios') {
      return {
        concurrentCameraSupport: true, // Most modern iPhones support this
        depthCameraSupport: true, // TrueDepth cameras on recent models
        lidarSupport: this.hasLiDARSupport(),
      };
    } else if (Platform.OS === 'android') {
      const androidVersion = parseInt(Platform.Version as string, 10);
      return {
        concurrentCameraSupport: androidVersion >= 23, // Android 6.0+
        depthCameraSupport: androidVersion >= 26, // Android 8.0+
        lidarSupport: false, // No LiDAR on Android
      };
    }
    
    return {
      concurrentCameraSupport: false,
      depthCameraSupport: false,
      lidarSupport: false,
    };
  }
}

export default ARDetectionService;