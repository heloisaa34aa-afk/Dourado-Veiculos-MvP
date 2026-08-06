import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('1. Reloading PostgREST schema...');
  // We can't easily run NOTIFY via the standard client unless we have a Postgres function or we just make a normal query and rely on automatic schema reload (Supabase typically reloads schema automatically, but we can try).
  // Actually, Supabase usually auto-reloads. Let's just run the queries.

  // Get a vehicle ID to test with
  const { data: vehicles, error: vErr } = await supabase.from('vehicles').select('id').limit(1);
  if (vErr || !vehicles || vehicles.length === 0) {
    console.error('Failed to get vehicle:', vErr);
    process.exit(1);
  }
  const vehicleId = vehicles[0].id;
  console.log('Using vehicle ID:', vehicleId);

  // Test getProjectByVehicleId
  console.log('\n2. Testing getProjectByVehicleId...');
  const { data: projectData, error: projectErr } = await supabase
    .from('vehicle_360_projects')
    .select(`
      id,
      vehicle_id,
      status,
      frame_count,
      created_at,
      updated_at,
      frames:vehicle_360_frames(*),
      hotspots:vehicle_360_hotspots(*),
      damageMarkers:vehicle_360_damage_markers(
        *,
        images:vehicle_360_damage_images(*)
      )
    `)
    .eq('vehicle_id', vehicleId)
    .maybeSingle();

  if (projectErr) {
    console.error('Error fetching project:', projectErr);
  } else {
    console.log('Project fetched successfully:', projectData);
  }

  // Test idempotency (create or get)
  console.log('\n3. Testing idempotent creation...');
  let currentProjectId = projectData?.id;
  
  if (!currentProjectId) {
    console.log('Creating new project...');
    const { data: newProject, error: insertErr } = await supabase
      .from('vehicle_360_projects')
      .insert({ vehicle_id: vehicleId, status: 'draft', frame_count: 0 })
      .select()
      .single();
      
    if (insertErr) {
      console.error('Error creating project:', insertErr);
    } else {
      console.log('Project created:', newProject);
      currentProjectId = newProject.id;
    }
  } else {
    console.log('Project already exists. Trying to create again to test failure...');
    const { data: duplicateProject, error: duplicateErr } = await supabase
      .from('vehicle_360_projects')
      .insert({ vehicle_id: vehicleId, status: 'draft', frame_count: 0 })
      .select()
      .single();
      
    if (duplicateErr) {
      console.log('Expected error on duplicate creation:', duplicateErr);
    } else {
      console.error('Unexpected success on duplicate creation:', duplicateProject);
    }
  }

  // Test getPublishedProjectByVehicleId
  console.log('\n4. Testing getPublishedProjectByVehicleId...');
  const { data: pubData, error: pubErr } = await supabase
    .from('vehicle_360_projects')
    .select(`
      id,
      vehicle_id,
      status,
      frame_count,
      created_at,
      updated_at,
      frames:vehicle_360_frames(*),
      hotspots:vehicle_360_hotspots(*),
      damageMarkers:vehicle_360_damage_markers(
        *,
        images:vehicle_360_damage_images(*)
      )
    `)
    .eq('vehicle_id', vehicleId)
    .eq('status', 'completed')
    .maybeSingle();

  if (pubErr) {
    console.error('Error fetching published project:', pubErr);
  } else {
    console.log('Published project fetch successful:', pubData);
  }
}

main();
