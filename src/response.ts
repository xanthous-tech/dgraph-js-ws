export interface ResponsePayload {
  id?: string;
  error?: string;
  message?: string;
  json?: any;
  uidsMap?: { [key: string]: string };
}

export class Response {
  private payload: ResponsePayload;
  private uidsMap: Map<string, string>;

  constructor(payload: ResponsePayload) {
    this.payload = payload;
  }

  public getJson(): any {
    return this.payload.json;
  }

  // return as any to bypass undefined check
  public getUidsMap(): any {
    if (!this.payload.uidsMap) {
      return new Map<string, string>();
    }

    if (!this.uidsMap) {
      this.uidsMap = new Map<string, string>(Object.entries(this.payload.uidsMap));
    }

    return this.uidsMap;
  }
}
