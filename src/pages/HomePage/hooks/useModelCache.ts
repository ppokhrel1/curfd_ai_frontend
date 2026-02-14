import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { disposeObject3D } from '@/modules/viewer/utils/dispose';
import { MAX_CACHE_SIZE } from '../constants';

export const useModelCache = () => {
  const meshCache = useRef<Record<string, THREE.Group>>({});
  const cacheOrder = useRef<string[]>([]);

  const addToCache = useCallback((id: string, group: THREE.Group) => {
    if (meshCache.current[id]) {
      // Move to front
      cacheOrder.current = [id, ...cacheOrder.current.filter(k => k !== id)];
      return;
    }
    if (cacheOrder.current.length >= MAX_CACHE_SIZE) {
      const oldestId = cacheOrder.current.pop();
      if (oldestId && meshCache.current[oldestId]) {
        disposeObject3D(meshCache.current[oldestId]);
        delete meshCache.current[oldestId];
      }
    }
    meshCache.current[id] = group;
    cacheOrder.current = [id, ...cacheOrder.current];
  }, []);

  const getFromCache = useCallback((id: string) => meshCache.current[id], []);
  const hasInCache = useCallback((id: string) => !!meshCache.current[id], []);

  const clearCache = useCallback(() => {
    Object.values(meshCache.current).forEach(disposeObject3D);
    meshCache.current = {};
    cacheOrder.current = [];
  }, []);

  return { addToCache, getFromCache, hasInCache, clearCache };
};