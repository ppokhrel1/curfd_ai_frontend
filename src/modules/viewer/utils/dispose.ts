import * as THREE from "three";


export function disposeObject3D(object: THREE.Object3D | null) {
    if (!object) return;

    object.traverse((node) => {
        if (!(node as THREE.Mesh).isMesh) return;

        const mesh = node as THREE.Mesh;

        if (mesh.geometry) {
            mesh.geometry.dispose();
        }

        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach((material) => disposeMaterial(material));
            } else {
                disposeMaterial(mesh.material as THREE.Material);
            }
        }
    });

    if (object.parent) {
        object.parent.remove(object);
    }
}

function disposeMaterial(material: THREE.Material) {
    material.dispose();
    for (const key of Object.keys(material)) {
        const value = (material as any)[key];
        if (value && value instanceof THREE.Texture) {
            value.dispose();
        }
    }
}
