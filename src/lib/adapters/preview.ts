import { BookmarkCoordinator } from '../coordinator';
import { demoData, demoTree } from '../demo';
import type { AppData, BookmarkNode, Client } from '../types';
import { MemoryBookmarks, MemoryPersistence } from './memory';
import { validateUrl } from '../tree';

const TREE_KEY = 'metro.preview.bookmarks.v1';
const DATA_KEY = 'metro.preview.presentation.v1';
function readJson<T>(key: string, fallback: () => T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback(); }
  catch { return fallback(); }
}
export function createPreviewClient(persistent = true): Client {
  const bookmarks = new MemoryBookmarks(persistent ? readJson<BookmarkNode[]>(TREE_KEY, demoTree) : demoTree(),
    persistent ? (tree) => localStorage.setItem(TREE_KEY, JSON.stringify(tree)) : undefined);
  const memory = new MemoryPersistence(demoData());
  const persistence = persistent ? {
    async read() { return readJson<AppData>(DATA_KEY, demoData); },
    async write(data: AppData) { localStorage.setItem(DATA_KEY, JSON.stringify(data)); },
  } : memory;
  let coordinator = new BookmarkCoordinator(bookmarks, persistence, 'preview');
  const clients = new Set<(snapshot: Awaited<ReturnType<typeof coordinator.snapshot>>) => void>();
  let unsubscribe = coordinator.subscribe(() => { void coordinator.snapshot().then((snapshot) => { for (const listener of clients) listener(snapshot); }); });
  const onStorage = (event: StorageEvent) => {
    if (event.key === TREE_KEY) bookmarks.replace(readJson(TREE_KEY, demoTree));
    if (event.key === DATA_KEY) {
      coordinator.dispose();
      unsubscribe();
      coordinator = new BookmarkCoordinator(bookmarks, persistence, 'preview');
      unsubscribe = coordinator.subscribe(() => { void coordinator.snapshot().then((snapshot) => { for (const listener of clients) listener(snapshot); }); });
      void coordinator.snapshot().then((snapshot) => { for (const listener of clients) listener(snapshot); });
    }
  };
  if (persistent) window.addEventListener('storage', onStorage);
  return {
    mode: 'preview', snapshot: () => coordinator.snapshot(), execute: (command) => coordinator.execute(command),
    subscribe(listener) { clients.add(listener); return () => { clients.delete(listener); }; },
    async open(url, disposition) {
      const validated = validateUrl(url);
      window.open(validated, '_blank', disposition === 'window' ? 'noopener,noreferrer,popup' : 'noopener,noreferrer');
    },
    async resetPreview() {
      if (persistent) { localStorage.removeItem(TREE_KEY); localStorage.removeItem(DATA_KEY); }
      coordinator.dispose(); unsubscribe(); bookmarks.replace(demoTree());
      if (!persistent) memory.data = demoData();
      coordinator = new BookmarkCoordinator(bookmarks, persistence, 'preview');
      unsubscribe = coordinator.subscribe(() => { void coordinator.snapshot().then((snapshot) => { for (const listener of clients) listener(snapshot); }); });
      const snapshot = await coordinator.snapshot();
      for (const listener of clients) listener(snapshot);
      return snapshot;
    },
    dispose() { coordinator.dispose(); unsubscribe(); clients.clear(); window.removeEventListener('storage', onStorage); },
  };
}
