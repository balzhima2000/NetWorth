import { cn } from './cn';

/** Skeleton / Loading block — resize via className (w-… h-…). Shimmer
 *  via Tailwind's animate-pulse. Stack/resize to mimic loading content. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-raised', className)} />;
}
