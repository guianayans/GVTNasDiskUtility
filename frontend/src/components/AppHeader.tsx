import { useCallback } from 'react';
import type { RefObject } from 'react';

interface AppHeaderProps {
  onSearch?: (term: string) => void;
  searchRef?: RefObject<HTMLInputElement>;
  onResetShares?: () => void;
  onShowInstructions?: () => void;
}

export default function AppHeader({ onSearch, searchRef, onResetShares, onShowInstructions }: AppHeaderProps) {
  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSearch?.(event.target.value);
    },
    [onSearch]
  );

  return (
    <header className="glass-card flex items-center gap-4 px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-cyan-300/30 border border-cyan-200/30 flex items-center justify-center text-cyan-200 font-semibold shadow-inner">N</div>
        <div>
          <p className="text-sm text-slate-400 uppercase tracking-[0.2em]">Disk Utility</p>
          <h1 className="text-lg font-semibold text-white">GVTNas</h1>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-end gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="search"
            placeholder="Buscar discos, volumes ou shares (⌘K)"
            className="glass-input w-full"
            onChange={handleSearch}
            ref={searchRef}
            id="global-search"
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="glass-muted-btn text-sm" onClick={onShowInstructions}>
            Instruções de conexão
          </button>
          <button type="button" className="glass-muted-btn text-sm" onClick={onResetShares}>
            Redefinir SMB
          </button>
        </div>
      </div>
    </header>
  );
}
