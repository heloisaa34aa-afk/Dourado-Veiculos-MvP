import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Configured as * for this MVP, restrict in prod
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Service role for administrative updates and finalized RPC
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();

    if (action === 'createSession') {
      // Validate Admin
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) throw new Error('Unauthorized');
      
      const { data: adminData } = await supabaseAdmin.from('admins').select('id').eq('id', user.id).single();
      if (!adminData) throw new Error('Admin only');

      const { projectId, vehicleId, viewType, targetFrameCount, captureMode, expiresInHours } = params;

      // Generate secure token
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const token = btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const tokenHash = await sha256(token);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);

      const { data: session, error } = await supabaseAdmin.from('vehicle_360_capture_sessions').insert({
        project_id: projectId,
        vehicle_id: vehicleId,
        view_type: viewType,
        token_hash: tokenHash,
        target_frame_count: targetFrameCount,
        capture_mode: captureMode,
        expires_at: expiresAt.toISOString(),
        status: 'active',
        created_by: user.id
      }).select().single();

      if (error) throw error;

      return new Response(JSON.stringify({ sessionId: session.id, token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'cancelSession') {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('Unauthorized');
      
      const { data: adminData } = await supabaseAdmin.from('admins').select('id').eq('id', user.id).single();
      if (!adminData) throw new Error('Admin only');

      const { sessionId } = params;
      const { data, error } = await supabaseAdmin.from('vehicle_360_capture_sessions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .select().single();
        
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, session: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // --- Mobile Actions (Token based) ---
    const { token } = params;
    if (!token && ['getSession', 'prepareUpload', 'confirmFrame', 'rejectFrame', 'finalizeSession'].includes(action)) {
      throw new Error('Missing token');
    }
    
    let tokenHash = '';
    let session = null;
    
    if (token) {
      tokenHash = await sha256(token);
      const { data, error } = await supabaseAdmin.from('vehicle_360_capture_sessions')
        .select('*')
        .eq('token_hash', tokenHash)
        .single();
        
      if (error || !data) throw new Error('Invalid token');
      session = data;
      
      if (session.status === 'cancelled') throw new Error('Session is cancelled');
      if (session.status === 'expired' || new Date(session.expires_at) < new Date()) {
         if (session.status !== 'expired') {
            await supabaseAdmin.from('vehicle_360_capture_sessions').update({ status: 'expired' }).eq('id', session.id);
         }
         throw new Error('Session is expired');
      }
    }

    if (action === 'getSession') {
      const { data: frames, error: framesError } = await supabaseAdmin.from('vehicle_360_capture_frames')
        .select('*')
        .eq('session_id', session.id)
        .order('slot_number', { ascending: true });
        
      if (framesError) throw framesError;
      
      return new Response(JSON.stringify({
        session: {
          id: session.id,
          project_id: session.project_id,
          vehicle_id: session.vehicle_id,
          view_type: session.view_type,
          target_frame_count: session.target_frame_count,
          capture_mode: session.capture_mode,
          status: session.status,
          current_step: session.current_step,
          expires_at: session.expires_at
        },
        frames
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'prepareUpload') {
      if (session.status === 'completed') throw new Error('Session already completed');
      
      const { slotNumber } = params;
      if (slotNumber < 0 || slotNumber >= session.target_frame_count) {
        throw new Error('Invalid slot number');
      }
      
      const fileId = crypto.randomUUID();
      const storagePath = `360-capture/${session.id}/${slotNumber}-${fileId}.jpg`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('vehicles')
        .createSignedUploadUrl(storagePath);
        
      if (error) throw error;
      
      return new Response(JSON.stringify({
        signedUrl: data.signedUrl,
        storagePath
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'confirmFrame') {
       if (session.status === 'completed') throw new Error('Session already completed');
       const { slotNumber, storagePath, fileData } = params;
       
       const { data: publicUrlData } = supabaseAdmin.storage.from('vehicles').getPublicUrl(storagePath);
       
       // Upsert frame
       const { data, error } = await supabaseAdmin.from('vehicle_360_capture_frames').upsert({
         session_id: session.id,
         slot_number: slotNumber,
         storage_path: storagePath,
         image_url: publicUrlData.publicUrl,
         mime_type: 'image/jpeg',
         file_size: fileData?.size || 0,
         width: fileData?.width || 0,
         height: fileData?.height || 0,
         status: 'confirmed',
         captured_at: new Date().toISOString(),
         updated_at: new Date().toISOString()
       }, { onConflict: 'session_id, slot_number' }).select().single();
       
       if (error) throw error;
       
       // Clean up old frames for this slot if we are overwriting (if we had previous different paths)
       // This is a bit complex in upsert, so we might just leave the old files to be cleaned by a cron
       // or we could query the previous path before upsert. For MVP, we will let upsert handle DB, 
       // but storage might have orphaned files if the path changes. We include slotNumber in path, 
       // so they might accumulate. We won't worry about storage orphans right now.
       
       // Update session current step if it advances
       await supabaseAdmin.from('vehicle_360_capture_sessions').update({
         current_step: Math.max(session.current_step, slotNumber + 1),
         updated_at: new Date().toISOString()
       }).eq('id', session.id);
       
       return new Response(JSON.stringify({ success: true, frame: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'finalizeSession') {
      if (session.status === 'completed') throw new Error('Session already completed');
      
      // Mark finalizing
      await supabaseAdmin.from('vehicle_360_capture_sessions').update({ status: 'finalizing' }).eq('id', session.id);
      
      // Call RPC
      const { data, error } = await supabaseAdmin.rpc('finalize_vehicle_360_capture', {
        p_session_id: session.id
      });
      
      if (error) {
        // Revert status
        await supabaseAdmin.from('vehicle_360_capture_sessions').update({ status: 'active' }).eq('id', session.id);
        throw error;
      }
      
      // Delete old paths
      if (data.old_storage_paths && data.old_storage_paths.length > 0) {
        await supabaseAdmin.storage.from('vehicles').remove(data.old_storage_paths);
      }
      
      return new Response(JSON.stringify({ success: true, result: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
