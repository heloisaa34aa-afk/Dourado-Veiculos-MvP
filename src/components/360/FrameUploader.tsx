import React, { useCallback, useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { validation360 } from '../../utils/validation360';

interface FrameUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  uploading: boolean;
  progress: { current: number; total: number };
}

export function FrameUploader({ onUpload, uploading, progress }: FrameUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const invalidFiles = files.filter(f => !validation360.validateImageFormat(f));
      if (invalidFiles.length > 0) {
        setError(`Formato inválido encontrado. Use JPEG, PNG ou WebP.`);
        return;
      }
      if (files.length < 24 || files.length > 96) {
        setError(`Selecione entre 24 e 96 imagens (atual: ${files.length}).`);
        return;
      }
      
      const sorted = validation360.sortFilesNumerically(files);
      if (validation360.hasDuplicates(sorted)) {
        setError("Nomes de arquivos com números duplicados detectados. Renomeie as imagens.");
        return;
      }
      
      setError(null);
      setSelectedFiles(sorted);
    }
  };

  const handleUploadClick = async () => {
    if (selectedFiles.length === 0) return;
    try {
      setError(null);
      await onUpload(selectedFiles);
      setSelectedFiles([]);
    } catch (err: any) {
      setError(err.message || 'Erro no upload.');
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
      <div className="text-center mb-4">
        <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-2" />
        <h4 className="font-medium text-gray-700">Upload de Sequência 360°</h4>
        <p className="text-sm text-gray-500 mb-4">Selecione entre 24 e 96 imagens sequenciais (JPEG, PNG, WebP).</p>
        
        <input 
          type="file" 
          multiple 
          accept="image/jpeg, image/png, image/webp" 
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 mb-4"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {selectedFiles.length > 0 && !uploading && (
        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-700">
            {selectedFiles.length} arquivos selecionados e ordenados:
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex-shrink-0 w-16 text-center">
                <div className="h-16 w-16 bg-gray-200 rounded-md mb-1 flex items-center justify-center overflow-hidden">
                  <img src={URL.createObjectURL(file)} alt="" className="object-cover h-full w-full" />
                </div>
                <div className="text-xs text-gray-500 truncate" title={file.name}>{file.name}</div>
              </div>
            ))}
          </div>
          <button 
            onClick={handleUploadClick}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} /> Iniciar Upload
          </button>
        </div>
      )}

      {uploading && (
        <div className="mt-4">
          <div className="flex justify-between text-sm font-medium text-indigo-700 mb-1">
            <span>Enviando frames...</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.max(5, (progress.current / progress.total) * 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
