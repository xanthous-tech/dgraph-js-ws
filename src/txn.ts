import debug from 'debug';
import WebSocket from 'ws';
import { Subject, ReplaySubject } from 'rxjs';
import { take, map, tap, filter } from 'rxjs/operators';
import uniqid from 'uniqid';

import { Mutation, MutationPayload } from './mutation';
import { Response, ResponsePayload } from './response';

const log = debug('dgraph-js-ws:txn');

async function sleep(timeout: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, timeout));
}

export interface TxnOptions {
  readOnly?: boolean;
  bestEffort?: boolean;
}

interface Vars {
  [key: string]: string | string[] | undefined;
}

interface QueryPayload {
  q: string;
  vars?: Vars;
}

interface RequestPayload {
  id: string;
  query?: QueryPayload;
  mutate?: MutationPayload;
  commit?: boolean;
}

export class Txn {
  private ws: WebSocket;
  private connectedSubject: ReplaySubject<boolean>;
  private messageSubject: Subject<WebSocket.Data>;

  constructor(private readonly address: string) {
    this.connectedSubject = new ReplaySubject(1);
    this.connectedSubject.next(false);

    this.messageSubject = new Subject();

    this.init();
  }

  public async query(q: string): Promise<Response> {
    return this.queryWithVars(q);
  }

  public async queryWithVars(q: string, vars?: Vars): Promise<Response> {
    await this.waitUntilConnected();

    const request: RequestPayload = {
      id: uniqid(),
      query: {
        q,
        vars,
      },
    };

    log(JSON.stringify(request));

    return this.sendRequest(request);
  }

  public async mutate(mu: Mutation): Promise<Response> {
    await this.waitUntilConnected();

    const request: RequestPayload = {
      id: uniqid(),
      mutate: mu.getPayload(),
    };

    log(JSON.stringify(request));

    return this.sendRequest(request);
  }

  public async upsertWithVars(q: string, mu: Mutation, vars?: Vars): Promise<Response> {
    await this.waitUntilConnected();

    const request: RequestPayload = {
      id: uniqid(),
      query: {
        q,
        vars,
      },
      mutate: mu.getPayload(),
    };

    log(JSON.stringify(request));

    return this.sendRequest(request);
  }

  public async commit(): Promise<Response> {
    await this.waitUntilConnected();

    const request: RequestPayload = {
      id: uniqid(),
      commit: true,
    };

    log(JSON.stringify(request));

    return this.sendRequest(request);
  }

  public async discard(): Promise<Response> {
    await this.waitUntilConnected();

    log('discarding');

    this.ws.close();
    return Promise.resolve(new Response({}));
  }

  private sendRequest(request: RequestPayload): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.messageSubject
        .pipe(
          map((data) => data.toString()),
          tap((dataString) => log(`{"requestId": "${request.id}", "response": ${dataString}}`)),
          map((dataString) => JSON.parse(dataString) as ResponsePayload),
          filter((response) => response.id === request.id),
          take(1),
        )
        .subscribe(
          (payload) => {
            if (payload.error) {
              reject(new Error(payload.error));
            } else {
              resolve(new Response(payload));
            }
          },
          (e) => {
            log(e);
            reject(e);
          },
        );

      this.ws.send(JSON.stringify(request));
    });
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

  private init(): void {
    this.ws = new WebSocket(this.address);

    this.ws.on('open', () => {
      log(`connected to ${this.address}`);
      this.connectedSubject.next(true);
    });

    this.ws.on('close', () => {
      log(`disconnected`);
      this.connectedSubject.next(false);
      this.cleanup();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      this.messageSubject.next(data);
    });

    this.ws.on('pong', () => {
      log('got heartbeat');
    });

    this.ws.on('error', (err) => {
      log(err);
    });
  }

  private cleanup(): void {
    log('cleanup');
    this.ws.removeAllListeners();
  }
}
