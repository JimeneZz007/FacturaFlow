import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as eventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export class FacturaFlowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const documentsBucket = new s3.Bucket(this, "DocumentsBucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const jobsTable = new dynamodb.Table(this, "JobsTable", {
      partitionKey: { name: "trackingId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const invoicesTable = new dynamodb.Table(this, "InvoicesTable", {
      partitionKey: { name: "invoiceId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const auditLogTable = new dynamodb.Table(this, "AuditLogTable", {
      partitionKey: { name: "auditId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });
    auditLogTable.addGlobalSecondaryIndex({
      indexName: "TrackingIdIndex",
      partitionKey: { name: "trackingId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL
    });

    const erpRateLimitTable = new dynamodb.Table(this, "ErpRateLimitTable", {
      partitionKey: { name: "windowId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "expiresAt",
      removalPolicy: RemovalPolicy.DESTROY
    });

    const processingDlq = new sqs.Queue(this, "ProcessingDlq", {
      retentionPeriod: Duration.days(14)
    });
    const processingQueue = new sqs.Queue(this, "ProcessingQueue", {
      visibilityTimeout: Duration.seconds(90),
      deadLetterQueue: {
        queue: processingDlq,
        maxReceiveCount: 3
      }
    });

    const erpDlq = new sqs.Queue(this, "ErpDlq", {
      retentionPeriod: Duration.days(14)
    });
    const erpQueue = new sqs.Queue(this, "ErpQueue", {
      visibilityTimeout: Duration.seconds(60),
      deadLetterQueue: {
        queue: erpDlq,
        maxReceiveCount: 3
      }
    });

    const sharedEnvironment = {
      JOBS_TABLE_NAME: jobsTable.tableName,
      INVOICES_TABLE_NAME: invoicesTable.tableName,
      AUDIT_LOG_TABLE_NAME: auditLogTable.tableName,
      ERP_RATE_LIMIT_TABLE_NAME: erpRateLimitTable.tableName,
      DOCUMENT_BUCKET_NAME: documentsBucket.bucketName,
      PROCESSING_QUEUE_URL: processingQueue.queueUrl,
      ERP_QUEUE_URL: erpQueue.queueUrl
    };

    const aiMock = this.nodeFunction("AiMock", "src/infrastructure/handlers/aiMockHandler.ts", {
      timeout: Duration.seconds(10),
      environment: sharedEnvironment
    });

    const erpMock = this.nodeFunction("ErpMock", "src/infrastructure/handlers/erpMockHandler.ts", {
      timeout: Duration.seconds(10),
      environment: sharedEnvironment
    });

    const ingest = this.nodeFunction("Ingest", "src/infrastructure/handlers/ingestHandler.ts", {
      timeout: Duration.seconds(5),
      environment: sharedEnvironment
    });

    const jobStatus = this.nodeFunction(
      "JobStatus",
      "src/infrastructure/handlers/jobStatusHandler.ts",
      {
        timeout: Duration.seconds(5),
        environment: sharedEnvironment
      }
    );

    const processor = this.nodeFunction("Processor", "src/infrastructure/handlers/processorHandler.ts", {
      timeout: Duration.seconds(60),
      environment: {
        ...sharedEnvironment,
        AI_MOCK_FUNCTION_NAME: aiMock.functionName
      }
    });

    const erpDispatcher = this.nodeFunction(
      "ErpDispatcher",
      "src/infrastructure/handlers/erpDispatcherHandler.ts",
      {
        timeout: Duration.seconds(30),
        environment: {
          ...sharedEnvironment,
          ERP_MOCK_FUNCTION_NAME: erpMock.functionName
        }
      }
    );

    documentsBucket.grantPut(ingest);
    jobsTable.grantWriteData(ingest);
    jobsTable.grantWriteData(processor);
    jobsTable.grantReadData(jobStatus);
    invoicesTable.grantWriteData(processor);
    invoicesTable.grantReadData(jobStatus);
    auditLogTable.grantWriteData(ingest);
    auditLogTable.grantWriteData(processor);
    auditLogTable.grantWriteData(erpDispatcher);
    auditLogTable.grantReadData(jobStatus);
    erpRateLimitTable.grantWriteData(erpMock);
    processingQueue.grantSendMessages(ingest);
    processingQueue.grantConsumeMessages(processor);
    erpQueue.grantSendMessages(processor);
    erpQueue.grantConsumeMessages(erpDispatcher);
    aiMock.grantInvoke(processor);
    erpMock.grantInvoke(erpDispatcher);

    processor.addEventSource(
      new eventSources.SqsEventSource(processingQueue, {
        batchSize: 1,
        maxConcurrency: 10,
        reportBatchItemFailures: true
      })
    );

    erpDispatcher.addEventSource(
      new eventSources.SqsEventSource(erpQueue, {
        batchSize: 5,
        reportBatchItemFailures: true
      })
    );

    const api = new apigatewayv2.HttpApi(this, "FacturaFlowHttpApi", {
      apiName: "facturaflow-mvp",
      corsPreflight: {
        allowHeaders: ["content-type"],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.OPTIONS
        ],
        allowOrigins: ["*"]
      }
    });

    api.addRoutes({
      path: "/uploads",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration("IngestIntegration", ingest)
    });

    api.addRoutes({
      path: "/jobs/{trackingId}",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration("JobStatusIntegration", jobStatus)
    });

    api.addRoutes({
      path: "/ai-mock",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration("AiMockIntegration", aiMock)
    });

    api.addRoutes({
      path: "/erp-mock",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration("ErpMockIntegration", erpMock)
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url ?? "unknown",
      description: "Public HTTP API URL for FacturaFlow MVP"
    });

    const webBucket = new s3.Bucket(this, "WebBucket", {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false
      }),
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    new s3deploy.BucketDeployment(this, "WebDeployment", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "..", "apps", "web", "dist"))],
      destinationBucket: webBucket
    });

    new cdk.CfnOutput(this, "WebUrl", {
      value: webBucket.bucketWebsiteUrl,
      description: "Public S3 static website URL for FacturaFlow web MVP"
    });
  }

  private nodeFunction(
    id: string,
    entry: string,
    props: Omit<lambdaNodejs.NodejsFunctionProps, "entry" | "runtime" | "handler" | "logGroup">
  ): lambdaNodejs.NodejsFunction {
    const logGroup = new logs.LogGroup(this, `${id}LogGroup`, {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY
    });

    return new lambdaNodejs.NodejsFunction(this, id, {
      entry: path.join(__dirname, "..", entry),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      memorySize: 256,
      logGroup,
      bundling: {
        minify: true,
        sourceMap: true
      },
      ...props
    });
  }
}
