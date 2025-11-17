/**
 * Global Type Declarations
 * These declarations allow TypeScript to recognize Node.js and common modules
 * without requiring @types packages to be installed.
 * 
 * Note: The code runs fine with tsx regardless of these type definitions.
 */

declare module 'express' {
  import { Request, Response, NextFunction } from 'express-serve-static-core';
  const express: any;
  export = express;
  export { Request, Response, NextFunction };
  export type Express = any;
}

declare module 'http' {
  const http: {
    createServer: any;
  };
  export = http;
  export type Server = any;
  export function createServer(...args: any[]): any;
}

declare module 'ws' {
  const ws: any;
  export = ws;
  export class WebSocketServer {
    constructor(...args: any[]);
    on(event: string, handler: (...args: any[]) => void): void;
    handleUpgrade(...args: any[]): void;
    emit(event: string, ...args: any[]): void;
  }
  export class WebSocket {
    constructor(...args: any[]);
    send(data: any): void;
    close(code?: number, reason?: string): void;
    on(event: string, handler: (...args: any[]) => void): void;
    readyState: number;
    static readonly OPEN: number;
    static readonly CLOSED: number;
    static readonly CONNECTING: number;
    static readonly CLOSING: number;
  }
}

declare module 'multer' {
  const multer: any;
  export = multer;
}

declare module 'zod' {
  export const z: any;
  export default z;
}

declare module 'crypto' {
  const crypto: any;
  export = crypto;
}

declare module '@shared/schema' {
  export const insertApiKeySchema: any;
  export const insertTelephonyProviderSchema: any;
  export const insertPhoneNumberSchema: any;
  export const insertCallingCampaignSchema: any;
  export type TelephonyProvider = any;
  export type Call = any;
  export type InsertCall = any;
}

declare module '@shared/voices' {
  export type ClonedVoice = any;
  export const VOICE_LIBRARY: any;
}

// Node.js globals
declare var process: {
  env: {
    [key: string]: string | undefined;
    PORT?: string;
    TRUEVOICE_API_KEY?: string;
    TRUEVOICE_LANGUAGE?: string;
    TRUEVOICE_BASE_URL?: string;
    TRUEVOICE_ENABLE_BREATHING?: string;
    TRUEVOICE_ENABLE_PAUSES?: string;
    TRUEVOICE_JITTER_BUFFER_MIN_MS?: string;
    TRUEVOICE_JITTER_BUFFER_MAX_MS?: string;
    TRUEVOICE_JITTER_BUFFER_TARGET_MS?: string;
    REPLIT_DOMAINS?: string;
    DATABASE_URL?: string;
  };
  exit(code?: number): void;
  on(event: string, handler: (...args: any[]) => void): void;
  uptime(): number;
};

declare var Buffer: {
  new (size: number): Buffer;
  new (array: any[]): Buffer;
  from(data: string | ArrayBuffer | Buffer, encoding?: string): Buffer;
  alloc(size: number, fill?: number | string): Buffer;
  isBuffer(obj: any): obj is Buffer;
  prototype: {
    toString(encoding?: string): string;
    writeInt16LE(value: number, offset: number): number;
    readInt16LE(offset: number): number;
    fill(value: number | string, offset?: number, end?: number): Buffer;
    slice(start?: number, end?: number): Buffer;
    length: number;
  };
};

interface Buffer {
  toString(encoding?: string): string;
  writeInt16LE(value: number, offset: number): number;
  readInt16LE(offset: number): number;
  fill(value: number | string, offset?: number, end?: number): Buffer;
  slice(start?: number, end?: number): Buffer;
  length: number;
}

declare var console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  info(...args: any[]): void;
  debug(...args: any[]): void;
};

declare var URL: {
  new (url: string, base?: string): URL;
  prototype: URL;
};

interface URL {
  href: string;
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  searchParams: URLSearchParams;
  hash: string;
}

declare var URLSearchParams: {
  new (init?: string | Record<string, string> | URLSearchParams): URLSearchParams;
  prototype: URLSearchParams;
};

interface URLSearchParams {
  get(name: string): string | null;
  set(name: string, value: string): void;
  has(name: string): boolean;
  delete(name: string): void;
  entries(): IterableIterator<[string, string]>;
  keys(): IterableIterator<string>;
  values(): IterableIterator<string>;
  [Symbol.iterator](): IterableIterator<[string, string]>;
}

