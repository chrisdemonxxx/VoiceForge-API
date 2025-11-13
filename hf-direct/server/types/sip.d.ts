/**
 * Type declarations for 'sip' module
 * https://github.com/kirm/sip.js
 */

declare module 'sip' {
  export interface SIPMessage {
    method?: string;
    uri?: string;
    status?: number;
    reason?: string;
    headers: Record<string, any>;
    content?: string;
  }

  export interface SIPOptions {
    port?: number;
    address?: string;
    publicAddress?: string;
    tcp?: boolean;
    tls?: any;
    logger?: {
      send?: (msg: SIPMessage) => void;
      recv?: (msg: SIPMessage) => void;
      error?: (e: any) => void;
    };
  }

  export function start(
    options: SIPOptions,
    handler: (request: SIPMessage) => void
  ): void;

  export function stop(): void;

  export function send(
    message: SIPMessage,
    callback?: (response: SIPMessage) => void
  ): void;

  export function create(options: any, callback?: any): any;
  export function destroy(): void;
}
