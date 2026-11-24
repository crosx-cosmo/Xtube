import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <p className="font-mono text-xs text-rose-600 dark:text-rose-500">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        Video or channel not found
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        The seminar or educator channel you were looking for is unavailable.
      </p>
      <div className="mt-8">
        <Button asChild variant="primary" size="md">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
