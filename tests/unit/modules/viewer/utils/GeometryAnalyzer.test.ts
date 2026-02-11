import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { GeometryAnalyzer } from '../../../../../src/modules/viewer/utils/GeometryAnalyzer';

describe('GeometryAnalyzer', () => {
    const analyzer = new GeometryAnalyzer();

    it('should calculate metrics for a simple box', () => {
        // Create a 1x1x1 box
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial();
        const mesh = new THREE.Mesh(geometry, material);

        // Ensure index exists for the test logic or use non-indexed
        // BoxGeometry is indexed by default in recent Three versions

        const group = new THREE.Group();
        group.add(mesh);

        const metrics = analyzer.analyze(group);

        expect(metrics.volume).toBeCloseTo(1, 4); // 1 * 1 * 1 = 1
        expect(metrics.surfaceArea).toBeCloseTo(6, 4); // 6 faces * 1 * 1 = 6
        expect(metrics.dimensions.x).toBeCloseTo(1, 4);
        expect(metrics.dimensions.y).toBeCloseTo(1, 4);
        expect(metrics.dimensions.z).toBeCloseTo(1, 4);
    });

    it('should scale metrics when object is scaled', () => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const mesh = new THREE.Mesh(geometry);
        mesh.scale.set(2, 2, 2); // Box becomes 2x2x2

        const group = new THREE.Group();
        group.add(mesh);

        const metrics = analyzer.analyze(group);

        expect(metrics.volume).toBeCloseTo(8, 4); // 2 * 2 * 2 = 8
        expect(metrics.surfaceArea).toBeCloseTo(24, 4); // 6 faces * 2 * 2 = 24
        expect(metrics.dimensions.x).toBeCloseTo(2, 4);
    });

    it('should handle nested objects', () => {
        const g1 = new THREE.BoxGeometry(1, 1, 1);
        const m1 = new THREE.Mesh(g1);

        const g2 = new THREE.BoxGeometry(1, 1, 1);
        const m2 = new THREE.Mesh(g2);
        m2.position.set(2, 0, 0); // Move away so they don't overlap in bounding box logic if that mattered, but simple summation here

        const group = new THREE.Group();
        group.add(m1);
        group.add(m2);

        const metrics = analyzer.analyze(group);

        expect(metrics.volume).toBeCloseTo(2, 4); // 1 + 1
        expect(metrics.surfaceArea).toBeCloseTo(12, 4); // 6 + 6
    });

    it('should handle empty group', () => {
        const group = new THREE.Group();
        const metrics = analyzer.analyze(group);

        expect(metrics.volume).toBe(0);
        expect(metrics.surfaceArea).toBe(0);
    });
});
