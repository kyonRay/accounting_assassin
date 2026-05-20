export interface VirtualFs {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  list(): Promise<string[]>;
  reset(): Promise<void>;
  loadFixture(files: Record<string, string>): Promise<void>;
}

export function createVirtualFs(): VirtualFs {
  const store = new Map<string, string>();
  return {
    async read(path) {
      const v = store.get(path);
      if (v === undefined) throw new Error(`File not found: ${path}`);
      return v;
    },
    async write(path, content) { store.set(path, content); },
    async exists(path) { return store.has(path); },
    async list() { return [...store.keys()]; },
    async reset() { store.clear(); },
    async loadFixture(files) {
      for (const [p, c] of Object.entries(files)) store.set(p, c);
    },
  };
}
