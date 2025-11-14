import { DiskNode } from '../types';
import { formatBytes } from '../utils';

interface DiskDetailsProps {
  disk?: DiskNode;
  onMount: (disk: DiskNode) => Promise<void>;
  onUnmount: (disk: DiskNode) => Promise<void>;
  onOpenExplorer: (disk: DiskNode) => void;
  onToggleFtp: (disk: DiskNode) => Promise<void>;
}

export default function DiskDetails({
  disk,
  onMount,
  onUnmount,
  onOpenExplorer,
  onToggleFtp,
}: DiskDetailsProps) {
  if (!disk) {
    return (
      <section className="flex-1 glass-card p-8 flex items-center justify-center text-slate-500 text-lg">
        <div className="text-center space-y-2">
          <div className="text-4xl">🗄️</div>
          <p className="font-semibold text-slate-200">Selecione um disco na barra lateral</p>
          <p className="text-sm text-slate-500">Use as setas ou clique para explorar as unidades conectadas.</p>
        </div>
      </section>
    );
  }

  const usagePercent = disk.usage?.percentUsed ?? 0;
  const ftpShare = disk.shares?.find((share) => share.type === 'ftp');
  const infoItems = [
    { label: 'Tipo', value: disk.type },
    { label: 'Device', value: disk.device },
    { label: 'Filesystem', value: disk.filesystem || '—' },
    { label: 'UUID', value: disk.uuid || '—' },
    { label: 'Mountpoint', value: disk.mountpoint || 'Não montado' },
    { label: 'Origem', value: disk.removable ? 'External' : 'Internal' },
  ];

  return (
    <section className="flex-1 glass-card p-6 overflow-y-auto scroll-hidden space-y-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl">
            {disk.removable ? '💽' : '🖴'}
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">{disk.label || disk.name}</h2>
            <p className="text-sm text-slate-400">
              {disk.size || '—'} • {disk.filesystem || disk.type}
            </p>
          </div>
        </div>
        <div className="flex gap-2 text-xs text-slate-400">
          <span className="glass px-3 py-1 rounded-full">{disk.removable ? 'Hotplug' : 'Fixed'}</span>
          {disk.isMounted ? (
            <span className="glass px-3 py-1 rounded-full text-cyan-200">Montado</span>
          ) : (
            <span className="glass px-3 py-1 rounded-full text-rose-200">Offline</span>
          )}
        </div>
      </header>

      {disk.usage && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Capacidade: {formatBytes(disk.usage.total)}</span>
            <span>Disponível: {formatBytes(disk.usage.available)}</span>
          </div>
          <div className="h-4 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-blue-600"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {infoItems.map((item) => (
          <InfoCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {!disk.isMounted && (
          <button type="button" className="glass-btn" onClick={() => onMount(disk)}>
            Montar volume
          </button>
        )}
        {disk.isMounted && (
          <button type="button" className="glass-btn bg-rose-400 text-white" onClick={() => onUnmount(disk)}>
            Desmontar
          </button>
        )}
        {disk.isMounted && (
          <button type="button" className="glass-muted-btn" onClick={() => onOpenExplorer(disk)}>
            Abrir explorador
          </button>
        )}
        {disk.isMounted && (
          <button
            type="button"
            className={`glass-muted-btn ${ftpShare ? 'border border-cyan-300 text-cyan-100' : ''}`}
            onClick={() => onToggleFtp(disk)}
          >
            {ftpShare ? 'SMB habilitado' : 'Habilitar SMB'}
          </button>
        )}
      </div>

      {ftpShare && <ShareCard title="SMB" shareName={ftpShare.shareName} smb={ftpShare.smbPath} />}
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs text-slate-400 uppercase tracking-[0.2em]">{label}</div>
      <div className="text-sm font-medium break-words text-white">{value}</div>
    </div>
  );
}

function ShareCard({ title, shareName, smb }: { title: string; shareName: string; smb: string }) {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const smbUrl = smb.startsWith('smb://') ? smb : `smb://${host}/${shareName}`;
  const ftpUrl = `ftp://root@${host}/${shareName}`;

  const copyToClipboard = async (value: string) => {
    await navigator.clipboard.writeText(value);
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{title} Share</div>
          <p className="text-xs text-slate-400">Use os botões ao lado para visualizar o link.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="glass-muted-btn text-sm" hidden onClick={() => copyToClipboard(`${smbUrl}\n${ftpUrl}`)}>
            Copiar link
          </button>
          <details className="glass px-3 py-2 rounded-xl text-sm text-slate-200">
            <summary className="cursor-pointer text-slate-400">Mostrar link</summary>
            <div className="mt-2 space-y-1 text-xs">
              <p>{smbUrl}</p>              
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
