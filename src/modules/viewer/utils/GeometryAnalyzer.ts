import * as THREE from "three";

export interface MeshMetrics {
    volume: number; // Cubic meters
    surfaceArea: number; // Square meters
    dimensions: { x: number; y: number; z: number }; // Meters
    centerOfMass: { x: number; y: number; z: number };
}

export class GeometryAnalyzer {
    /**
     * Calculate precise physics metrics for a given object hierarchy.
     * Traverses all meshes in the group and accumulates volume/area.
     */
    public analyze(object: THREE.Object3D): MeshMetrics {
        object.updateMatrixWorld(true); // Ensure world matrices are up to date
        let totalVolume = 0;
        let totalArea = 0;
        const box = new THREE.Box3().setFromObject(object);
        const size = new THREE.Vector3();
        box.getSize(size);

        object.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const geometry = mesh.geometry;

                // Ensure geometry is indexed regarding buffering
                if (!geometry.index && !geometry.attributes.position) return;

                // Apply world transform to get dimensions in correct scale
                // For volume/area we need world scale
                const worldScale = new THREE.Vector3();
                mesh.getWorldScale(worldScale);

                // Analyze this specific mesh
                const metrics = this.analyzeGeometry(geometry, worldScale);
                totalVolume += metrics.volume;
                totalArea += metrics.area;
            }
        });

        // Validating results - avoid NaN or negative zero
        totalVolume = Math.abs(totalVolume);
        totalArea = Math.abs(totalArea);

        const center = new THREE.Vector3();
        box.getCenter(center);

        return {
            volume: totalVolume,
            surfaceArea: totalArea,
            dimensions: { x: size.x, y: size.y, z: size.z },
            centerOfMass: { x: center.x, y: center.y, z: center.z },
        };
    }

    private analyzeGeometry(geometry: THREE.BufferGeometry, scale: THREE.Vector3): { volume: number; area: number } {
        let vol = 0;
        let area = 0;

        const posAttr = geometry.attributes.position;
        const indexAttr = geometry.index;

        // Helper to get scaled vertex
        const p1 = new THREE.Vector3();
        const p2 = new THREE.Vector3();
        const p3 = new THREE.Vector3();

        if (indexAttr) {
            // Indexed geometry
            for (let i = 0; i < indexAttr.count; i += 3) {
                this.getVertex(posAttr, indexAttr.getX(i), p1, scale);
                this.getVertex(posAttr, indexAttr.getX(i + 1), p2, scale);
                this.getVertex(posAttr, indexAttr.getX(i + 2), p3, scale);

                vol += this.signedVolumeOfTriangle(p1, p2, p3);
                area += this.areaOfTriangle(p1, p2, p3);
            }
        } else {
            // Non-indexed geometry
            for (let i = 0; i < posAttr.count; i += 3) {
                this.getVertex(posAttr, i, p1, scale);
                this.getVertex(posAttr, i + 1, p2, scale);
                this.getVertex(posAttr, i + 2, p3, scale);

                vol += this.signedVolumeOfTriangle(p1, p2, p3);
                area += this.areaOfTriangle(p1, p2, p3);
            }
        }

        return { volume: vol, area: area };
    }

    private getVertex(pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, index: number, target: THREE.Vector3, scale: THREE.Vector3) {
        target.fromBufferAttribute(pos, index);
        target.multiply(scale); // Apply scale directly for correct metric units
    }

    /**
     * Signed volume of a tetrahedron formed by triangle and origin.
     * Summing these for a closed mesh gives the total volume.
     */
    private signedVolumeOfTriangle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): number {
        const cross = new THREE.Vector3().crossVectors(p2, p3);
        return p1.dot(cross) / 6.0;
    }

    /**
     * Standard area of a 3D triangle.
     */
    private areaOfTriangle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): number {
        // Cross product of two edges
        const edge1 = new THREE.Vector3().subVectors(p2, p1);
        const edge2 = new THREE.Vector3().subVectors(p3, p1);
        const cross = new THREE.Vector3().crossVectors(edge1, edge2);
        return cross.length() * 0.5;
    }
}
