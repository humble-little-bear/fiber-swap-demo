export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
  price?: number;
}
