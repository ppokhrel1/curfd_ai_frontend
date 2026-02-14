import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import JSZip from 'jszip';
import * as THREE from 'three';
import { ModelImporter } from '@/modules/viewer/services/ModelImporter';
import type { SDFVisual } from '@/modules/viewer/utils/SDFParser';

// --- Hoisted mock factories ---
const { mockSTLLoaderLoad, mockOBJLoaderLoad, mockGLTFLoaderLoad } = vi.hoisted(() => ({
  mockSTLLoaderLoad: vi.fn(),
  mockOBJLoaderLoad: vi.fn(),
  mockGLTFLoaderLoad: vi.fn(),
}));

const mockAnalyze = vi.hoisted(() => vi.fn().mockReturnValue({
  volume: 100,
  surfaceArea: 200,
  dimensions: { x: 1, y: 2, z: 3 },
}));

const mockParse = vi.hoisted(() => vi.fn());

// Proper fetch mock response factory
const createMockResponse = (body: string | Blob, ok = true, status = 200) => ({
  ok,
  status,
  statusText: ok ? 'OK' : 'Not Found',
  text: vi.fn().mockResolvedValue(body),
  blob: vi.fn().mockResolvedValue(body instanceof Blob ? body : new Blob([body])),
});

// Mock modules using the exact import specifiers from ModelImporter
vi.mock('jszip', () => ({
  default: {
    loadAsync: vi.fn(),
  },
}));

// Provide actual classes for three-stdlib constructors
vi.mock('three-stdlib', () => {
  class MockSTLLoader {
    load = mockSTLLoaderLoad;
  }
  class MockOBJLoader {
    load = mockOBJLoaderLoad;
  }
  class MockGLTFLoader {
    load = mockGLTFLoaderLoad;
  }
  return {
    STLLoader: MockSTLLoader,
    OBJLoader: MockOBJLoader,
    GLTFLoader: MockGLTFLoader,
  };
});

// Use relative paths to match ModelImporter's imports
vi.mock('../utils/GeometryAnalyzer', () => ({
  GeometryAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: mockAnalyze,
  })),
}));

vi.mock('../utils/SDFParser', () => ({
  SDFParser: vi.fn().mockImplementation(() => ({
    parse: mockParse,
  })),
}));

// Mock global APIs
const mockFetch = vi.fn();
global.fetch = mockFetch;

global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

