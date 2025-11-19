import { useRef, useState } from 'react';
import { FsEntry } from '../types';
import { buildBreadcrumb, formatBytes, formatDate } from '../utils';

interface ExplorerOverlayProps {
  open: boolean;
  path?: string;
  entries: FsEntry[];
  loading: boolean;
  onNavigate: (path: string) => void;
  onClose: () => void;
  onDelete: (entry: FsEntry) => void;
  onUpload: (files: FileList | File[]) => void;
  uploading: boolean;
  onDownload: (entry: FsEntry) => void;
}

export default function ExplorerOverlay({
  open,
  path,
  entries,
  loading,
  onNavigate,
  onClose,
  onDelete,
  onUpload,
  uploading,
  onDownload,
}: ExplorerOverlayProps) {
  if (!open || !path) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const crumbs = buildBreadcrumb(path);
  const parent = getParentPath(path);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      onUpload(event.target.files);
      event.target.value = '';
    }
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.currentTarget === event.target) {
      setDragActive(false);
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (event.dataTransfer.files?.length) {
      onUpload(event.dataTransfer.files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center px-6">
      <div className="glass-card w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex flex-wrap gap-2 text-sm text-slate-300">
            {crumbs.map((crumb, index) => (
              <button
                key={crumb.target}
                type="button"
                className="hover:text-white"
                onClick={() => onNavigate(crumb.target)}
              >
                {index === crumbs.length - 1 ? <strong>{crumb.label}</strong> : crumb.label}
              </button>
            ))}
          </div>
          <button type="button" className="glass-btn" onClick={onClose}>
            Fechar
          </button>
        </header>
        <div className="p-4 flex flex-wrap items-center gap-3 text-sm text-slate-400 border-b border-white/5">
          <button
            type="button"
            className="glass-muted-btn disabled:opacity-40"
            disabled={!parent}
            onClick={() => parent && onNavigate(parent)}
          >
            ← Voltar
          </button>
          <span className="text-xs text-slate-500">{path}</span>
          <div className="flex-1" />
          <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileChange} />
          <button type="button" className="glass-btn text-sm" onClick={() => fileInputRef.current?.click()}>
            Enviar arquivos
          </button>
        </div>
        <div
          className={`flex-1 overflow-y-auto scroll-hidden transition border-t border-white/5 ${
            dragActive ? 'ring-2 ring-cyan-300/60 border-dashed border-cyan-200/40' : ''
          }`}
          onDragOver={onDragOver}
          onDragEnter={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/90">
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-2 px-4">Nome</th>
                <th className="px-4">Tamanho</th>
                <th className="px-4">Atualizado</th>
                <th className="px-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {uploading && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-cyan-200">
                    Enviando arquivos...
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Carregando...
                  </td>
                </tr>
              )}
              {!loading && entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    Pasta vazia
                  </td>
                </tr>
              )}
              {!loading &&
                entries.map((entry) => (
                  <tr key={entry.path} className="border-t border-white/10 hover:bg-white/5">
                    <td className="py-2 px-4">
                      {entry.isDirectory ? (
                        <button type="button" className="text-cyan-200" onClick={() => onNavigate(entry.path)}>
                          {entry.name}/
                        </button>
                      ) : (
                        entry.name
                      )}
                    </td>
                    <td className="px-4">{entry.isDirectory ? '—' : formatBytes(entry.size)}</td>
                    <td className="px-4">{formatDate(entry.modified)}</td>
                    <td className="px-4">
                      <div className="flex flex-wrap gap-3 text-xs">
                        <button
                          type="button"
                          className="text-cyan-200 hover:text-cyan-100"
                          onClick={() => onDownload(entry)}
                        >
                          {entry.isDirectory ? 'Baixar .zip' : 'Download'}
                        </button>
                        <button
                          type="button"
                          className="text-rose-300 hover:text-rose-200"
                          onClick={() => onDelete(entry)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getParentPath(current: string): string | null {
  const trimmed = current.replace(/\/$/g, '');
  const idx = trimmed.lastIndexOf('/');
  if (idx <= 0) return null;
  return trimmed.slice(0, idx) || '/';
}
