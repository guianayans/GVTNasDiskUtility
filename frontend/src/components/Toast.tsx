interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
}

export default function Toast({ message, type = 'info' }: ToastProps) {
  const colors: Record<typeof type, string> = {
    success: 'bg-emerald-500/90',
    error: 'bg-rose-500/90',
    info: 'bg-slate-700/90',
  };
  return (
    <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm text-white shadow-glass ${colors[type]}`}>
      {message}
    </div>
  );
}
