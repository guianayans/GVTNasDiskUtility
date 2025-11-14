import { useState } from 'react';
import { config } from '../config';

interface AuthOverlayProps {
  open: boolean;
  onUnlock: () => void;
}

export default function AuthOverlay({ open, onUnlock }: AuthOverlayProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const password = config.appPassword;

  if (!open) return null;

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (value === password) {
      setError('');
      onUnlock();
    } else {
      setError('Senha incorreta.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="glass-card w-full max-w-md p-8 space-y-6 text-left"
      >
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Bem-vindo</p>
          <h2 className="text-3xl font-semibold text-white">Painel GVT NAS</h2>
          <p className="text-slate-400 mt-2">Informe a senha para acessar seus discos.</p>
        </div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-[0.3em]">
          Senha
          <input
            type="password"
            className="glass-input w-full mt-2"
            placeholder="Digite a senha"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
          />
        </label>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <button type="submit" className="glass-btn w-full text-base py-3">
          Continuar
        </button>
      </form>
    </div>
  );
}
