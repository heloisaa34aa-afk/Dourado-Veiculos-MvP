const fs = require('fs');
let content = fs.readFileSync('src/services/vehicle360.service.ts', 'utf8');

const normalizeFn = `
export function normalizeMarkerPosition(position: any) {
  return {
    frameNumber: Number(position.frameNumber),
    posX: Number(position.posX),
    posY: Number(position.posY),
    visible: typeof position.visible === 'boolean' ? position.visible : true,
    isKeyframe: typeof position.isKeyframe === 'boolean' ? position.isKeyframe : false,
  };
}
`;

content = content.replace("export const vehicle360Service = {", normalizeFn + "\nexport const vehicle360Service = {");

const replaceHotspotPos = `  async replaceHotspotPositions(hotspotId: string, positions: any[]): Promise<void> {
    const normalized = positions.map(normalizeMarkerPosition);
    
    // Upsert new positions
    if (normalized.length > 0) {
      const { error: upsertError } = await supabase
        .from('vehicle_360_hotspot_positions')
        .upsert(
          normalized.map(p => ({
            hotspot_id: hotspotId,
            frame_number: p.frameNumber,
            pos_x: p.posX,
            pos_y: p.posY,
            visible: p.visible,
            is_keyframe: p.isKeyframe
          })),
          { onConflict: 'hotspot_id, frame_number' }
        );
      if (upsertError) throw upsertError;
    }

    // Delete removed positions
    const frameNumbers = normalized.map(p => p.frameNumber);
    const { error: delError } = await supabase
      .from('vehicle_360_hotspot_positions')
      .delete()
      .eq('hotspot_id', hotspotId)
      .not('frame_number', 'in', \`(\${frameNumbers.join(',')})\`);
      
    if (delError && frameNumbers.length > 0) {
      // If there's an error deleting, at least we upserted
      console.error('Error deleting old hotspot positions', delError);
    } else if (frameNumbers.length === 0) {
       await supabase.from('vehicle_360_hotspot_positions').delete().eq('hotspot_id', hotspotId);
    }
  },`;

content = content.replace(/  async replaceHotspotPositions\(hotspotId: string, positions: \{[^}]+\}\[\]\): Promise<void> \{[\s\S]*?if \(insError\) throw insError;\n    \}\n  \},/, replaceHotspotPos);

const replaceDamagePos = `  async replaceDamagePositions(markerId: string, positions: any[]): Promise<void> {
    const normalized = positions.map(normalizeMarkerPosition);
    
    // Upsert new positions
    if (normalized.length > 0) {
      const { error: upsertError } = await supabase
        .from('vehicle_360_damage_marker_positions')
        .upsert(
          normalized.map(p => ({
            marker_id: markerId,
            frame_number: p.frameNumber,
            pos_x: p.posX,
            pos_y: p.posY,
            visible: p.visible,
            is_keyframe: p.isKeyframe
          })),
          { onConflict: 'marker_id, frame_number' }
        );
      if (upsertError) throw upsertError;
    }

    // Delete removed positions
    const frameNumbers = normalized.map(p => p.frameNumber);
    const { error: delError } = await supabase
      .from('vehicle_360_damage_marker_positions')
      .delete()
      .eq('marker_id', markerId)
      .not('frame_number', 'in', \`(\${frameNumbers.join(',')})\`);
      
    if (delError && frameNumbers.length > 0) {
      console.error('Error deleting old damage positions', delError);
    } else if (frameNumbers.length === 0) {
       await supabase.from('vehicle_360_damage_marker_positions').delete().eq('marker_id', markerId);
    }
  },`;

content = content.replace(/  async replaceDamagePositions\(markerId: string, positions: \{[^}]+\}\[\]\): Promise<void> \{[\s\S]*?if \(insError\) throw insError;\n    \}\n  \},/, replaceDamagePos);

fs.writeFileSync('src/services/vehicle360.service.ts', content);
