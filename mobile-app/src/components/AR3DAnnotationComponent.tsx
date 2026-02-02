import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface ARAnnotation3D {
  id: string;
  type: 'sphere' | 'box' | 'arrow' | 'text' | 'circle' | 'line';
  position: Point3D;
  rotation?: Point3D;
  scale?: Point3D;
  color: string;
  text?: string;
  strokeWidth?: number;
  fontSize?: number;
  createdAt: number;
  createdBy: string;
}

const AR3DAnnotationComponent: React.FC<{ annotation: ARAnnotation3D; onPress?: (annotation: ARAnnotation3D) => void }> = ({ 
  annotation, 
  onPress 
}) => {
  const [isSelected, setIsSelected] = useState(false);

  const handlePress = () => {
    setIsSelected(!isSelected);
    onPress?.(annotation);
  };

  const renderAnnotation = () => {
    const { type, position, color, text, strokeWidth, fontSize } = annotation;
    
    // Project 3D position to 2D screen space
    const screenPosition = project3DToScreen(position);

    switch (type) {
      case 'sphere':
        return (
          <View style={[styles.sphere, { backgroundColor: color, borderColor: isSelected ? '#FFD700' : color }]}>
            <Text style={styles.annotationText}>3D</Text>
          </View>
        );
      
      case 'box':
        return (
          <View style={[styles.box, { backgroundColor: color, borderColor: isSelected ? '#FFD700' : color }]}>
            <Text style={styles.annotationText}>BOX</Text>
          </View>
        );
      
      case 'arrow':
        return (
          <View style={[styles.arrow, { borderColor: isSelected ? '#FFD700' : color }]}>
            <View style={styles.arrowLine} />
            <View style={[styles.arrowHead, { backgroundColor: color }]} />
          </View>
        );
      
      case 'text':
        return (
          <View style={[styles.textBox, { backgroundColor: 'transparent', borderColor: color }]}>
            <Text style={[styles.annotationText, { color, fontSize }]}>{text}</Text>
          </View>
        );
      
      case 'circle':
        return (
          <View style={[styles.circle, { borderColor: isSelected ? '#FFD700' : color }]} />
        );
      
      case 'line':
        return (
          <View style={[styles.line, { borderColor: color, height: strokeWidth }]} />
        );
      
      default:
        return null;
    }
  };

  const project3DToScreen = (worldPosition: Point3D): { x: number; y: number } => {
    // Simplified 3D to 2D projection
    // In a real implementation, this would use the camera transform from AR session
    const distance = Math.sqrt(
      Math.pow(worldPosition.x, 2) + 
      Math.pow(worldPosition.y, 2) + 
      Math.pow(worldPosition.z, 2)
    );
    
    const scale = Math.max(100, 1000 / distance); // Scale based on distance
    const centerX = Dimensions.get('window').width / 2;
    const centerY = Dimensions.get('window').height / 2;
    
    return {
      x: centerX + worldPosition.x * scale,
      y: centerY + worldPosition.y * scale,
    };
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { left: screenPosition.x - 20, top: screenPosition.y - 20 }
      ]}
      onPress={handlePress}
      activeOpacity={isSelected ? 0.8 : 1}
    >
      {renderAnnotation()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 4,
  },
  sphere: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    width: 40,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLine: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: '#333',
    left: 0,
    top: 9,
  },
  arrowHead: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderTopColor: 'inherit',
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    borderRightWidth: 4,
    borderRightColor: 'transparent',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderBottomWidth: 8,
    borderBottomColor: 'inherit',
    transform: [{ rotate: '45deg' }],
  },
  textBox: {
    minWidth: 60,
    maxWidth: 200,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  line: {
    position: 'absolute',
    backgroundColor: '#333',
  },
  annotationText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
});

export default AR3DAnnotationComponent;