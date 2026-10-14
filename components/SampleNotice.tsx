export function SampleNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="mb-4 text-xs text-gray-500">Some rows here are sample data (tagged sample).</p>;
}

export function SampleTag({ sample }: { sample?: boolean }) {
  return sample ? <span className="ml-1 text-xs text-gray-400">sample</span> : null;
}
