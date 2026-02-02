import { ARSceneManager } from '../services/ARSceneManager';
import { Annotation3D } from '../../../shared/types/annotations';
import { useAuth } from '../../contexts/AuthContext';

interface ARHitTestResult {
  position: {
    x: number;
    y: number;
    z: number;
  };
  distance: number;
  planeId?: string;
  transform: number[];
}

const ARHitTestingService = {
  async performHitTest(
    screenPoint: { x: number; y: number },
    type: 'existingPlane' | 'estimatedHorizontalPlane' | 'estimatedVerticalPlane' | 'featurePoint' = 'existingPlane'
  ): Promise<ARHitTestResult[]> {
    try {
      console.log(`Performing hit test at (${screenPoint.x}, ${screenPoint.y}) with type: ${type}`);
      
      const results = await ARSceneManager.performHitTest(screenPoint.x, screenPoint.y, type);
      
      if (results.length === 0) {
        console.warn('No hit test results found');
      }
      
      return results.map(result => ({
        position: {
          x: result.position?.x || 0,
          y: result.position?.y || 0,
          z: result.position?.z || 0,
        },
        distance: result.distance || 0,
        planeId: result.planeId,
        transform: result.transform || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      }));
    } catch (error) {
      console.error('Hit test failed:', error);
      return [];
    }
  },

  async performSmartHitTest(
    screenPoint: { x: number; y: number },
    options: {
      maxDistance: number; // Maximum distance for hit test
      preferHorizontalPlanes: boolean; // Prioritize horizontal planes
      minPlaneSize: number; // Minimum plane size to consider
    } = {}
  ): Promise<ARHitTestResult | null> {
    try {
      console.log(`Performing smart hit test at (${screenPoint.x}, ${screenPoint.y})`);
      
      // Try different hit test types in order of preference
      const hitTestTypes = options.preferHorizontalPlanes 
        ? ['existingPlane', 'estimatedHorizontalPlane', 'estimatedVerticalPlane', 'featurePoint']
        : ['existingPlane', 'estimatedHorizontalPlane', 'estimatedVerticalPlane'];
      
      for (const hitType of hitTestTypes) {
        const results = await ARSceneManager.performHitTest(
          screenPoint.x, 
          screenPoint.y, 
          hitType
        );
        
        if (results.length > 0) {
          // Filter results based on preferences
          const filteredResults = this.filterHitResults(results, options);
          
          if (filteredResults.length > 0) {
            console.log(`Found ${filteredResults.length} valid results with ${hitType}`);
            return filteredResults[0]; // Return the best result
          }
        }
      }
      
      console.warn('No suitable hit test results found');
      return null;
    } catch (error) {
      console.error('Smart hit test failed:', error);
      return null;
    }
  },

  filterHitResults(results: ARHitTestResult[], options: any): ARHitTestResult[] {
    const {
      maxDistance,
      minPlaneSize,
      preferHorizontalPlanes
    } = options;
    
    return results.filter(result => {
      // Filter by distance
      if (result.distance > maxDistance) {
        return false;
      }
      
      // Filter by plane size (if available)
      if (result.planeId && minPlaneSize > 0) {
        // This is simplified - in production you'd check plane geometry
        // For now, assume planes meet minimum size requirement
      }
      
      // Prefer horizontal planes if specified
      if (preferHorizontalPlanes && result.planeId) {
        // In production, you'd check plane alignment
        // For now, assume all planes are valid
      }
      
      return true;
    });
  },

  async performContinuousHitTesting(
    startPoint: { x: number; y: number },
    endPoint: { x: number; y: number },
    sampleCount: number = 10,
    type: string = 'existingPlane'
  ): Promise<ARHitTestResult[]> {
    try {
      console.log(`Performing continuous hit testing from (${startPoint.x}, ${startPoint.y}) to (${endPoint.x}, ${endPoint.y})`);
      
      const results: ARHitTestResult[] = [];
      const stepX = (endPoint.x - startPoint.x) / sampleCount;
      const stepY = (endPoint.y - startPoint.y) / sampleCount;
      
      for (let i = 0; i <= sampleCount; i++) {
        const x = startPoint.x + (stepX * i);
        const y = startPoint.y + (stepY * i);
        const pointResults = await ARSceneManager.performHitTest(x, y, type);
        
        results.push(...pointResults);
      }
      
      // Find the best result (closest to target)
      const bestResult = this.findBestHitResult(results, endPoint);
      
      return bestResult ? [bestResult] : [];
    } catch (error) {
      console.error('Continuous hit testing failed:', error);
      return [];
    }
  },

  findBestHitResult(results: ARHitTestResult[], target: { x: number; y: number }): ARHitTestResult | null {
    if (results.length === 0) {
      return null;
    }
    
    // Calculate distance to target for each result
    const resultsWithDistance = results.map(result => ({
      ...result,
      distanceToTarget: Math.sqrt(
        Math.pow(result.position.x - target.x, 2) +
        Math.pow(result.position.y - target.y, 2) +
        Math.pow(result.position.z - target.z, 2)
      ),
      score: 0 // Will be calculated below
    }));
    
    // Score each result based on multiple factors
    for (const resultWithDistance of resultsWithDistance) {
      let score = 100;
      
      // Distance scoring (closer is better)
      const distanceScore = Math.max(0, 100 - (resultWithDistance.distanceToTarget * 10));
      score += distanceScore;
      
      // Plane preference scoring
      if (resultWithDistance.planeId) {
        score += 20; // Prefer plane hits
      }
      
      // Alignment scoring (prefers horizontal surfaces)
      if (result.planeId && Math.abs(resultWithDistance.position.z) < 0.1) {
        score += 15;
      }
      
      // Normal vector scoring (prefer surfaces facing up)
      if (result.transform && result.transform.length >= 16) {
        // Extract normal from transform matrix
        const normalZ = result.transform[10]; // Z component of normal vector
        if (normalZ > 0.9) { // Normal pointing upward
          score += 10;
        }
      }
      
      resultWithDistance.score = score;
    }
    
    // Sort by score (descending) and return the best
    resultsWithDistance.sort((a, b) => b.score - a.score);
    return resultsWithDistance[0];
  },

  async performSurfaceAnalysis(
    hitResult: ARHitTestResult
  ): Promise<{
    surfaceType: 'horizontal' | 'vertical' | 'unknown';
    isFlat: boolean;
    normal: { x: number; y: number; z: number };
    area: number;
  }> {
    if (!hitResult.planeId) {
      return {
        surfaceType: 'unknown',
        isFlat: false,
        normal: { x: 0, y: 0, z: 1 },
        area: 0,
      };
    }
    
    try {
      // This is a simplified implementation
      // In production, you'd analyze the plane geometry from the AR session
      
      const transform = hitResult.transform;
      if (transform && transform.length >= 16) {
        // Extract normal vector from transform matrix (elements 8,9,10 are x,y,z components of normal)
        const normalX = transform[8];
        const normalY = transform[9];
        const normalZ = transform[10];
        const normalMagnitude = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
        
        // Determine if surface is flat (normal is close to vertical)
        const isFlat = Math.abs(normalZ) > 0.95;
        
        // Determine surface type based on normal vector
        let surfaceType: 'horizontal' | 'vertical' | 'unknown';
        if (isFlat) {
          surfaceType = 'horizontal';
        } else if (Math.abs(normalX) > 0.7 || Math.abs(normalY) > 0.7) {
          surfaceType = 'vertical';
        }
        
        return {
          surfaceType,
          isFlat,
          normal: { x: normalX / normalMagnitude, y: normalY / normalMagnitude, z: normalZ / normalMagnitude },
          area: 100 // Simplified area calculation
        };
      }
    } catch (error) {
      console.error('Surface analysis failed:', error);
      return {
        surfaceType: 'unknown',
        isFlat: false,
        normal: { x: 0, y: 0, z: 1 },
        area: 0,
      };
    }
  },

  async validateHitTestResult(
    result: ARHitTestResult,
    validationOptions: {
      minConfidence: number;
      maxDistance: number;
      preferredSurfaces: string[];
    } = {}
  ): Promise<boolean> {
    const { minConfidence, maxDistance, preferredSurfaces } = validationOptions;
    
    // Check distance
    if (result.distance > maxDistance) {
      console.warn(`Hit test result too far: ${result.distance} > ${maxDistance}`);
      return false;
    }
    
    // Check surface preference
    const surfaceAnalysis = await this.performSurfaceAnalysis(result);
    if (preferredSurfaces.length > 0 && !preferredSurfaces.includes(surfaceAnalysis.surfaceType)) {
      console.warn(`Hit test result surface type not preferred: ${surfaceAnalysis.surfaceType}`);
      return false;
    }
    
    // Check if the surface is suitable for placing annotations
    if (!surfaceAnalysis.isFlat && minConfidence > 0.7) {
      console.warn(`Surface not flat enough for annotation placement: ${surfaceAnalysis.isFlat}`);
      return false;
    }
    
    console.log(`Hit test result validated successfully`);
    return true;
  },

  // Utility methods for hit testing
  calculateHitTestVisualization(startPoint: { x: number; y: number }, results: ARHitTestResult[]): Array<{
    point: { x: number; y: number };
    result: ARHitTestResult;
    distance: number;
    color: string;
  }> {
    const maxDistance = Math.max(...results.map(r => r.distance));
    
    return results.map(result => ({
      point: {
        x: result.position.x,
        y: result.position.y,
      },
      result,
      distance: result.distance,
      color: result.distance < 2 ? '#00FF00' : result.distance < 5 ? '#FFD700' : '#FFA500',
    }));
  },

  getRecommendedPlacementStrategy(surface: {
    surfaceType: string;
    isFlat: boolean;
    normal: { x: number; y: number; z: number };
  }): {
    if (surface.surfaceType === 'horizontal' && surface.isFlat) {
      return {
        strategy: 'place_on_surface',
        confidence: 'high',
        recommendation: 'Surface is flat and horizontal - ideal for placing annotations',
        preferredAnnotationTypes: ['sphere', 'box', 'text'],
      };
    } else if (surface.surfaceType === 'vertical' && surface.isFlat) {
      return {
        strategy: 'place_on_surface',
        confidence: 'medium',
        recommendation: 'Surface is flat and vertical - suitable for annotations',
        preferredAnnotationTypes: ['sphere', 'box', 'text'],
      };
    } else {
      return {
        strategy: 'place_in_space',
        confidence: 'low',
        recommendation: 'No suitable surface detected - recommend 3D placement in air',
        preferredAnnotationTypes: ['sphere', 'arrow'],
      };
    }
  },
};

export default ARHitTestingService;