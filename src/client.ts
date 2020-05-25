import { TxnOptions, Txn } from './txn';

const ADDRESS_ROOT = 'ws://localhost';

export class DgraphClient {
  private readonly ports = {
    readOnly: 9001,
    bestEffort: 9002,
    mutated: 9003,
  };

  public newTxn(options: TxnOptions): Txn {
    if (options.readOnly) {
      if (options.bestEffort) {
        return new Txn(`${ADDRESS_ROOT}:${this.ports.bestEffort}`);
      } else {
        return new Txn(`${ADDRESS_ROOT}:${this.ports.readOnly}`);
      }
    } else {
      if (options.bestEffort) {
        throw new Error('cannot have best effort without read only');
      } else {
        return new Txn(`${ADDRESS_ROOT}:${this.ports.mutated}`);
      }
    }
  }
}
