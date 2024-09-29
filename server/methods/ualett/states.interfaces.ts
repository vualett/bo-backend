export interface States {
  _id: string;
  states: Array<StatesCapAmount>;
}

export interface StatesCapAmount {
  name: string;
  abbreviaton: string;
  capAmount: number;
}
