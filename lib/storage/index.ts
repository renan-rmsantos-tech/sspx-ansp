import { mkdir, readFile, rename, stat, unlink, writeFile } from "fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "path";

/**
 * Armazenamento dos documentos enviados no formulário.
 *
 * Driver único (sistema de arquivos) montado num volume Docker em produção.
 * A interface existe para que um driver S3/DigitalOcean Spaces possa ser
 * adicionado depois sem tocar nas server actions.
 */
export interface StorageDriver {
  put(path: string, body: Buffer): Promise<void>;
  get(path: string): Promise<Buffer | null>;
  move(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
  /** Tamanho em bytes, ou null se o arquivo não existir. */
  size(path: string): Promise<number | null>;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function storageRoot(): string {
  return resolve(process.env.STORAGE_DIR || ".storage");
}

/**
 * Impede que um caminho vindo do cliente escape da raiz do storage
 * (`../`, caminho absoluto, byte nulo).
 */
export function resolveStoragePath(path: string): string {
  if (!path || path.includes("\0") || isAbsolute(path)) {
    throw new Error("Caminho de arquivo inválido.");
  }

  const root = storageRoot();
  const full = resolve(join(root, path));

  if (full !== root && !full.startsWith(root + sep)) {
    throw new Error("Caminho de arquivo inválido.");
  }

  return full;
}

const localDriver: StorageDriver = {
  async put(path, body) {
    const full = resolveStoragePath(path);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, body);
  },

  async get(path) {
    try {
      return await readFile(resolveStoragePath(path));
    } catch {
      return null;
    }
  },

  async move(from, to) {
    const source = resolveStoragePath(from);
    const target = resolveStoragePath(to);
    await mkdir(dirname(target), { recursive: true });
    await rename(source, target);
  },

  async remove(path) {
    try {
      await unlink(resolveStoragePath(path));
    } catch {
      // Já removido — nada a fazer.
    }
  },

  async size(path) {
    try {
      return (await stat(resolveStoragePath(path))).size;
    } catch {
      return null;
    }
  },
};

export function getStorage(): StorageDriver {
  return localDriver;
}

export function guessMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
