import { FsEntry } from '../types';
import { buildBreadcrumb, formatBytes, formatDate } from '../utils';

interface FileExplorerProps {
  path?: string;
  entries: FsEntry[];
  loading: boolean;
  onNavigate: (nextPath: string) => void;
  onClose: () => void;
}

export default function FileExplorer({ path, entries, loading, onNavigate, onClose }: FileExplorerProps) {
  if (!path) return null;

  const crumbs = buildBreadcrumb(path);
  const parent = getParentPath(path);

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
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
        <button type="button" onClick={onClose} className="glass-muted-btn text-sm">
          Fechar
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-400">
        <button disabled={!parent} className="glass-muted-btn disabled:opacity-30" type="button" onClick={() => parent && onNavigate(parent)}>
          ← Voltar
        </button>
        <span className="text-xs text-slate-500">{path}</span>
      </div>

      <div className="max-h-80 overflow-y-auto scroll-hidden">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900/80">
            <tr className="text-left text-xs uppercase text-slate-500">
              <th className="py-2">Nome</th>
              <th>Tamanho</th>
              <th>Atualizado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-500">
                  Pasta vazia
                </td>
              </tr>
            )}
            {!loading &&
              entries.map((entry) => (
                <tr key={entry.path} className="border-t border-white/5 hover:bg-white/5 transition">
                  <td className="py-2">
                    {entry.isDirectory ? (
                      <button type="button" className="text-cyan-200" onClick={() => onNavigate(entry.path)}>
                        {entry.name}/
                      </button>
                    ) : (
                      entry.name
                    )}
                  </td>
                  <td>{entry.isDirectory ? '—' : formatBytes(entry.size)}</td>
                  <td>{formatDate(entry.modified)}</td>
                  <td>
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
  );
}

function getParentPath(current: string): string | null {
  const trimmed = current.replace(/\/$/g, '');
  const idx = trimmed.lastIndexOf('/');
  if (idx <= 0) return null;
  return trimmed.slice(0, idx) || '/';
}
