import { CustomEnvironment } from '@/modules/viewer/components/CustomEnvironment';
import { useThree } from '@react-three/fiber';
import { render } from '@testing-library/react';
import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({
  useThree: vi.fn(),
}));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof THREE>();
  return {
    ...actual,
    WebGLCubeRenderTarget: vi.fn(function() {
      return {
        texture: {},
        dispose: vi.fn(),
      };
    }),
    PMREMGenerator: vi.fn(function() {
      return {
        compileEquirectangularShader: vi.fn(),
        fromCubemap: vi.fn().mockReturnValue({ texture: { isTexture: true, dispose: vi.fn() } }),
        dispose: vi.fn(),
      };
    }),
    CubeCamera: vi.fn(function() {
      return {
        update: vi.fn(),
      };
    }),
  };
});

describe('CustomEnvironment', () => {
  const mockScene = {
    environment: null as any,
    add: vi.fn(),
    clear: vi.fn(),
  };

  const mockGl = {
    domElement: document.createElement('canvas'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useThree as any).mockReturnValue({
      gl: mockGl,
      scene: mockScene,
    });
  });

  it('should generate and set environment map on mount', () => {
    render(<CustomEnvironment />);

    expect(THREE.PMREMGenerator).toHaveBeenCalledWith(mockGl);
    
    expect(mockScene.environment).toBeDefined();
    expect(mockScene.environment).toHaveProperty('isTexture', true);
  });

  it('should restore original environment and dispose resources on unmount', () => {
    const originalEnv = { isTexture: true, name: 'original' };
    mockScene.environment = originalEnv;

    const { unmount } = render(<CustomEnvironment />);
    
    expect(mockScene.environment).not.toBe(originalEnv);
    
    unmount();

    expect(mockScene.environment).toBe(originalEnv);
  });
});
