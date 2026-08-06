import { vehicle360Service } from './src/services/vehicle360.service';
import { supabase } from './src/lib/supabase';

async function main() {
  const { data: vehicles } = await supabase.from('vehicles').select('id').limit(1);
  const vehicleId = vehicles![0].id;
  console.log('Testing createProject for:', vehicleId);
  try {
     const proj = await vehicle360Service.createProject(vehicleId);
     console.log('Success:', proj);
     
     console.log('Testing getPublishedProjectByVehicleId...');
     const pubProj = await vehicle360Service.getPublishedProjectByVehicleId(vehicleId);
     console.log('Published:', pubProj);
  } catch(e) {
     console.error('Failed:', e);
  }
}
main();
