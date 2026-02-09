import * as THREE from "three";

export interface SDFVisual {
  name: string;
  meshPath: string;
  pose: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
  };
  scale: THREE.Vector3;
}

export class SDFParser {
  private parser: DOMParser = new DOMParser();

  parse(sdfContent: string): SDFVisual[] {
    const xmlDoc = this.parser.parseFromString(sdfContent, "text/xml");
    const visuals: SDFVisual[] = [];

    //  Get Model Pose (Global offset for all links)
    const modelTag = xmlDoc.getElementsByTagName("model")[0];
    const modelPoseText =
      modelTag?.getElementsByTagName("pose")[0]?.textContent || "0 0 0 0 0 0";
    const modelMatrix = this.poseToMatrix(modelPoseText);

    const links = xmlDoc.getElementsByTagName("link");

    for (let i = 0; i < links.length; i++) {
      const link = links[i];

      //  Get link pose (Relative to model)
      const linkPoseText =
        link.getElementsByTagName("pose")[0]?.textContent || "0 0 0 0 0 0";
      const linkMatrix = this.poseToMatrix(linkPoseText);

      // Combine Model -> Link
      const combinedLinkMatrix = new THREE.Matrix4().multiplyMatrices(
        modelMatrix,
        linkMatrix
      );

      const linkVisuals = link.getElementsByTagName("visual");

      for (let j = 0; j < linkVisuals.length; j++) {
        const visual = linkVisuals[j];
        const geometry = visual.getElementsByTagName("geometry")[0];
        if (!geometry) continue;

        const mesh = geometry.getElementsByTagName("mesh")[0];
        if (!mesh) continue;

        const uri = mesh.getElementsByTagName("uri")[0]?.textContent || "";
        const visualPoseText =
          visual.getElementsByTagName("pose")[0]?.textContent || "0 0 0 0 0 0";
        const scaleText =
          mesh.getElementsByTagName("scale")[0]?.textContent || "1 1 1";

        //  Get visual pose (Relative to link)
        const visualMatrix = this.poseToMatrix(visualPoseText);

        // Combine (Model -> Link) -> Visual
        const finalMatrix = new THREE.Matrix4().multiplyMatrices(
          combinedLinkMatrix,
          visualMatrix
        );

        // Extract final world-space (in SDF coordinates) position and rotation
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        finalMatrix.decompose(position, quaternion, scale);

        visuals.push({
          name: visual.getAttribute("name") || `visual_${i}_${j}`,
          meshPath: this.cleanUri(uri),
          pose: {
            position,
            quaternion,
          },
          scale: this.parseVector(scaleText),
        });
      }
    }

    return visuals;
  }

  /**
   * Converts SDF pose string to THREE.js transformation matrix
   * SDF format: "x y z roll pitch yaw" (in Gazebo's Z-up coordinate system)
   * Gazebo uses EXTRINSIC XYZ rotation order.
   * In Three.js, this is achieved by using Intrinsic 'ZYX' order.
   */
  private poseToMatrix(poseText: string): THREE.Matrix4 {
    const parts = poseText
      .trim()
      .split(/\s+/)
      .filter((p) => p !== "")
      .map(Number);
    const [x, y, z, roll, pitch, yaw] =
      parts.length >= 6 ? parts : [0, 0, 0, 0, 0, 0];

    const matrix = new THREE.Matrix4();

    // Create euler with 'ZYX' to correctly match Gazebo's extrinsic R-P-Y order
    const euler = new THREE.Euler(roll, pitch, yaw, "ZYX");
    const quaternion = new THREE.Quaternion().setFromEuler(euler);

    matrix.makeRotationFromQuaternion(quaternion);
    matrix.setPosition(x, y, z);

    return matrix;
  }

  private cleanUri(uri: string): string {
    // Removes model://model_name/ prefix
    return uri.replace(new RegExp("^model://[^/]+/"), "");
  }

  private parseVector(vectorText: string): THREE.Vector3 {
    const parts = vectorText
      .trim()
      .split(/\s+/)
      .filter((p) => p !== "")
      .map(Number);
    const [x, y, z] = parts.length === 3 ? parts : [1, 1, 1];
    return new THREE.Vector3(x, y, z);
  }
}
