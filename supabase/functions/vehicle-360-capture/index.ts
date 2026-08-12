import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.5';
import {
  CAPTURE_BUCKET,
  expectedStoragePath,
  isJpegBytes,
  isUuid,
  validateCreateSessionInput,
  validateSlot,
  validateStoredJpegMetadata,
} from './validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function reportInternal(label: string, error: unknown) {
  console.error(`[vehicle-360-capture] ${label}`, error);
  return respond({ error: 'Não foi possível concluir a operação.' }, 500);
}

async function sha256(message: string) {
  const bytes = new TextEncoder().encode(message);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function createRawToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function isToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

async function firstMissingSlot(supabaseAdmin: any, sessionId: string, targetFrameCount: number) {
  const { data, error } = await supabaseAdmin
    .from('vehicle_360_capture_frames')
    .select('slot_number')
    .eq('session_id', sessionId)
    .eq('status', 'confirmed');
  if (error) throw error;
  const confirmed = new Set((data ?? []).map((row: { slot_number: number }) => row.slot_number));
  for (let slot = 0; slot < targetFrameCount; slot += 1) {
    if (!confirmed.has(slot)) return slot;
  }
  return targetFrameCount;
}

async function cleanupUnfinishedSession(supabaseAdmin: any, sessionId: string) {
  const folder = `360-capture/${sessionId}`;
  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(CAPTURE_BUCKET)
    .list(folder, { limit: 100 });
  if (listError) throw listError;
  const paths = (files ?? [])
    .filter((file: { name?: string }) => typeof file.name === 'string' && /^\d+-capture\.jpg$/.test(file.name))
    .map((file: { name: string }) => `${folder}/${file.name}`);
  if (paths.length > 0) {
    const { error: removeError } = await supabaseAdmin.storage.from(CAPTURE_BUCKET).remove(paths);
    if (removeError) throw removeError;
  }
  const { error: deleteError } = await supabaseAdmin
    .from('vehicle_360_capture_frames')
    .delete()
    .eq('session_id', sessionId);
  if (deleteError) throw deleteError;
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return reportInternal('missing environment configuration', null);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return respond({ error: 'Corpo JSON inválido.' }, 400);
  }

  const action = payload.action;
  if (typeof action !== 'string') return respond({ error: 'Ação inválida.' }, 400);

  try {
    if (action === 'createSession' || action === 'cancelSession') {
      const authorization = req.headers.get('Authorization') ?? '';
      const jwt = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
      if (!jwt) return respond({ error: 'Não autenticado.' }, 401);

      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
      const user = userData?.user;
      if (userError || !user) return respond({ error: 'Não autenticado.' }, 401);

      const { data: admin, error: adminError } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (adminError) return reportInternal('admin lookup failed', adminError);
      if (!admin) return respond({ error: 'Acesso restrito a administradores.' }, 403);

      if (action === 'createSession') {
        let input;
        try {
          input = validateCreateSessionInput(payload);
        } catch {
          return respond({ error: 'Parâmetros da sessão inválidos.' }, 400);
        }

        const { data: project, error: projectError } = await supabaseAdmin
          .from('vehicle_360_projects')
          .select('id, vehicle_id, view_type')
          .eq('id', input.projectId)
          .maybeSingle();
        if (projectError) return reportInternal('project lookup failed', projectError);
        if (!project) return respond({ error: 'Projeto 360 não encontrado.' }, 404);
        if (project.vehicle_id !== input.vehicleId || project.view_type !== input.viewType) {
          return respond({ error: 'O projeto não corresponde ao veículo e à visualização informados.' }, 400);
        }

        const { data: bucket, error: bucketError } = await supabaseAdmin.storage.getBucket(CAPTURE_BUCKET);
        if (bucketError || !bucket) return reportInternal('capture bucket lookup failed', bucketError);
        if (!bucket.public) {
          return respond({ error: 'O bucket vehicles precisa estar público para publicar os frames atuais.' }, 500);
        }

        const token = createRawToken();
        const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
        const { data: session, error: insertError } = await supabaseAdmin
          .from('vehicle_360_capture_sessions')
          .insert({
            project_id: input.projectId,
            vehicle_id: input.vehicleId,
            view_type: input.viewType,
            token_hash: await sha256(token),
            target_frame_count: input.targetFrameCount,
            capture_mode: input.captureMode,
            expires_at: expiresAt.toISOString(),
            status: 'active',
            created_by: user.id,
          })
          .select('id, expires_at')
          .single();
        if (insertError) return reportInternal('session insert failed', insertError);
        return respond({ sessionId: session.id, token, expiresAt: session.expires_at }, 201);
      }

      if (!isUuid(payload.sessionId)) return respond({ error: 'Sessão inválida.' }, 400);
      const { data: cancelled, error: cancelError } = await supabaseAdmin
        .from('vehicle_360_capture_sessions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', payload.sessionId)
        .eq('created_by', user.id)
        .eq('status', 'active')
        .select('id')
        .maybeSingle();
      if (cancelError) return reportInternal('session cancel failed', cancelError);
      if (!cancelled) return respond({ error: 'Sessão ativa não encontrada.' }, 409);
      try {
        await cleanupUnfinishedSession(supabaseAdmin, payload.sessionId);
      } catch (cleanupError) {
        console.error('[vehicle-360-capture] cancelled session cleanup failed', cleanupError);
      }
      return respond({ success: true });
    }

    if (!['getSession', 'prepareUpload', 'confirmFrame', 'rejectFrame', 'finalizeSession'].includes(action)) {
      return respond({ error: 'Ação desconhecida.' }, 400);
    }

    if (!isToken(payload.token)) return respond({ error: 'Token inválido.' }, 404);
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('vehicle_360_capture_sessions')
      .select('id, project_id, vehicle_id, view_type, target_frame_count, capture_mode, status, current_step, expires_at')
      .eq('token_hash', await sha256(payload.token))
      .maybeSingle();
    if (sessionError) return reportInternal('session lookup failed', sessionError);
    if (!session) return respond({ error: 'Token inválido.' }, 404);
    if (session.status === 'cancelled') return respond({ error: 'Sessão cancelada.' }, 409);
    if (session.status === 'expired' || new Date(session.expires_at).getTime() <= Date.now()) {
      if (session.status === 'active') {
        await supabaseAdmin
          .from('vehicle_360_capture_sessions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', session.id)
          .eq('status', 'active');
      }
      try {
        await cleanupUnfinishedSession(supabaseAdmin, session.id);
      } catch (cleanupError) {
        console.error('[vehicle-360-capture] expired session cleanup failed', cleanupError);
      }
      return respond({ error: 'Sessão expirada.' }, 410);
    }

    if (action === 'getSession') {
      const { data: frames, error: framesError } = await supabaseAdmin
        .from('vehicle_360_capture_frames')
        .select('slot_number, image_url, status, width, height, file_size, captured_at')
        .eq('session_id', session.id)
        .order('slot_number', { ascending: true });
      if (framesError) return reportInternal('frame listing failed', framesError);
      return respond({ session, frames: frames ?? [] });
    }

    if (session.status !== 'active') return respond({ error: 'A sessão não está ativa.' }, 409);

    if (action === 'prepareUpload') {
      let slotNumber;
      try {
        slotNumber = validateSlot(payload.slotNumber, session.target_frame_count);
      } catch {
        return respond({ error: 'Posição de foto inválida.' }, 400);
      }
      const storagePath = expectedStoragePath(session.id, slotNumber);
      const { data, error } = await supabaseAdmin.storage
        .from(CAPTURE_BUCKET)
        .createSignedUploadUrl(storagePath, { upsert: true });
      if (error || !data) return reportInternal('signed upload creation failed', error);
      return respond({ storagePath, uploadToken: data.token });
    }

    if (action === 'confirmFrame') {
      let slotNumber;
      try {
        slotNumber = validateSlot(payload.slotNumber, session.target_frame_count);
      } catch {
        return respond({ error: 'Posição de foto inválida.' }, 400);
      }
      const storagePath = expectedStoragePath(session.id, slotNumber);
      if (payload.storagePath !== storagePath) return respond({ error: 'Caminho do arquivo inválido.' }, 400);

      const folder = `360-capture/${session.id}`;
      const fileName = `${slotNumber}-capture.jpg`;
      const { data: listed, error: listError } = await supabaseAdmin.storage
        .from(CAPTURE_BUCKET)
        .list(folder, { limit: 10, search: fileName });
      if (listError) return reportInternal('storage metadata lookup failed', listError);
      const storedFile = listed?.find((entry: any) => entry.name === fileName);
      if (!storedFile) return respond({ error: 'Arquivo enviado não encontrado.' }, 404);

      let actualMetadata;
      try {
        actualMetadata = validateStoredJpegMetadata(storedFile.metadata);
      } catch (error) {
        if (error instanceof Error && error.message === 'FILE_TOO_LARGE') {
          return respond({ error: 'A imagem ultrapassa o limite de 5 MB.' }, 400);
        }
        return respond({ error: 'O arquivo precisa ser uma imagem JPEG válida.' }, 400);
      }

      const { data: downloaded, error: downloadError } = await supabaseAdmin.storage
        .from(CAPTURE_BUCKET)
        .download(storagePath);
      if (downloadError || !downloaded) return reportInternal('jpeg verification download failed', downloadError);
      const bytes = new Uint8Array(await downloaded.arrayBuffer());
      if (!isJpegBytes(bytes)) return respond({ error: 'O conteúdo enviado não é um JPEG válido.' }, 400);

      const fileData = payload.fileData as Record<string, unknown> | undefined;
      const reportedSize = Number(fileData?.size);
      const width = Number(fileData?.width);
      const height = Number(fileData?.height);
      if (!Number.isInteger(reportedSize) || reportedSize !== actualMetadata.size) {
        return respond({ error: 'Tamanho informado não corresponde ao arquivo enviado.' }, 400);
      }
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 2560 || height > 2560) {
        return respond({ error: 'Dimensões da imagem inválidas.' }, 400);
      }

      const publicUrl = supabaseAdmin.storage.from(CAPTURE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
      const { data: frame, error: upsertError } = await supabaseAdmin
        .from('vehicle_360_capture_frames')
        .upsert({
          session_id: session.id,
          slot_number: slotNumber,
          storage_path: storagePath,
          image_url: publicUrl,
          mime_type: 'image/jpeg',
          file_size: actualMetadata.size,
          width,
          height,
          status: 'confirmed',
          captured_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id,slot_number' })
        .select('slot_number, image_url, status, width, height, file_size, captured_at')
        .single();
      if (upsertError) return reportInternal('frame confirmation failed', upsertError);

      const nextStep = await firstMissingSlot(supabaseAdmin, session.id, session.target_frame_count);
      await supabaseAdmin
        .from('vehicle_360_capture_sessions')
        .update({ current_step: nextStep, updated_at: new Date().toISOString() })
        .eq('id', session.id)
        .eq('status', 'active');
      return respond({ success: true, frame, currentStep: nextStep });
    }

    if (action === 'rejectFrame') {
      let slotNumber;
      try {
        slotNumber = validateSlot(payload.slotNumber, session.target_frame_count);
      } catch {
        return respond({ error: 'Posição de foto inválida.' }, 400);
      }
      const storagePath = expectedStoragePath(session.id, slotNumber);
      const { error: removeError } = await supabaseAdmin.storage.from(CAPTURE_BUCKET).remove([storagePath]);
      if (removeError) return reportInternal('frame storage removal failed', removeError);
      const { error: deleteError } = await supabaseAdmin
        .from('vehicle_360_capture_frames')
        .delete()
        .eq('session_id', session.id)
        .eq('slot_number', slotNumber);
      if (deleteError) return reportInternal('frame row removal failed', deleteError);
      const nextStep = await firstMissingSlot(supabaseAdmin, session.id, session.target_frame_count);
      await supabaseAdmin
        .from('vehicle_360_capture_sessions')
        .update({ current_step: nextStep, updated_at: new Date().toISOString() })
        .eq('id', session.id)
        .eq('status', 'active');
      return respond({ success: true, currentStep: nextStep });
    }

    const { data: result, error: finalizeError } = await supabaseAdmin.rpc('finalize_vehicle_360_capture', {
      p_session_id: session.id,
    });
    if (finalizeError) {
      console.error('[vehicle-360-capture] finalization failed', finalizeError);
      if (/active state|incomplete|missing|duplicate/i.test(finalizeError.message ?? '')) {
        return respond({ error: 'A sessão mudou ou ainda possui fotos pendentes.' }, 409);
      }
      return respond({ error: 'Não foi possível finalizar a captura.' }, 500);
    }

    const oldPaths = Array.isArray(result?.old_storage_paths)
      ? result.old_storage_paths.filter((path: unknown): path is string => typeof path === 'string' && path.length > 0)
      : [];
    if (oldPaths.length > 0) {
      const { error: cleanupError } = await supabaseAdmin.storage.from(CAPTURE_BUCKET).remove(oldPaths);
      if (cleanupError) console.error('[vehicle-360-capture] old frame cleanup failed', cleanupError);
    }
    return respond({ success: true, result });
  } catch (error) {
    return reportInternal('unexpected failure', error);
  }
});
