import { FormEvent, useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Edit2, Eye, Image as ImageIcon, Loader2, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { bannerService, BannerInput, BannerPlacement, SiteBanner } from '../services/banner.service';
import { BANNER_FORMAT_SPECS, BannerImageSize, bannerSizeLabel } from '../utils/bannerFormats';

const emptyBanner: BannerInput = {
  name: '', placement: 'home_inline', title: '', subtitle: '',
  desktop_image_url: null, desktop_storage_path: null,
  mobile_image_url: null, mobile_storage_path: null,
  cta_label: null, cta_url: null,
  background_color: '#0f172a', text_color: '#ffffff',
  is_active: false, is_dismissible: true, show_once_per_session: true,
  starts_at: null, ends_at: null, priority: 0,
};

const placementLabels: Record<BannerPlacement, string> = Object.fromEntries(
  Object.entries(BANNER_FORMAT_SPECS).map(([key, value]) => [key, value.label]),
) as Record<BannerPlacement, string>;

function toLocalDate(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function BannerManager() {
  const [items, setItems] = useState<SiteBanner[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerInput>(emptyBanner);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'desktop' | 'mobile' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedFormat = BANNER_FORMAT_SPECS[form.placement];

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setItems(await bannerService.listAll());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os banners. Execute a migration de banners no Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const startNew = () => {
    setEditingId(null);
    setForm({ ...emptyBanner });
    setMessage(null);
    setError(null);
  };

  const edit = (banner: SiteBanner) => {
    const { id: _id, created_at: _created, updated_at: _updated, ...input } = banner;
    setEditingId(banner.id);
    setForm(input);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const upload = async (file: File | undefined, variant: 'desktop' | 'mobile') => {
    if (!file) return;
    try {
      setUploading(variant);
      setError(null);
      const result = await bannerService.uploadImage(file, variant);
      setForm(current => variant === 'desktop'
        ? { ...current, desktop_image_url: result.url, desktop_storage_path: result.path }
        : { ...current, mobile_image_url: result.url, mobile_storage_path: result.path });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Falha ao enviar a imagem.');
    } finally {
      setUploading(null);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() && !form.desktop_image_url && !form.mobile_image_url) {
      setError('Adicione um título ou uma imagem ao banner.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const payload = {
        ...form,
        name: form.name.trim(), title: form.title.trim(), subtitle: form.subtitle.trim(),
        cta_label: form.cta_label?.trim() || null, cta_url: form.cta_url?.trim() || null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      };
      await bannerService.save(payload, editingId ?? undefined);
      const successMessage = editingId ? 'Banner atualizado e publicado nas regras escolhidas.' : 'Banner criado com sucesso.';
      startNew();
      await load();
      setMessage(successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o banner.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (banner: SiteBanner) => {
    if (!window.confirm(`Excluir definitivamente o banner “${banner.name}”?`)) return;
    try {
      await bannerService.remove(banner);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível excluir o banner.');
    }
  };

  const toggleActive = async (banner: SiteBanner) => {
    const { id: _id, created_at: _created, updated_at: _updated, ...input } = banner;
    try {
      await bannerService.save({ ...input, is_active: !banner.is_active }, banner.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível alterar a publicação.');
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form onSubmit={submit} className="space-y-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div><h3 className="text-xl font-extrabold text-slate-900">{editingId ? 'Editar promoção' : 'Nova promoção'}</h3><p className="mt-1 text-xs text-slate-500">Configure texto, imagens, link, período e local de exibição sem alterar código.</p></div>
          {editingId && <button type="button" onClick={startNew} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"><X className="mr-1 inline h-4 w-4" />Cancelar edição</button>}
        </div>

        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"><CheckCircle2 className="mr-2 inline h-4 w-4" />{message}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome interno"><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Feirão de agosto" className="form-input" /></Field>
          <Field label="Formato"><select value={form.placement} onChange={e => setForm({ ...form, placement: e.target.value as BannerPlacement })} className="form-input">{Object.entries(placementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Título"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Pensando em trocar de carro?" className="form-input" /></Field>
          <Field label="Subtítulo"><input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Condições especiais por tempo limitado" className="form-input" /></Field>
          <Field label="Texto do botão"><input value={form.cta_label ?? ''} onChange={e => setForm({ ...form, cta_label: e.target.value })} placeholder="Falar com a equipe" className="form-input" /></Field>
          <Field label="Link do botão"><input type="url" value={form.cta_url ?? ''} onChange={e => setForm({ ...form, cta_url: e.target.value })} placeholder="https://wa.me/..." className="form-input" /></Field>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
          <strong>{selectedFormat.label}:</strong> use {bannerSizeLabel(selectedFormat.desktop)} no computador e {bannerSizeLabel(selectedFormat.mobile)} no celular. As áreas de upload abaixo mudam automaticamente conforme o formato.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUpload label="Imagem desktop" size={selectedFormat.desktop} url={form.desktop_image_url} busy={uploading === 'desktop'} onFile={file => void upload(file, 'desktop')} onClear={() => setForm({ ...form, desktop_image_url: null, desktop_storage_path: null })} />
          <ImageUpload label="Imagem celular (opcional)" size={selectedFormat.mobile} url={form.mobile_image_url} busy={uploading === 'mobile'} onFile={file => void upload(file, 'mobile')} onClear={() => setForm({ ...form, mobile_image_url: null, mobile_storage_path: null })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Início (opcional)"><input type="datetime-local" value={toLocalDate(form.starts_at)} onChange={e => setForm({ ...form, starts_at: e.target.value || null })} className="form-input" /></Field>
          <Field label="Fim (opcional)"><input type="datetime-local" value={toLocalDate(form.ends_at)} onChange={e => setForm({ ...form, ends_at: e.target.value || null })} className="form-input" /></Field>
          <Field label="Cor de fundo"><input type="color" value={form.background_color} onChange={e => setForm({ ...form, background_color: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 p-1" /></Field>
          <Field label="Cor do texto"><input type="color" value={form.text_color} onChange={e => setForm({ ...form, text_color: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 p-1" /></Field>
        </div>

        <div className="flex flex-wrap gap-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          <Toggle checked={form.is_active} onChange={value => setForm({ ...form, is_active: value })} label="Publicar agora" />
          <Toggle checked={form.is_dismissible} onChange={value => setForm({ ...form, is_dismissible: value })} label="Permitir fechar" />
          <Toggle checked={form.show_once_per_session} onChange={value => setForm({ ...form, show_once_per_session: value })} label="Não repetir após fechar" />
          <label className="ml-auto flex items-center gap-2">Prioridade <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1" /></label>
        </div>

        <button type="submit" disabled={saving || Boolean(uploading)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow transition hover:bg-red-700 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editingId ? 'Salvar alterações' : 'Criar banner'}</button>
      </form>

      <aside className="space-y-4">
        <div className="flex items-center justify-between"><div><h3 className="font-extrabold text-slate-900">Banners cadastrados</h3><p className="text-xs text-slate-500">{items.length} promoção(ões)</p></div><button onClick={startNew} className="rounded-xl bg-slate-900 p-2 text-white" title="Novo banner"><Plus className="h-4 w-4" /></button></div>
        {loading ? <div className="rounded-2xl bg-white p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-red-600" /></div> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"><ImageIcon className="mx-auto mb-2 h-8 w-8" />Nenhum banner cadastrado.</div> : items.map(banner => (
          <article key={banner.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {banner.desktop_image_url && <img src={banner.desktop_image_url} alt="" className="h-28 w-full object-cover" />}
            <div className="space-y-3 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-extrabold text-slate-900">{banner.name}</p><p className="text-xs text-slate-500">{placementLabels[banner.placement]}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${banner.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{banner.is_active ? 'ATIVO' : 'RASCUNHO'}</span></div>
              <div className="grid grid-cols-3 gap-2"><button onClick={() => void toggleActive(banner)} className="rounded-lg bg-slate-100 px-2 py-2 text-xs font-bold"><Eye className="mr-1 inline h-3.5 w-3.5" />{banner.is_active ? 'Pausar' : 'Ativar'}</button><button onClick={() => edit(banner)} className="rounded-lg bg-blue-50 px-2 py-2 text-xs font-bold text-blue-700"><Edit2 className="mr-1 inline h-3.5 w-3.5" />Editar</button><button onClick={() => void remove(banner)} className="rounded-lg bg-red-50 px-2 py-2 text-xs font-bold text-red-700"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Excluir</button></div>
            </div>
          </article>
        ))}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-bold uppercase text-slate-600">{label}<div className="mt-1.5 [&_.form-input]:w-full [&_.form-input]:rounded-xl [&_.form-input]:border [&_.form-input]:border-slate-200 [&_.form-input]:px-3 [&_.form-input]:py-2.5 [&_.form-input]:text-sm [&_.form-input]:font-medium [&_.form-input]:outline-none focus-within:[&_.form-input]:border-red-500">{children}</div></label>; }
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) { return <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-red-600" />{label}</label>; }
function ImageUpload({ label, size, url, busy, onFile, onClear }: { label: string; size: BannerImageSize; url: string | null; busy: boolean; onFile: (file?: File) => void; onClear: () => void }) {
  const previewStyle = { aspectRatio: `${size.width} / ${size.height}` };
  return <div className="rounded-2xl border border-slate-200 p-4"><div className="mb-3 flex items-start justify-between gap-2"><div><p className="text-sm font-extrabold text-slate-800">{label}</p><p className="text-[11px] text-slate-400">{size.description}</p></div><span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-extrabold text-white">{bannerSizeLabel(size)}</span></div>{url ? <div style={previewStyle} className="relative mx-auto max-h-72 min-h-28 w-full overflow-hidden rounded-xl bg-slate-100"><img src={url} alt={`Prévia ${bannerSizeLabel(size)}`} className="h-full w-full object-contain" /><button type="button" onClick={onClear} className="absolute right-2 top-2 rounded-full bg-black/65 p-1.5 text-white"><X className="h-4 w-4" /></button></div> : <label style={previewStyle} className="mx-auto flex max-h-72 min-h-28 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center text-xs font-bold text-slate-500 hover:border-red-400">{busy ? <Loader2 className="mb-2 h-6 w-6 animate-spin" /> : <Upload className="mb-2 h-6 w-6" />}Selecionar imagem<span className="mt-1 text-[10px] font-medium text-slate-400">Proporção {size.width}:{size.height}</span><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => onFile(e.target.files?.[0])} /></label>}</div>;
}
