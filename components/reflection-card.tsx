'use client';

import * as React from 'react';
import { BookOpen, Check, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReflectionCardProps {
  videoId: string;
  prompt: string;
  onShareToDiscussion?: (note: string) => void;
}

const subscribeStorage = (callback: () => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

export function ReflectionCard({
  videoId,
  prompt,
  onShareToDiscussion,
}: ReflectionCardProps) {
  const storageKey = `kinship:reflection:${videoId}`;

  const persistedNote = React.useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return window.localStorage.getItem(storageKey) ?? '';
      } catch {
        return '';
      }
    },
    () => ''
  );

  const [draftNote, setDraftNote] = React.useState<string | null>(null);
  const [savedIndicator, setSavedIndicator] = React.useState(false);
  const [manuallyOpened, setManuallyOpened] = React.useState(false);

  const note = draftNote !== null ? draftNote : persistedNote;
  const isOpen = manuallyOpened || persistedNote.length > 0;

  const handleSaveNote = () => {
    try {
      window.localStorage.setItem(storageKey, note);
      setSavedIndicator(true);
      window.setTimeout(() => setSavedIndicator(false), 2000);
    } catch {
      // Ignore storage access errors
    }
  };

  return (
    <section
      aria-labelledby="reflection-prompt-heading"
      className="rounded-xl bg-rose-50/70 dark:bg-[#18151A] border border-rose-200/80 dark:border-rose-900/40 p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span id="reflection-prompt-heading">Reflection Prompt</span>
        </div>
        {!isOpen && (
          <button
            type="button"
            onClick={() => setManuallyOpened(true)}
            className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white underline underline-offset-4 cursor-pointer whitespace-nowrap"
          >
            Write private note
          </button>
        )}
      </div>

      <blockquote className="mt-3 font-display text-base sm:text-lg leading-relaxed text-zinc-900 dark:text-zinc-100">
        “{prompt}”
      </blockquote>

      {isOpen && (
        <div className="mt-5 pt-4 border-t border-rose-200/80 dark:border-zinc-800">
          <label
            htmlFor={`reflection-note-${videoId}`}
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2"
          >
            Private Reflection Journal (stored locally in your browser)
          </label>
          <textarea
            id={`reflection-note-${videoId}`}
            rows={3}
            value={note}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="Write what stood out to you during this lesson..."
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111114] px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveNote}
              >
                {savedIndicator ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Saved locally
                  </>
                ) : (
                  'Save Private Note'
                )}
              </Button>
              {onShareToDiscussion && note.trim().length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onShareToDiscussion(note)}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Copy to Discussion
                </Button>
              )}
            </div>
            <span className="text-xs text-zinc-500">
              Private unless you choose to post below
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
