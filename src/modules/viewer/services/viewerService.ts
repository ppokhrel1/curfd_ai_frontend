import * as THREE from 'three';
import { ExportOptions, ModelData } from '../types/viewer.type';

class ViewerService {
  /**
   * Load 3D model from file
   */
  async loadModel(file: File): Promise<ModelData> {
    try {
      // This would integrate with actual model loaders (GLTFLoader, OBJLoader, etc.)
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0x22c55e });
      
      return {
        id: this.generateId(),
        name: file.name,
        geometry,
        material,
        position: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
      };
    } catch (error) {
      console.error('Error loading model:', error);
      throw new Error('Failed to load model');
    }
  }

  /**
   * Export model to specified format
   */
  async exportModel(model: ModelData, options: ExportOptions): Promise<Blob> {
    try {
      // This would integrate with exporters (GLTFExporter, OBJExporter, etc.)
      const { format, binary } = options;
      
      // Placeholder - implement actual export logic
      const data = JSON.stringify({
        format,
        model: model.name,
        exported: new Date().toISOString(),
      });
      
      return new Blob([data], { type: 'application/json' });
    } catch (error) {
      console.error('Error exporting model:', error);
      throw new Error('Failed to export model');
    }
  }

  /**
   * Calculate model statistics
   */
  calculateStats(geometry: THREE.BufferGeometry) {
    const positions = geometry.attributes.position;
    const indices = geometry.index;
    
    return {
      vertices: positions ? positions.count : 0,
      faces: indices ? indices.count / 3 : 0,
      triangles: indices ? indices.count / 3 : 0,
      materials: 1, // This would count actual materials
    };
  }

  /**
   * Optimize geometry
   */
  optimizeGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    // Remove duplicate vertices
    const optimized = geometry.clone();
    
    // Compute vertex normals if not present
    if (!optimized.attributes.normal) {
      optimized.computeVertexNormals();
    }
    
    // Compute bounding box and sphere
    optimized.computeBoundingBox();
    optimized.computeBoundingSphere();
    
    return optimized;
  }

  /**
   * Center model in scene
   */
  centerModel(geometry: THREE.BufferGeometry): THREE.Vector3 {
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    
    if (!boundingBox) {
      return new THREE.Vector3(0, 0, 0);
    }
    
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    
    return center;
  }

  /**
   * Scale model to fit in view
   */
  scaleToFit(geometry: THREE.BufferGeometry, targetSize: number = 2): number {
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox;
    
    if (!boundingBox) {
      return 1;
    }
    
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const maxDimension = Math.max(size.x, size.y, size.z);
    const scale = targetSize / maxDimension;
    
    geometry.scale(scale, scale, scale);
    
    return scale;
  }

  /**
   * Take screenshot of canvas
   */
  async takeScreenshot(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create screenshot'));
        }
      }, 'image/png');
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate model file
   */
  validateModelFile(file: File): { valid: boolean; error?: string } {
    const validExtensions = ['.gltf', '.glb', '.obj', '.fbx', '.stl'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: `Invalid file format. Supported formats: ${validExtensions.join(', ')}`,
      };
    }
    
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 50MB limit',
      };
    }
    
    return { valid: true };
  }

  /**
   * Create grid helper
   */
  createGrid(size: number = 20, divisions: number = 20): THREE.GridHelper {
    const grid = new THREE.GridHelper(size, divisions, 0x22c55e, 0x4ade80);
    return grid;
  }

  /**
   * Create axes helper
   */
  createAxesHelper(size: number = 5): THREE.AxesHelper {
    return new THREE.AxesHelper(size);
  }
}

// Export singleton instance
export const viewerService = new ViewerService();