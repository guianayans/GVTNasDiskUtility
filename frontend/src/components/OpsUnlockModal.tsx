import { useEffect, useState } from 'react';

interface OpsUnlockModalProps {
  open: boolean;
  loading: boolean;
  error?: string;
  onSubmit: (password: string) => void;
  onClose: () => void;
}

export default function OpsUnlockModal({ open, loading, error, onSubmit, onClose }: OpsUnlockModalProps) {
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!open) {
      setPassword('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!loading) {
      onSubmit(password);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="glass-card w-full max-w-md p-6 space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Segurança extra</p>
          <h2 className="text-2xl font-semibold text-white">Desbloquear operações</h2>
          <p className="text-sm text-slate-400">
            Digite a senha do GVTNas para liberar downloads e uploads por 5 minutos.
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="ops-password" className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Senha
          </label>
          <input
            id="ops-password"
            type="password"
            className="glass-input w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha do painel"
            autoFocus
            disabled={loading}
          />
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <div className="flex items-center justify-end gap-3">
          <button type="button" className="glass-muted-btn" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="glass-btn" disabled={loading || !password}>
            {loading ? 'Validando...' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  );
}
