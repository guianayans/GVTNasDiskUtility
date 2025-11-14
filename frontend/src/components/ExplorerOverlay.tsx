import { FsEntry } from '../types';
import { buildBreadcrumb, formatBytes, formatDate } from '../utils';

interface ExplorerOverlayProps {
  open: boolean;
  path?: string;
  entries: FsEntry[];
  loading: boolean;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

export default function ExplorerOverlay({ open, path, entries, loading, onNavigate, onClose }: ExplorerOverlayProps) {
  if (!open || !path) return null;

  const crumbs = buildBreadcrumb(path);
  const parent = getParentPath(path);

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
        <div className="p-4 flex items-center gap-3 text-sm text-slate-400 border-b border-white/5">
          <button
            type="button"
            className="glass-muted-btn disabled:opacity-40"
            disabled={!parent}
            onClick={() => parent && onNavigate(parent)}
          >
            ← Voltar
          </button>
          <span className="text-xs text-slate-500">{path}</span>
        </div>
        <div className="flex-1 overflow-y-auto scroll-hidden">
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
                      {!entry.isDirectory && (
                        <a
                          className="text-xs text-cyan-200 hover:text-cyan-100"
                          href={`/api/fs/download?path=${encodeURIComponent(entry.path)}`}
                        >
                          Download
                        </a>
                      )}
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
