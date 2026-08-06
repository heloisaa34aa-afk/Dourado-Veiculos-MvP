import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVehicle360 } from './useVehicle360';
import { vehicle360Service } from '../services/vehicle360.service';

vi.mock('../services/vehicle360.service', () => ({
  vehicle360Service: {
    getProjectByVehicleId: vi.fn(),
    getPublishedProjectByVehicleId: vi.fn(),
    createProject: vi.fn(),
    updateProjectStatus: vi.fn(),
    touchProject: vi.fn(),
    repositionHotspot: vi.fn(),
    replaceFrame: vi.fn(),
    removeFrame: vi.fn(),
    reorderFrames: vi.fn(),
  }
}));

vi.mock('../services/vehicle360.storage', () => ({
  vehicle360Storage: {
    uploadFrame: vi.fn(),
    deleteStorageObject: vi.fn(),
  }
}));

describe('useVehicle360', () => {
  const mockProject = {
    id: 'proj-1',
    vehicleId: 'veh-1',
    status: 'draft',
    frames: [
      { id: 'f1', frameNumber: 0, imageUrl: 'url1' },
      { id: 'f2', frameNumber: 1, imageUrl: 'url2' }
    ],
    hotspots: [],
    damageMarkers: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (vehicle360Service.getProjectByVehicleId as any).mockResolvedValue(mockProject);
  });

  it('loads project on mount', async () => {
    const { result } = renderHook(() => useVehicle360('veh-1', 'admin'));
    expect(result.current.loading).toBe(true);
    
    // Wait for load
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.project).toEqual(mockProject);
  });

  it('can unpublish project', async () => {
    const { result } = renderHook(() => useVehicle360('veh-1', 'admin'));
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.unpublishProject();
    });

    expect(vehicle360Service.updateProjectStatus).toHaveBeenCalledWith('proj-1', 'draft');
  });

  it('can reposition hotspot', async () => {
    const { result } = renderHook(() => useVehicle360('veh-1', 'admin'));
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.repositionHotspot('hs-1', 10, 20);
    });

    expect(vehicle360Service.repositionHotspot).toHaveBeenCalledWith('hs-1', 10, 20);
    expect(vehicle360Service.touchProject).toHaveBeenCalledWith('proj-1');
  });
});
