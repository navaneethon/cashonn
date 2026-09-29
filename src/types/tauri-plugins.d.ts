declare module "@tauri-apps/plugin-dialog" {
  interface OpenOptions {
    multiple?: boolean;
    filters?: Array<{ name: string; extensions: string[] }>;
    defaultPath?: string;
  }

  interface SaveOptions {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }

  export function open(options?: OpenOptions): Promise<string | string[] | null>;
  export function save(options?: SaveOptions): Promise<string | null>;
}
