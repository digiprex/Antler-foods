declare module 'qz-tray' {
  interface QZWebSocket {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isActive(): boolean;
  }

  interface QZPrinters {
    find(): Promise<string[]>;
    find(query: string): Promise<string>;
  }

  interface QZConfig {
    // opaque config object
  }

  interface QZConfigs {
    create(printer: string, options?: Record<string, unknown>): QZConfig;
  }

  type CertificatePromiseCallback = (resolve: (cert: string) => void, reject: (err: unknown) => void) => void;
  type SignaturePromiseCallback = (toSign: string) => (resolve: (sig: string) => void, reject: (err: unknown) => void) => void;

  interface QZSecurity {
    setCertificatePromise(callback: CertificatePromiseCallback): void;
    setSignatureAlgorithm(algorithm: string): void;
    setSignaturePromise(callback: SignaturePromiseCallback): void;
  }

  interface QZ {
    websocket: QZWebSocket;
    printers: QZPrinters;
    configs: QZConfigs;
    security: QZSecurity;
    print(config: QZConfig, data: unknown[]): Promise<void>;
  }

  const qz: QZ;
  export default qz;
}
