import { api } from '@/lib/api/client';
import { assetService } from '@/modules/viewer/services/assetService';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

describe('AssetService', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock global fetch
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            text: () => Promise.resolve('SCAD CODE CONTENT'),
        });
    });

    describe('fetchAssets', () => {
        it('should fetch assets for a job', async () => {
            const mockAssets = [{ id: '1', name: 'model.glb', type: 'glb', url: 'http://test.com/model.glb' }];
            (api.get as any).mockResolvedValue({ data: mockAssets });

            const result = await assetService.fetchAssets('job-123');

            expect(api.get).toHaveBeenCalledWith('/assets', { params: { job_id: 'job-123' } });
            expect(result).toEqual(mockAssets);
        });
    });

    describe('mapToGeneratedShape', () => {
        it('should map assets and fetch SCAD content', async () => {
            const assets = [
                { id: '1', name: 'model.glb', type: 'glb', url: 'http://test.com/model.glb', created_at: '2023-01-01' },
                { id: '2', name: 'logic.scad', type: 'scad', url: 'http://test.com/logic.scad', created_at: '2023-01-01' }
            ] as any;

            (api.get as any).mockResolvedValue({ data: [] }); // For fetchAssetMeta

            const shape = await assetService.mapToGeneratedShape('job-123', assets);

            expect(shape?.scadCode).toBe('SCAD CODE CONTENT');
            expect(global.fetch).toHaveBeenCalledWith('http://test.com/logic.scad');
            expect(shape?.id).toBe('1');
        });

        it('should handle missing SCAD files gracefully', async () => {
            const assets = [
                { id: '1', name: 'model.glb', type: 'glb', url: 'http://test.com/model.glb', created_at: '2023-01-01' }
            ] as any;

            (api.get as any).mockResolvedValue({ data: [] });

            const shape = await assetService.mapToGeneratedShape('job-123', assets);

            expect(shape?.scadCode).toBeUndefined();
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });
});
