import * as cdk from "aws-cdk-lib";
import { FacturaFlowStack } from "./facturaflow-stack";

const app = new cdk.App();

new FacturaFlowStack(app, "FacturaFlowStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
