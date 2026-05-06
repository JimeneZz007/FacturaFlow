export interface TaxRules {
  country: string;
  currency: string;
  allowedTaxRates: number[];
  defaultTaxRate: number;
}

export interface TaxRulesProvider {
  getRules(country: string): TaxRules;
}
