/**
 * Tipos mínimos para APIs de Workers Cloudflare usadas en rutas API,
 * disponibles en el runtime pero no en los lib de TypeScript del editor.
 * Algunos se declaran como módulo (cloudflare:workers); otros amplían
 * interfaces existentes del lib DOM (CacheStorage).
 */

declare module "cloudflare:workers" {
  export interface Env {
    DB: D1Database;
    MEDIA: R2Bucket;
    ADMIN_TOKEN?: string;
  }
  export const env: Env;
}

/** Base de datos D1 (subset usado por el proyecto). */
interface D1Result<T = unknown> {
  meta: { changes: number };
  results?: T[];
}
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

/** Bucket R2 (subset usado por el proyecto). */
interface R2Object {
  httpMetadata?: { contentType?: string };
  httpEtag?: string;
}
interface R2ObjectBody extends R2Object {
  body: ReadableStream;
}
interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<R2Object>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}

/** Amplía CacheStorage del lib DOM con la propiedad `default` del runtime. */
interface CacheStorage {
  default: Cache;
}
