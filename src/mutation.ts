export interface MutationPayload {
  setJson?: string;
  deleteJson?: string;
  setNquads?: string;
  delNquads?: string;
}

export class Mutation {
  private payload: MutationPayload = {};

  public getPayload(): MutationPayload {
    return this.payload;
  }

  public clearSetList(): void {
    this.payload.setJson = undefined;
    this.payload.setNquads = undefined;
  }

  public setSetJson(json: any): void {
    this.payload.setJson = JSON.stringify(json);
  }

  public setDeleteJson(json: any): void {
    this.payload.deleteJson = JSON.stringify(json);
  }

  public setSetNquads(nquads: string): void {
    this.payload.setNquads = nquads;
  }

  public setDelNquads(nquads: string): void {
    this.payload.delNquads = nquads;
  }
}
