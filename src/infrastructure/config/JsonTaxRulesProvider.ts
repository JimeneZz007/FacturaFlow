import co from "../../../config/tax-rules/CO.json";
import mx from "../../../config/tax-rules/MX.json";
import cl from "../../../config/tax-rules/CL.json";
import { TaxRules, TaxRulesProvider } from "../../domain/TaxRules";

const rulesByCountry: Record<string, TaxRules> = {
  CO: co,
  MX: mx,
  CL: cl
};

export class JsonTaxRulesProvider implements TaxRulesProvider {
  getRules(country: string): TaxRules {
    const rules = rulesByCountry[country.toUpperCase()];
    if (!rules) {
      throw new Error(`Unsupported country: ${country}`);
    }
    return rules;
  }
}
