import debug from 'debug';
import WebSocket from 'ws';
import { ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';

import { Mutation, MutationPayload } from './mutation';
import { Response, ResponsePayload } from './response';

const log = debug('dgraph-js-ws:txn');

async function sleep(timeout: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

export type TxnOptions = {
  readOnly?: boolean;
  bestEffort?: boolean;
};

interface Vars {
  [key: string]: string | string[] | undefined;
}

interface QueryPayload {
  q: string;
  vars?: Vars;
}

interface RequestPayload {
  query?: QueryPayload;
  mutate?: MutationPayload;
  commit?: boolean;
}

export class Txn {
  private ws: WebSocket;
  private connectedSubject: ReplaySubject<boolean>;
  private pingTask: NodeJS.Timeout;

  constructor(address: string) {
    this.connectedSubject = new ReplaySubject(1);
    this.connectedSubject.next(false);

    log('connecting');

    this.ws = new WebSocket(address);

    this.ws.on('open', () => {
      log(`connected to ${address}`);
      this.connectedSubject.next(true);
      this.pingTask = setInterval(() => {
        this.ws.ping();
      }, 3000);
    });

    this.ws.on('close', () => {
      log(`disconnected`);
      this.connectedSubject.next(false);
      clearInterval(this.pingTask);
    });
  }

  public async query(q: string): Promise<Response> {
    return this.queryWithVars(q);
  }

  public async queryWithVars(q: string, vars?: Vars): Promise<Response> {
    await this.waitUntilConnected();

    const request: RequestPayload = {
      query: {
        q,
        vars,
      },
    };

    log(JSON.stringify(request));

    return new Promise((resolve, reject) => {
      this.ws.once('message', (data) => {
        try {
          const payload: ResponsePayload = JSON.parse(data.toString());
          if (payload.error) {
            reject(new Error(payload.error));
          } else {
            resolve(new Response(payload));
          }
        } catch (e) {
          log(e);
          reject(e);
        }
      });

      this.ws.send(JSON.stringify(request));
    });
  }

  public async mutate(mu: Mutation): Promise<Response> {
    await this.waitUntilConnected();

    const request: RequestPayload = {
      mutate: mu.getPayload(),
    };

    log(JSON.stringify(request));

    return new Promise((resolve, reject) => {
      this.ws.once('message', (data) => {
        try {
          const payload: ResponsePayload = JSON.parse(data.toString());
          if (payload.error) {
            reject(new Error(payload.error));
          } else {
            resolve(new Response(payload));
          }
        } catch (e) {
          log(e);
          reject(e);
        }
      });

      this.ws.send(JSON.stringify(request));
    });
  }

  public async upsertWithVars(q: string, mu: Mutation, vars?: Vars): Promise<Response> {
    await this.waitUntilConnected();

    const request: RequestPayload = {
      query: {
        q,
        vars,
      },
      mutate: mu.getPayload(),
    };

    log(JSON.stringify(request));

    return new Promise((resolve, reject) => {
      this.ws.once('message', (data) => {
        try {
          const payload: ResponsePayload = JSON.parse(data.toString());
          if (payload.error) {
            reject(new Error(payload.error));
          } else {
            resolve(new Response(payload));
          }
        } catch (e) {
          log(e);
          reject(e);
        }
      });

      this.ws.send(JSON.stringify(request));
    });
  }

  public async commit(): Promise<Response> {
    await this.waitUntilConnected();

    const request: RequestPayload = {
      commit: true,
    };

    log(JSON.stringify(request));

    return new Promise((resolve, reject) => {
      this.ws.once('message', (data) => {
        try {
          const payload: ResponsePayload = JSON.parse(data.toString());
          if (payload.error) {
            reject(new Error(payload.error));
          } else {
            resolve(new Response(payload));
          }
        } catch (e) {
          log(e);
          reject(e);
        }
      });

      this.ws.send(JSON.stringify(request));
    });
  }

  public async discard(): Promise<Response> {
    await this.waitUntilConnected();

    log('discarding');

    this.ws.close();
    clearInterval(this.pingTask);
    return Promise.resolve(new Response({}));
  }

  private async waitUntilConnected(): Promise<void> {
    let connected = await this.isConnected();
    while (!connected) {
      await sleep(5);
      connected = await this.isConnected();
    }
  }

  private async isConnected(): Promise<boolean> {
    const observable = this.connectedSubject.pipe(take(1));

    return observable.toPromise();
  }
}
