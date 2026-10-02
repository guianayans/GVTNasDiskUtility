import { useEffect, useState } from 'react';
import { config } from '../config';

interface SystemInfo {
  localIp: string | null;
  publicIp: string | null;
  hostname: string;
  domain: string | null;
}

interface PeerInfo {
  name: string;
  hasQr: boolean;
  hasConf: boolean;
}

interface PeerDetail {
  peer: string;
  qrImage: string | null;
  confContent: string | null;
}

interface InstructionsOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function InstructionsOverlay({ open, onClose }: InstructionsOverlayProps) {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [vpnEnabled, setVpnEnabled] = useState(true);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [peerDetail, setPeerDetail] = useState<PeerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [sysRes, peerRes] = await Promise.all([
          fetch(`${config.apiBaseUrl}/api/system/info`),
          fetch(`${config.apiBaseUrl}/api/wireguard/peers`),
        ]);
        if (!sysRes.ok || !peerRes.ok) throw new Error('Falha ao carregar status');
        const sysPayload = await sysRes.json();
        const peerPayload = await peerRes.json();
        setSystemInfo(sysPayload);
        const peerList: PeerInfo[] = Array.isArray(peerPayload?.peers) ? peerPayload.peers : [];
        setPeers(peerList);
        setVpnEnabled(peerPayload?.enabled !== false);
        setSelectedPeer((prev) => prev || peerList[0]?.name || null);
      } catch (err) {
        console.error(err);
        setError('Não foi possível carregar as informações.');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [open]);

  useEffect(() => {
    if (!open || !selectedPeer) {
      setPeerDetail(null);
      return;
    }
    const controller = new AbortController();
    const fetchPeer = async () => {
      try {
        const response = await fetch(`${config.apiBaseUrl}/api/wireguard/${encodeURIComponent(selectedPeer)}/qr`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Peer não encontrado');
        const payload = await response.json();
        setPeerDetail({
          peer: payload.peer,
          qrImage: payload.qrImage ?? null,
          confContent: payload.confContent ?? null,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error(err);
          setPeerDetail(null);
        }
      }
    };
    void fetchPeer();
    return () => controller.abort();
  }, [open, selectedPeer]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center px-6">
      <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Guia rápido</p>
            <h2 className="text-2xl font-semibold text-white">Instruções de conexão</h2>
            <p className="text-slate-400">A senha do painel é a mesma que você configurou nas variáveis de ambiente.</p>
          </div>
          <button type="button" className="glass-btn" onClick={onClose}>
            Fechar
          </button>
        </header>
        <div className="p-6 space-y-6 text-slate-200 text-sm">
          {loading && <p className="text-slate-400">Carregando informações...</p>}
          {error && <p className="text-rose-300">{error}</p>}

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">1. Configurar WireGuard</h3>
            {vpnEnabled ? (
            <>
            <p className="text-slate-400">
              Instale o aplicativo WireGuard no celular ou computador. Use os dados abaixo para conectar-se à sua rede.
            </p>
            <div className="grid md:grid-cols-[260px_1fr] gap-4">
              <div className="glass rounded-2xl p-4 border border-white/10 flex flex-col items-center gap-3">
                <div className="w-full flex gap-2 flex-wrap">
                  {peers.map((peer) => (
                    <button
                      key={peer.name}
                      type="button"
                      className={`flex-1 min-w-[90px] glass px-3 py-1 rounded-full text-xs ${
                        peer.name === selectedPeer ? 'bg-cyan-400/20 text-white' : 'text-slate-300'
                      }`}
                      onClick={() => setSelectedPeer(peer.name)}
                    >
                      {peer.name}
                    </button>
                  ))}
                  {peers.length === 0 && (
                    <span className="text-xs text-slate-400">Nenhum peer encontrado em /wg-config.</span>
                  )}
                </div>
                <div className="w-36 h-36 bg-slate-950/70 rounded-xl flex items-center justify-center border border-white/10 text-xs text-slate-500 text-center px-2">
                  {peerDetail?.qrImage ? <img src={peerDetail.qrImage} alt={`QR ${peerDetail.peer}`} /> : 'QR Code indisponível'}
                </div>
                <button
                  type="button"
                  className="glass-btn w-full"
                  onClick={() => {
                    if (!peerDetail?.confContent) {
                      window.alert('Arquivo .conf não disponível ainda.');
                      return;
                    }
                    const blob = new Blob([peerDetail.confContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${peerDetail.peer}.conf`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Baixar .conf
                </button>
              </div>
              <div className="glass rounded-2xl p-4 border border-white/10 space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Peers ativos</p>
                {peers.length ? (
                  <ul className="space-y-2">
                    {peers.map((peer) => {
                      const status = [];
                      if (peer.hasQr) status.push('QR');
                      if (peer.hasConf) status.push('.conf');
                      return (
                        <li
                          key={peer.name}
                          className="glass px-3 py-2 rounded-xl border border-white/5 flex items-center justify-between text-sm"
                        >
                          <span>{peer.name}</span>
                          <span className="text-xs text-slate-400">{status.join(' · ') || 'incompleto'}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-slate-300">Nenhum peer configurado ainda. Adicione no painel do GVTNas.</p>
                )}
              </div>
            </div>
            </>
            ) : (
              <div className="glass rounded-2xl p-4 border border-white/10 space-y-1">
                <p className="text-slate-200">A VPN embutida do GVTNas está desativada neste servidor.</p>
                <p className="text-slate-400">
                  Para acessar de fora de casa, conecte-se pela VPN que você já usa para chegar na sua rede e siga o passo 2.
                  Dentro de casa, vá direto ao passo 2.
                </p>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">2. Acessar via SMB</h3>
            <p className="text-slate-400">
              No Finder (macOS) ou no explorador do Windows, utilize o caminho:
              <br />
              <strong className="text-white text-base">
                smb://{systemInfo?.domain || systemInfo?.localIp || 'SEU_HOST'}
              </strong>
            </p>
            <p className="text-slate-400">
              Usuário: <code>nasuser</code> · Senha: mesma do painel
            </p>
          </section>

  <section className="space-y-3">
            <h3 className="text-lg font-semibold">3. Seu NAS caseiro</h3>
            <p className="text-slate-400">
              O GVTNas lista discos, monta unidades, cria compartilhamentos SMB e permite explorar as pastas direto do navegador.
              Pense nele como um “Disk Utility” com superpoderes: plugar, montar, compartilhar e acessar de qualquer lugar.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">4. Guia rápido</h3>
            <ol className="list-decimal list-inside space-y-1 text-slate-300">
              <li>Montar o disco desejado na barra lateral.</li>
              <li>Habilitar o SMB apenas para os discos que precisa expor.</li>
              <li>Usar o explorador para mover e baixar arquivos (agora com upload!).</li>
              <li>Compartilhar o link do WireGuard para acesso remoto seguro.</li>
            </ol>
          </section>

          {systemInfo && (
            <section className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Status rápido</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <InfoPill label="Hostname" value={systemInfo.hostname} />
                <InfoPill label="IP Local" value={systemInfo.localIp ?? '—'} />
                <InfoPill label="IP Público" value={systemInfo.publicIp ?? '—'} />
                <InfoPill label="Domínio" value={systemInfo.domain ?? '—'} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-3 border border-white/10">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
