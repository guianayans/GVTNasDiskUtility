export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(1)} ${units[index]}`;
}

export function formatDate(input: string): string {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleString();
}

export function buildBreadcrumb(path: string): { label: string; target: string }[] {
  const clean = path.replace(/\\/g, '/');
  const segments = clean.split('/').filter(Boolean);
  const crumbs: { label: string; target: string }[] = [];
  segments.reduce((acc, segment) => {
    const current = `${acc}/${segment}`.replace(/\/+/g, '/');
    crumbs.push({ label: segment, target: current });
    return current;
  }, '');
  return crumbs;
}
