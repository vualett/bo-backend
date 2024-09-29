export interface Products {
  category: string;
  products: Array<ProductsOfProducts>;
  password: string;
  name: string;
  maxAmount: number;
}

export interface ProductsOfProducts {
  amount: number;
  options: Array<ProductsOptions>;
}

export interface ProductsOptions {
  name: string;
  numberOfPayments: string;
  termsOfPayment: string;
  fees: Array<number>;
}
