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

function respond(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
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

    if (action === 'createSession' || action === 'cancelSession') {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) return respond({ error: 'Unauthorized' }, 401);
      
      const { data: adminData } = await supabaseAdmin.from('admins').select('id').eq('id', user.id).single();
      if (!adminData) return respond({ error: 'Admin only' }, 403);

      if (action === 'createSession') {
        const { projectId, vehicleId, viewType, targetFrameCount, captureMode, expiresInHours } = params;
        
        // Validate matching project attributes
        const { data: project } = await supabaseAdmin.from('vehicle_360_projects')
          .select('vehicle_id, view_type').eq('id', projectId).single();
          
        if (!project || project.vehicle_id !== vehicleId || project.view_type !== viewType) {
          return respond({ error: 'Project mismatch' }, 400);
        }

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

        if (error) return respond({ error: error.message }, 500);

        return respond({ sessionId: session.id, token });
      }

      if (action === 'cancelSession') {
        const { sessionId } = params;
        const { data, error } = await supabaseAdmin.from('vehicle_360_capture_sessions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('id', sessionId)
          .select().single();
          
        if (error) return respond({ error: error.message }, 500);
        return respond({ success: true, session: data });
      }
    }
    
    // --- Mobile Actions (Token based) ---
    const { token } = params;
    if (!token && ['getSession', 'prepareUpload', 'confirmFrame', 'rejectFrame', 'finalizeSession'].includes(action)) {
      return respond({ error: 'Missing token' }, 401);
    }
    
    let tokenHash = '';
    let session = null;
    
    if (token) {
      tokenHash = await sha256(token);
      const { data, error } = await supabaseAdmin.from('vehicle_360_capture_sessions')
        .select('*')
        .eq('token_hash', tokenHash)
        .single();
        
      if (error || !data) return respond({ error: 'Invalid token' }, 404);
      session = data;
      
      if (session.status === 'cancelled') return respond({ error: 'Session is cancelled' }, 409);
      if (session.status === 'expired' || new Date(session.expires_at) < new Date()) {
         if (session.status !== 'expired') {
            await supabaseAdmin.from('vehicle_360_capture_sessions').update({ status: 'expired' }).eq('id', session.id);
         }
         return respond({ error: 'Session is expired' }, 410);
      }
    }

    if (action === 'getSession') {
      const { data: frames, error: framesError } = await supabaseAdmin.from('vehicle_360_capture_frames')
        .select('*')
        .eq('session_id', session.id)
        .order('slot_number', { ascending: true });
        
      if (framesError) return respond({ error: framesError.message }, 500);
      
      return respond({
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
      });
    }

    if (action === 'prepareUpload') {
      if (session.status !== 'active') return respond({ error: 'Session not active' }, 409);
      
      const { slotNumber } = params;
      if (!Number.isInteger(slotNumber) || slotNumber < 0 || slotNumber >= session.target_frame_count) {
        return respond({ error: 'Invalid slot number' }, 400);
      }
      
      // Deterministic path
      const storagePath = `360-capture/${session.id}/${slotNumber}-capture.jpg`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('vehicles')
        .createSignedUploadUrl(storagePath);
        
      if (error) return respond({ error: error.message }, 500);
      
      return respond({
        signedUrl: data.signedUrl,
        storagePath
      });
    }

    if (action === 'confirmFrame') {
       if (session.status !== 'active') return respond({ error: 'Session not active' }, 409);
       const { slotNumber, storagePath, fileData } = params;
       
       if (!Number.isInteger(slotNumber) || slotNumber < 0 || slotNumber >= session.target_frame_count) {
         return respond({ error: 'Invalid slot number' }, 400);
       }
       
       const expectedPrefix = `360-capture/${session.id}/${slotNumber}-`;
       if (!storagePath || !storagePath.startsWith(expectedPrefix) || !storagePath.endsWith('.jpg')) {
         return respond({ error: 'Invalid storage path' }, 400);
       }
       
       // Verify object exists
       const { data: statData, error: statError } = await supabaseAdmin.storage.from('vehicles').info(storagePath);
       if (statError || !statData) {
         return respond({ error: 'Uploaded file not found in storage' }, 404);
       }
       
       // Max size check: e.g. 5MB
       // Not strictly rejecting by max size in this MVP but we could
       // if (statData.size > 5 * 1024 * 1024) return respond({ error: 'File too large' }, 400);

       const publicUrlData = supabaseAdmin.storage.from('vehicles').getPublicUrl(storagePath).data;
       
       // Check if there's a previous frame to clean up
       const { data: existingFrame } = await supabaseAdmin.from('vehicle_360_capture_frames')
         .select('storage_path').eq('session_id', session.id).eq('slot_number', slotNumber).single();

       if (existingFrame && existingFrame.storage_path !== storagePath) {
         await supabaseAdmin.storage.from('vehicles').remove([existingFrame.storage_path]);
       }

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
       
       if (error) return respond({ error: error.message }, 500);
       
       // Update session current step if it advances
       await supabaseAdmin.from('vehicle_360_capture_sessions').update({
         current_step: Math.max(session.current_step, slotNumber + 1),
         updated_at: new Date().toISOString()
       }).eq('id', session.id);
       
       return respond({ success: true, frame: data });
    }

    if (action === 'rejectFrame') {
      if (session.status !== 'active') return respond({ error: 'Session not active' }, 409);
      const { slotNumber } = params;
      
      const { data: existingFrame } = await supabaseAdmin.from('vehicle_360_capture_frames')
        .select('storage_path').eq('session_id', session.id).eq('slot_number', slotNumber).single();

      if (existingFrame) {
        await supabaseAdmin.storage.from('vehicles').remove([existingFrame.storage_path]);
        await supabaseAdmin.from('vehicle_360_capture_frames').delete()
          .eq('session_id', session.id).eq('slot_number', slotNumber);
      }
      return respond({ success: true });
    }

    if (action === 'finalizeSession') {
      if (session.status !== 'active') return respond({ error: 'Session not active' }, 409);
      
      // Call RPC which handles the lock, status change, and transition
      const { data, error } = await supabaseAdmin.rpc('finalize_vehicle_360_capture', {
        p_session_id: session.id
      });
      
      if (error) {
        return respond({ error: error.message }, 500);
      }
      
      // Delete old paths
      if (data && data.old_storage_paths && data.old_storage_paths.length > 0) {
        await supabaseAdmin.storage.from('vehicles').remove(data.old_storage_paths);
      }
      
      return respond({ success: true, result: data });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (error: any) {
    return respond({ error: error.message }, 500);
  }
});
