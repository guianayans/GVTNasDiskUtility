import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import DiskDetails from './components/DiskDetails';
import ExplorerOverlay from './components/ExplorerOverlay';
import AuthOverlay from './components/AuthOverlay';
import Toast from './components/Toast';
import AppHeader from './components/AppHeader';
import { DiskNode, DiskResponse, FsEntry } from './types';
import { config } from './config';
import InstructionsOverlay from './components/InstructionsOverlay';

const apiUrl = (path: string) => `${config.apiBaseUrl}${path}`;
const authKey = config.appPassword ? `nas-auth-${config.appPassword}` : 'nas-auth';
const instructionsKey = `${authKey}-instructions`;

interface ToastState {
  message: string;
  type?: 'success' | 'error' | 'info';
}

export default function App() {
  const [data, setData] = useState<DiskResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [fsPath, setFsPath] = useState<string | undefined>();
  const [fsEntries, setFsEntries] = useState<FsEntry[]>([]);
  const [fsLoading, setFsLoading] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string, type: ToastState['type'] = 'info') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!toast) return () => undefined;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const saved = localStorage.getItem(authKey) === '1';
    setAuthenticated(saved);
    setAuthReady(true);
  }, [authKey]);

  useEffect(() => {
    document.body.style.overflow = !authenticated || showExplorer || showInstructions ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [authenticated, showExplorer, showInstructions]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const fetchDisks = useCallback(async () => {
    try {
      const response = await fetch(apiUrl('/api/disks'));
      if (!response.ok) {
        throw new Error('Falha ao carregar discos');
      }
      const payload: DiskResponse = await response.json();
      setData(payload);
      if (!selectedId) {
        const next = payload.internal[0] || payload.external[0];
        setSelectedId(next?.id);
      }
    } catch (error) {
      console.error(error);
      showToast('Erro ao listar discos', 'error');
    }
  }, [selectedId, showToast]);

  useEffect(() => {
    fetchDisks();
    const interval = setInterval(fetchDisks, 5000);
    return () => clearInterval(interval);
  }, [fetchDisks]);

  const selectedDisk = useMemo(() => {
    if (!data || !selectedId) return undefined;
    const search = [...data.internal, ...data.external];
    return findNode(search, selectedId);
  }, [data, selectedId]);

  const handleMount = async (disk: DiskNode) => {
    try {
      const response = await fetch(apiUrl('/api/mount'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: disk.device }),
      });
      if (!response.ok) throw new Error('Erro ao montar volume');
      const payload = await response.json();
      setData(payload.disks);
      showToast('Volume montado', 'success');
    } catch (error) {
      console.error(error);
      showToast('Não foi possível montar', 'error');
    }
  };

  const handleUnmount = async (disk: DiskNode) => {
    try {
      const response = await fetch(apiUrl('/api/unmount'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: disk.device }),
      });
      if (!response.ok) throw new Error('Erro ao desmontar volume');
      const payload = await response.json();
      setData(payload.disks);
      showToast('Volume desmontado', 'success');
    } catch (error) {
      console.error(error);
      showToast('Não foi possível desmontar', 'error');
    }
  };

  const loadDirectory = useCallback(
    async (path: string) => {
      setFsLoading(true);
      try {
        const response = await fetch(apiUrl(`/api/fs/list?path=${encodeURIComponent(path)}`));
        if (!response.ok) throw new Error('Erro ao carregar diretório');
        const payload = await response.json();
        setFsEntries(payload.entries);
        setFsPath(path);
      } catch (error) {
        console.error(error);
        showToast('Não foi possível listar arquivos', 'error');
      } finally {
        setFsLoading(false);
      }
    },
    [showToast]
  );

  const handleDeleteEntry = useCallback(
    async (entry: FsEntry) => {
      const confirmMessage = entry.isDirectory
        ? `Deseja excluir a pasta "${entry.name}" e todo o conteúdo?`
        : `Deseja excluir o arquivo "${entry.name}"?`;
      if (!window.confirm(confirmMessage)) return;
      try {
        const response = await fetch(apiUrl('/api/fs/delete'), {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: entry.path }),
        });
        if (!response.ok) throw new Error('Falha ao remover');
        showToast('Remoção concluída', 'success');
        if (fsPath) {
          await loadDirectory(fsPath);
        }
      } catch (error) {
        console.error(error);
        showToast('Não foi possível remover o item', 'error');
      }
    },
    [fsPath, loadDirectory, showToast]
  );

  const openExplorer = async (disk: DiskNode) => {
    if (!disk.mountpoint) return;
    setFsPath(disk.mountpoint);
    await loadDirectory(disk.mountpoint);
    setShowExplorer(true);
  };

  useEffect(() => {
    const mountpoint = selectedDisk?.mountpoint;
    if (!mountpoint) {
      if (fsPath) {
        setFsEntries([]);
        setFsPath(undefined);
      }
      return;
    }
    if (!fsPath || !fsPath.startsWith(mountpoint)) {
      setFsPath(mountpoint);
      loadDirectory(mountpoint);
    }
  }, [selectedDisk?.mountpoint, fsPath, loadDirectory, selectedDisk]);

  const toggleFtpShare = async (disk: DiskNode) => {
    if (!disk.mountpoint) return;
    const existing = disk.shares?.find((share) => share.type === 'ftp');
    const endpoint = existing ? '/api/ftp/disable' : '/api/ftp/enable';
    const body = existing
      ? { shareName: existing.shareName }
      : { mountPoint: disk.mountpoint, shareName: buildShareName(disk, 'FTP') };
    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('Erro ao configurar FTP');
      await fetchDisks();
      showToast(existing ? 'SMB removido' : 'SMB habilitado', 'success');
    } catch (error) {
      console.error(error);
      showToast('Falha ao atualizar SMB', 'error');
    }
  };

  const handleUpload = useCallback(
    async (files: FileList | File[], target: string) => {
      if (!files || !target) return;
      const list = Array.from(files);
      if (!list.length) return;
      const formData = new FormData();
      formData.append('targetPath', target);
      list.forEach((file) => formData.append('files', file));
      setUploading(true);
      try {
        const response = await fetch(apiUrl('/api/fs/upload'), {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Falha no upload');
        showToast('Upload concluído', 'success');
        await loadDirectory(target);
      } catch (error) {
        console.error(error);
        showToast('Não foi possível enviar os arquivos', 'error');
      } finally {
        setUploading(false);
      }
    },
    [loadDirectory, showToast]
  );

  const handleUnlock = useCallback(() => {
    const alreadyUnlocked = localStorage.getItem(authKey) === '1';
    localStorage.setItem(authKey, '1');
    setAuthenticated(true);
    if (!alreadyUnlocked) {
      setShowInstructions(true);
      localStorage.setItem(instructionsKey, '1');
    }
  }, [authKey, instructionsKey]);

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-6xl mx-auto py-6 space-y-6">
        <AppHeader
          onSearch={setSearchTerm}
          searchRef={searchInputRef}
          onResetShares={async () => {
            if (!window.confirm('Deseja remover todos os shares SMB ativos?')) return;
            try {
            const response = await fetch(apiUrl('/api/smb/reset'), { method: 'POST' });
              if (!response.ok) throw new Error('Falha ao redefinir SMB');
              await fetchDisks();
              showToast('Shares SMB redefinidos', 'success');
            } catch (error) {
              console.error(error);
              showToast('Não foi possível redefinir os SMBs', 'error');
            }
          }}
          onShowInstructions={() => setShowInstructions(true)}
        />
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Sidebar
            internal={data?.internal ?? []}
            external={data?.external ?? []}
            selectedId={selectedId}
            onSelect={(node) => setSelectedId(node.id)}
            filterTerm={searchTerm}
          />
          <div className="flex flex-col gap-4">
            <DiskDetails
              disk={selectedDisk}
              onMount={handleMount}
              onUnmount={handleUnmount}
              onOpenExplorer={openExplorer}
              onToggleFtp={toggleFtpShare}
            />
          </div>
        </div>
      </div>
      <ExplorerOverlay
        open={showExplorer}
        path={fsPath}
        entries={fsEntries}
        loading={fsLoading}
        onNavigate={loadDirectory}
        onClose={() => setShowExplorer(false)}
        onDelete={handleDeleteEntry}
        onUpload={(files) => {
          if (fsPath) void handleUpload(files, fsPath);
        }}
        uploading={uploading}
      />
      <AuthOverlay
        open={authReady && !authenticated}
        onUnlock={handleUnlock}
      />
      <InstructionsOverlay open={showInstructions} onClose={() => setShowInstructions(false)} />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

function findNode(nodes: DiskNode[], id: string): DiskNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const child = findNode(node.children, id);
      if (child) return child;
    }
  }
  return undefined;
}

function buildShareName(disk: DiskNode, _prefix?: string) {
  const name = (disk.label || disk.name).replace(/[^A-Za-z0-9_-]/g, '');
  return name;
}
