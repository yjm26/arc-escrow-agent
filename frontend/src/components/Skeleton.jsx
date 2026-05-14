export default function Skeleton({ className = '', lines = 1, circle = false }) {
  const base = 'animate-pulse bg-gray-200 dark:bg-white/10 rounded'
  if (circle) {
    return <div className={`${base} ${className}`} style={{ aspectRatio: '1/1' }} />
  }
  if (lines === 1) {
    return <div className={`${base} ${className}`} />
  }
  return (
    <div className="space-y-2 w-full">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`${base} h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`} />
      ))}
    </div>
  )
}
