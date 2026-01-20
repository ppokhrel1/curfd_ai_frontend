import * as THREE from 'three';

export interface SDFVisual {
    name: string;
    meshPath: string;
    pose: {
        position: THREE.Vector3;
        rotation: THREE.Euler;
    };
    scale: THREE.Vector3;
}

export class SDFParser {
    private parser: DOMParser;

    constructor() {
        this.parser = new DOMParser();
    }

    parse(sdfContent: string): SDFVisual[] {
        const xmlDoc = this.parser.parseFromString(sdfContent, "text/xml");
        const visuals: SDFVisual[] = [];

        const links = xmlDoc.getElementsByTagName("link");
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            const linkVisuals = link.getElementsByTagName("visual");

            for (let j = 0; j < linkVisuals.length; j++) {
                const visual = linkVisuals[j];
                const geometry = visual.getElementsByTagName("geometry")[0];
                if (!geometry) continue;

                const mesh = geometry.getElementsByTagName("mesh")[0];
                if (!mesh) continue;

                const uri = mesh.getElementsByTagName("uri")[0]?.textContent || "";
                const poseText = visual.getElementsByTagName("pose")[0]?.textContent || "0 0 0 0 0 0";
                const scaleText = mesh.getElementsByTagName("scale")[0]?.textContent || "1 1 1";

                const visualData: SDFVisual = {
                    name: visual.getAttribute("name") || `visual_${i}_${j}`,
                    meshPath: this.cleanUri(uri),
                    pose: this.parsePose(poseText),
                    scale: this.parseVector(scaleText),
                };

                visuals.push(visualData);
            }
        }

        return visuals;
    }

    private cleanUri(uri: string): string {
        // model://model_name/meshes/file.stl -> meshes/file.stl
        if (uri.startsWith('model://')) {
            return uri.replace(/model:\/\/[^\/]+\//, "");
        }
        return uri;
    }

    private parsePose(poseText: string) {
        const parts = poseText.trim().split(/\s+/).map(Number);
        const [x, y, z, roll, pitch, yaw] = parts.length === 6 ? parts : [0, 0, 0, 0, 0, 0];

        // Convert Gazebo (Z-up) to Three.js (Y-up) if necessary
        // For now we keep it and rotate the parent if needed, 
        // but usually models are designed for their coordinate system.
        return {
            position: new THREE.Vector3(x, y, z),
            rotation: new THREE.Euler(roll, pitch, yaw, 'XYZ'),
        };
    }

    private parseVector(vectorText: string): THREE.Vector3 {
        const parts = vectorText.trim().split(/\s+/).map(Number);
        const [x, y, z] = parts.length === 3 ? parts : [1, 1, 1];
        return new THREE.Vector3(x, y, z);
    }
}
