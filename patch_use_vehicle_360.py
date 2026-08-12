import sys
with open('src/hooks/useVehicle360.ts', 'r') as f:
    text = f.read()

import re

# We will rewrite the loadProject and useEffect to handle reset and cancellation.
old_effect_block = """  const loadProject = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = mode === 'public' 
        ? await vehicle360Service.getPublishedProjectByVehicleId(vehicleId, viewType)
        : await vehicle360Service.getProjectByVehicleId(vehicleId, viewType);
      
      if (data && data.frames) {
        data.frames.sort((a, b) => a.frameNumber - b.frameNumber);
        const totalFrames = data.frames.length;
        let warned = false;

        const processPositions = (positions: any[]) => {
          if (!positions) return [];
          const seenFrames = new Set();
          const filtered = positions.filter((p) => {
            if (p.frameNumber < 0 || p.frameNumber >= totalFrames) {
              warned = true;
              return false;
            }
            if (seenFrames.has(p.frameNumber)) {
              warned = true;
              return false; // deduplicate
            }
            seenFrames.add(p.frameNumber);
            return true;
          });
          return filtered.sort((a, b) => a.frameNumber - b.frameNumber);
        };

        if (data.hotspots) {
          data.hotspots.forEach(h => {
            h.positions = processPositions(h.positions);
          });
        }
        if (data.damageMarkers) {
          data.damageMarkers.forEach(d => {
            d.positions = processPositions(d.positions);
          });
        }
        
        if (warned && mode === 'admin') {
          alert("Aviso: Foram ignoradas posições inválidas (duplicadas ou fora dos limites do projeto).");
        }
      }

      setProject(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, mode, viewType]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);"""

new_effect_block = """  const currentRequestRef = useRef(0);

  const loadProject = useCallback(async () => {
    const requestId = ++currentRequestRef.current;
    
    try {
      setLoading(true);
      setError(null);
      const data = mode === 'public' 
        ? await vehicle360Service.getPublishedProjectByVehicleId(vehicleId, viewType)
        : await vehicle360Service.getProjectByVehicleId(vehicleId, viewType);
      
      if (requestId !== currentRequestRef.current) return;
      
      if (data && data.frames) {
        data.frames.sort((a, b) => a.frameNumber - b.frameNumber);
        const totalFrames = data.frames.length;
        let warned = false;

        const processPositions = (positions: any[]) => {
          if (!positions) return [];
          const seenFrames = new Set();
          const filtered = positions.filter((p) => {
            if (p.frameNumber < 0 || p.frameNumber >= totalFrames) {
              warned = true;
              return false;
            }
            if (seenFrames.has(p.frameNumber)) {
              warned = true;
              return false; // deduplicate
            }
            seenFrames.add(p.frameNumber);
            return true;
          });
          return filtered.sort((a, b) => a.frameNumber - b.frameNumber);
        };

        if (data.hotspots) {
          data.hotspots.forEach(h => {
            h.positions = processPositions(h.positions);
          });
        }
        if (data.damageMarkers) {
          data.damageMarkers.forEach(d => {
            d.positions = processPositions(d.positions);
          });
        }
      }

      setProject(data);
    } catch (err: any) {
      if (requestId !== currentRequestRef.current) return;
      setError(err);
    } finally {
      if (requestId === currentRequestRef.current) {
        setLoading(false);
      }
    }
  }, [vehicleId, mode, viewType]);

  useEffect(() => {
    // Reset state when dependencies change
    setProject(null);
    setCurrentFrame(0);
    setIsDragging(false);
    setIsAutoSpinning(false);
    setError(null);
    
    loadProject();
    
    return () => {
      // Cancel pending updates on unmount or deps change
      currentRequestRef.current++;
    };
  }, [loadProject]);"""

text = text.replace(old_effect_block, new_effect_block)

with open('src/hooks/useVehicle360.ts', 'w') as f:
    f.write(text)