// Suppress console logs during tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('ModelImporter', () => {
  let importer: ModelImporter;

  beforeEach(() => {
    vi.clearAllMocks();
    importer = new ModelImporter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize all dependencies', () => {
      expect(importer).toBeInstanceOf(ModelImporter);
      expect(importer['sdfParser']).toBeDefined();
      expect(importer['stlLoader']).toBeDefined();
      expect(importer['objLoader']).toBeDefined();
      expect(importer['gltfLoader']).toBeDefined();
      expect(importer['analyzer']).toBeDefined();
      expect(importer['assets']).toEqual([]);
      expect(importer['meshCache']).toBeInstanceOf(Map);
    });
  });

  describe('importFromUrl', () => {
    const validSdfUrl = 'https://example.com/model.sdf';
    const validYamlUrl = 'https://example.com/model.yaml';
    const specification = { model_name: 'TestModel' };
    const assets = [{ filename: 'mesh.stl', url: 'blob:mesh' }];

    it('should throw if sdfUrl is not a valid URL', async () => {
      await expect(importer.importFromUrl('invalid-url')).rejects.toThrow(
        'Invalid model URL provided'
      );
    });

    it('should throw if yamlUrl is provided but invalid', async () => {
      await expect(
        importer.importFromUrl('https://valid.com', 'invalid-yaml')
      ).rejects.toThrow('Invalid model URL provided');
    });

    it('should load a ZIP file from URL', async () => {
      const zipUrl = 'https://example.com/model.zip';
      mockFetch.mockResolvedValueOnce(createMockResponse(new Blob(['fake zip'])));

      const importZipSpy = vi
        .spyOn(importer, 'importZip' as any)
        .mockResolvedValue({
          group: new THREE.Group(),
          name: 'Model',
          specification: {},
          assets: [],
        });

      const result = await importer.importFromUrl(zipUrl);

      expect(mockFetch).toHaveBeenCalledWith(zipUrl);
      expect(importZipSpy).toHaveBeenCalled();
      expect(result.group).toBeDefined();
    });

    it('should load a single mesh file (GLB) directly', async () => {
      const meshUrl = 'https://example.com/model.glb';
      const originalFilename = 'custom.glb';
      mockFetch.mockResolvedValueOnce(createMockResponse(new Blob(['fake glb'])));

      const loadSingleAssetSpy = vi
        .spyOn(importer, 'loadSingleAsset' as any)
        .mockResolvedValue(new THREE.Mesh());

      const result = await importer.importFromUrl(
        meshUrl,
        undefined,
        undefined,
        [],
        originalFilename
      );

      expect(loadSingleAssetSpy).toHaveBeenCalledWith(meshUrl, originalFilename);
      expect(result.group.children[0].children.length).toBe(1);
    });

    it('should load a single mesh file (blob) with fallback name', async () => {
      const blobUrl = 'blob:12345';
      mockFetch.mockResolvedValueOnce(createMockResponse(new Blob(['fake mesh'])));

      const loadSingleAssetSpy = vi
        .spyOn(importer, 'loadSingleAsset' as any)
        .mockResolvedValue(new THREE.Mesh());

      const result = await importer.importFromUrl(blobUrl);

      expect(loadSingleAssetSpy).toHaveBeenCalledWith(blobUrl, 'model.glb');
      expect(result.group.children[0].children.length).toBe(1);
    });


  });

  describe('importZip', () => {
    const mockZipFile = (files: Record<string, any>) => {
      (JSZip.loadAsync as any).mockResolvedValue({
        files,
        file: (name: string) => files[name] || null,
      });
    };

    it('should handle missing SDF and load meshes directly', async () => {
      const mockFiles = {
        'part.stl': { 
          dir: false, 
          name: 'part.stl', 
          async: vi.fn().mockResolvedValue(new Blob()) 
        },
        'assembly.py': { 
          dir: false, 
          name: 'assembly.py', 
          async: vi.fn().mockResolvedValue('print("hello")') 
        },
      };
      mockZipFile(mockFiles);

      const loadMeshesDirectlySpy = vi
        .spyOn(importer, 'loadMeshesDirectly' as any)
        .mockImplementation(async (files, group) => {
          group.add(new THREE.Mesh());
        });

      const result = await importer.importZip(new File([], 'model.zip'));

      expect(loadMeshesDirectlySpy).toHaveBeenCalled();
      expect(result.group.children[0].children.length).toBe(1);
      expect(result.scad).toBe('print("hello")');
    });

    it('should parse specification.json if present', async () => {
      const mockFiles = {
        'specification.json': {
          dir: false,
          name: 'specification.json',
          async: vi.fn().mockResolvedValue(JSON.stringify({ model_name: 'SpecModel' })),
        },
      };
      mockZipFile(mockFiles);

      const result = await importer.importZip(new File([], 'model.zip'));

      expect(result.name).toBe('SpecModel');
      expect(result.specification).toEqual({ model_name: 'SpecModel' });
    });

    it('should extract Python code from assembly.py', async () => {
      const mockFiles = {
        'assembly.py': { 
          dir: false, 
          name: 'assembly.py', 
          async: vi.fn().mockResolvedValue('python code') 
        },
      };
      mockZipFile(mockFiles);

      const result = await importer.importZip(new File([], 'model.zip'));

      expect(result.scad).toBe('python code');
    });

    it('should extract Python code from any .py file if assembly.py missing', async () => {
      const mockFiles = {
        'script.py': { 
          dir: false, 
          name: 'script.py', 
          async: vi.fn().mockResolvedValue('python code') 
        },
      };
      mockZipFile(mockFiles);

      const result = await importer.importZip(new File([], 'model.zip'));

      expect(result.scad).toBe('python code');
    });

    it('should extract SCAD code if no Python files', async () => {
      const mockFiles = {
        'model.scad': { 
          dir: false, 
          name: 'model.scad', 
          async: vi.fn().mockResolvedValue('scad code') 
        },
      };
      mockZipFile(mockFiles);

      const result = await importer.importZip(new File([], 'model.zip'));

      expect(result.scad).toBe('scad code');
    });

    it('should block path traversal in filenames', async () => {
      const mockFiles = {
        '../bad.stl': { 
          dir: false, 
          name: '../bad.stl', 
          async: vi.fn().mockResolvedValue(new Blob()) 
        },
      };
      mockZipFile(mockFiles);

      const loadMeshesDirectlySpy = vi.spyOn(importer, 'loadMeshesDirectly' as any);

      await importer.importZip(new File([], 'model.zip'));

      expect(loadMeshesDirectlySpy).not.toHaveBeenCalled();
    });
  });

  describe('loadSingleAsset', () => {
    it('should load a mesh and apply material based on filename', async () => {
      const url = 'blob:mesh';
      const filename = 'wheel.stl';
      const mockMesh = new THREE.Mesh();
      vi.spyOn(importer, 'loadMeshAsObject' as any).mockResolvedValue(mockMesh);

      const result = await importer.loadSingleAsset(url, filename);

      expect(importer['loadMeshAsObject']).toHaveBeenCalledWith(url, filename);
      expect(result.name).toBe('Wheel');
      expect((result as THREE.Mesh).material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect((result as THREE.Mesh).userData.originalColor).toBeDefined();
      expect((result as THREE.Mesh).userData.sourceFile).toBe(filename);
    });
  });

  describe('loadVisual', () => {
    it('should load visual from asset if available', async () => {
      const visual: SDFVisual = {
        name: 'visual',
        pose: { position: new THREE.Vector3(1,2,3), quaternion: new THREE.Quaternion() },
        scale: new THREE.Vector3(2,2,2),
        meshPath: 'mesh.stl',
      };
      importer['assets'] = [{ filename: 'mesh.stl', url: 'blob:123' }];
      const createVisualObjectSpy = vi
        .spyOn(importer, 'createVisualObject' as any)
        .mockResolvedValue(new THREE.Mesh());

      await importer['loadVisual'](visual, 'http://example.com/model.sdf');

      expect(createVisualObjectSpy).toHaveBeenCalledWith(
        'blob:123',
        'mesh.stl',
        visual
      );
    });

    it('should fallback to box geometry on error', async () => {
      const visual: SDFVisual = {
        name: 'visual',
        pose: { position: new THREE.Vector3(1,2,3), quaternion: new THREE.Quaternion() },
        scale: new THREE.Vector3(2,2,2),
        meshPath: 'missing.stl',
      };
      importer['assets'] = [];
      vi.spyOn(importer, 'createVisualObject' as any).mockRejectedValue(new Error('load failed'));

      const result = await importer['loadVisual'](visual, 'http://example.com/model.sdf');

      expect(result).toBeInstanceOf(THREE.Mesh);
      expect(result.geometry).toBeInstanceOf(THREE.BoxGeometry);
      expect(result.position).toEqual(new THREE.Vector3(1,2,3));
    });
  });

  describe('createVisualObject', () => {
    it('should load mesh, apply material and transforms', async () => {
      const meshUrl = 'blob:mesh';
      const meshName = 'part.stl';
      const visual: SDFVisual = {
        name: 'visual',
        pose: { position: new THREE.Vector3(1,2,3), quaternion: new THREE.Quaternion(0,0,0,1) },
        scale: new THREE.Vector3(2,2,2),
        meshPath: '',
      };
      const mockMesh = new THREE.Mesh();
      vi.spyOn(importer, 'loadMeshAsObject' as any).mockResolvedValue(mockMesh);

      const result = await importer['createVisualObject'](meshUrl, meshName, visual);

      expect(importer['loadMeshAsObject']).toHaveBeenCalledWith(meshUrl, meshName);
      expect(result.name).toBe('Part');
      expect(result.position).toEqual(new THREE.Vector3(1,2,3));
      expect(result.scale).toEqual(new THREE.Vector3(2,2,2));
    });
  });

  describe('extractPartName', () => {
    it('should clean up filename to part name', () => {
      expect(importer['extractPartName']('wheel_left.stl')).toBe('Wheel Left');
      expect(importer['extractPartName']('motor-housing.glb')).toBe('Motor Housing');
      expect(importer['extractPartName']('path/to/part.obj')).toBe('Part');
    });
  });

  describe('getMaterialProperties', () => {
    it('should return default properties for unknown part', () => {
      const props = importer['getMaterialProperties']('unknown');
      expect(props.color).toBeDefined();
      expect(props.roughness).toBe(0.5);
      expect(props.metalness).toBe(0.3);
    });

    it('should apply metal properties for metal-like names', () => {
      const props = importer['getMaterialProperties']('steel bracket');
      expect(props.metalness).toBe(0.85);
      expect(props.roughness).toBe(0.25);
    });

    it('should apply rubber properties for tire names', () => {
      const props = importer['getMaterialProperties']('tire');
      expect(props.metalness).toBe(0.05);
      expect(props.roughness).toBe(0.95);
      expect(props.color).toEqual(new THREE.Color(0x1a1a1a));
    });

    it('should apply glass properties', () => {
      const props = importer['getMaterialProperties']('glass window');
      expect(props.transparent).toBe(true);
      expect(props.opacity).toBe(0.3);
      expect(props.metalness).toBe(0.9);
    });

    it('should apply emissive properties for lights', () => {
      const props = importer['getMaterialProperties']('led light');
      expect(props.emissiveIntensity).toBe(2.0);
      expect(props.toneMapped).toBe(false);
    });
  });

  describe('finalizeModel', () => {
    it('should rotate the group by -90 degrees around X', () => {
      const group = new THREE.Group();
      const updateMatrixWorldSpy = vi.spyOn(group, 'updateMatrixWorld');
      const updateWorldMatrixSpy = vi.spyOn(group, 'updateWorldMatrix');

      importer['finalizeModel'](group);

      expect(updateMatrixWorldSpy).toHaveBeenCalledWith(true);
      expect(updateWorldMatrixSpy).toHaveBeenCalledWith(true, true);
      expect(group.rotation.x).toBe(-Math.PI / 2);
    });
  });

  describe('getColorForPart', () => {
    it('should return consistent colors based on part name', () => {
      expect(importer['getColorForPart']('wheel')).toBe(0x2d3748);
      expect(importer['getColorForPart']('motor')).toBe(0x2563eb);
      // "link_1" is caught by the "connector" block (includes "link") before the numbered link block
      expect(importer['getColorForPart']('link_1')).toBe(0x8b5cf6); // 0x8b5cf6 = 9133302
      expect(importer['getColorForPart']('battery')).toBe(0xd97706);
    });

    it('should generate harmonic color for unknown names', () => {
      const color1 = importer['getColorForPart']('randompart');
      const color2 = importer['getColorForPart']('randompart');
      expect(color1).toBe(color2); // deterministic
    });
  });

  describe('loadMeshAsObject', () => {
    it('should load STL and return mesh', async () => {
      const url = 'blob:stl';
      const filename = 'model.stl';
      const geometry = new THREE.BufferGeometry();
      mockSTLLoaderLoad.mockImplementation((url, onLoad) => onLoad(geometry));

      const result = await importer['loadMeshAsObject'](url, filename);

      expect(result).toBeInstanceOf(THREE.Mesh);
      expect(result.geometry).toBe(geometry);
    });

    it('should load OBJ and return group', async () => {
      const url = 'blob:obj';
      const filename = 'model.obj';
      const group = new THREE.Group();
      mockOBJLoaderLoad.mockImplementation((url, onLoad) => onLoad(group));

      const result = await importer['loadMeshAsObject'](url, filename);

      expect(result).toBe(group);
    });

    it('should load GLTF and return scene', async () => {
      const url = 'blob:glb';
      const filename = 'model.glb';
      const gltf = { scene: new THREE.Group() };
      mockGLTFLoaderLoad.mockImplementation((url, onLoad) => onLoad(gltf));

      const result = await importer['loadMeshAsObject'](url, filename);

      expect(result).toBe(gltf.scene);
    });

    it('should throw for unsupported format when not a blob URL', async () => {
      const url = 'http://example.com/model.xyz';
      const filename = 'model.xyz';

      await expect(importer['loadMeshAsObject'](url, filename)).rejects.toThrow(
        'Unsupported format: xyz for file model.xyz'
      );
    });
  });

  describe('parsePhysicsFromYaml', () => {
    it('should parse key-value pairs from yaml string', () => {
      const yaml = 'mass: 10.5\ninertia: [1,2,3]\nvalid: true\n';
      const result = importer['parsePhysicsFromYaml'](yaml);
      expect(result).toEqual({
        mass: 10.5,
        inertia: '[1,2,3]',
        valid: 'true',
      });
    });

    it('should return empty object for empty yaml', () => {
      expect(importer['parsePhysicsFromYaml']('')).toEqual({});
    });
  });

  describe('loadMeshesDirectly', () => {
    it('should load STL files and add to group', async () => {
      const meshFiles = [
        { name: 'part.stl', async: vi.fn().mockResolvedValue(new Blob()) },
      ];
      const group = new THREE.Group();
      const geometry = new THREE.BufferGeometry();
      mockSTLLoaderLoad.mockImplementation((url, onLoad) => onLoad(geometry));

      await importer['loadMeshesDirectly'](meshFiles, group);

      expect(group.children.length).toBe(1);
      expect(group.children[0]).toBeInstanceOf(THREE.Mesh);
      expect(group.children[0].name).toBe('Part');
    });

    it('should load GLB files and add to group', async () => {
      const meshFiles = [
        { name: 'model.glb', async: vi.fn().mockResolvedValue(new Blob()) },
      ];
      const group = new THREE.Group();
      const gltf = { scene: new THREE.Group() };
      mockGLTFLoaderLoad.mockImplementation((url, onLoad) => onLoad(gltf));

      await importer['loadMeshesDirectly'](meshFiles, group);

      expect(group.children.length).toBe(1);
      expect(group.children[0]).toBe(gltf.scene);
    });

    it('should skip unsupported formats', async () => {
      const meshFiles = [
        { name: 'model.txt', async: vi.fn().mockResolvedValue(new Blob()) },
      ];
      const group = new THREE.Group();

      await importer['loadMeshesDirectly'](meshFiles, group);

      expect(group.children.length).toBe(0);
    });
  });
});