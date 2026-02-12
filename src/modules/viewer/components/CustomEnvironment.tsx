import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const CustomEnvironment: React.FC = () => {
  const { gl, scene } = useThree();

  const envMap = useMemo(() => {
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color("#0a0a0a");

    const keyLight = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshBasicMaterial({ color: "#ffffff", side: THREE.DoubleSide })
    );
    keyLight.position.set(2, 8, 5);
    keyLight.lookAt(0, 0, 0);
    envScene.add(keyLight);

    const rimLight = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 5),
      new THREE.MeshBasicMaterial({ color: "#3B82F6", side: THREE.DoubleSide }) // Blueish tint
    );
    rimLight.position.set(0, 5, -10);
    rimLight.lookAt(0, 0, 0);
    envScene.add(rimLight);

    const fillLight = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshBasicMaterial({ color: "#22C55E", side: THREE.DoubleSide }) // Greenish tint
    );
    fillLight.position.set(-8, 2, 2);
    fillLight.lookAt(0, 0, 0);
    envScene.add(fillLight);

    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
      format: THREE.RGBAFormat,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    
    const cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
    cubeCamera.update(gl, envScene);

    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();
    
    const pmremTarget = pmremGenerator.fromCubemap(cubeRenderTarget.texture);

    cubeRenderTarget.dispose();
    pmremGenerator.dispose();

    return pmremTarget.texture;
  }, [gl]);

  useEffect(() => {
    const originalEnv = scene.environment;
    scene.environment = envMap;
    return () => {
      scene.environment = originalEnv;
      if (envMap) envMap.dispose();
    };
  }, [scene, envMap]);

  return null;
};
