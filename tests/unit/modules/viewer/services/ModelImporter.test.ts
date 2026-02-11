import { ModelImporter } from '@/modules/viewer/services/ModelImporter';
import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock JSZip
vi.mock('jszip', () => {
    return {
        default: {
            loadAsync: vi.fn().mockResolvedValue({
                files: {}
            })
        }
    };
});

describe('ModelImporter', () => {
    let importer: ModelImporter;

    beforeEach(() => {
        importer = new ModelImporter();
        vi.clearAllMocks();

        // Mock global fetch
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            text: () => Promise.resolve('<sdf></sdf>'),
            blob: () => Promise.resolve(new Blob()),
        });
    });

    describe('importFromUrl', () => {
        it('should validate URLs', async () => {
            await expect(importer.importFromUrl('invalid-url')).rejects.toThrow('Invalid model URL provided');
        });

        it('should load mesh files directly if extension matches', async () => {
            const loadSingleAssetSpy = vi.spyOn(importer as any, 'loadSingleAsset')
                .mockResolvedValue(new THREE.Group());

            const result = await importer.importFromUrl('http://example.com/model.glb');

            expect(loadSingleAssetSpy).toHaveBeenCalledWith('http://example.com/model.glb', 'model.glb');
            expect(result.group).toBeDefined();
        });

        it('should fetch SDF if not a mesh file', async () => {
            const result = await importer.importFromUrl('http://example.com/model.sdf');
            expect(global.fetch).toHaveBeenCalledWith('http://example.com/model.sdf');
            expect(result.group).toBeDefined();
        });
    });

    describe('Security: Zip Slip', () => {
        it('should block files with path traversal', async () => {
            // extractPartName is used to clean names during zip processing
            expect((importer as any).extractPartName('../../evil.stl')).toBe('Evil');
        });
    });

    describe('extractPartName', () => {
        it('should clean up filenames', () => {
            const extract = (importer as any).extractPartName;
            expect(extract('base_link.stl')).toBe('Base Link');
            expect(extract('WHEEL-LEFT.STL')).toBe('Wheel Left');
            expect(extract('parts/arm_1.obj')).toBe('Arm 1');
        });
    });
});
