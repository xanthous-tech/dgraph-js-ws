import { TxnOptions, Txn } from './txn';

export class DgraphClient {
  constructor(private readonly addressRoot: string) {}

  public newTxn(options: TxnOptions): Txn {
    if (options.readOnly) {
      if (options.bestEffort) {
        return new Txn(`${this.addressRoot}/txn?read_only=true&best_effort=true`);
      } else {
        return new Txn(`${this.addressRoot}/txn?read_only=true`);
      }
    } else {
      if (options.bestEffort) {
        throw new Error('cannot have best effort without read only');
      } else {
        return new Txn(`${this.addressRoot}/txn`);
      }
    }
  }
}
