import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ApiProps {
  vpc: ec2.Vpc;
  databaseProxy: rds.DatabaseProxy;
  databaseSecret: secretsmanager.ISecret;
  clerkSecret: secretsmanager.ISecret;
  /** WAF WebACL ARN to associate with the API */
  webAclArn?: string;
}

export class ApiConstruct extends Construct {
  public readonly function: lambda.Function;
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    // Lambda function in VPC private subnet (reaches internet via NAT Gateway)
    // Per ADR-003: Lambda in VPC for RDS Proxy access, NAT for Clerk auth
    this.function = new nodejs.NodejsFunction(this, 'Function', {
      entry: path.join(__dirname, '../../../../apps/api/src/lambda.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      environment: {
        NODE_ENV: 'production',
        DATABASE_PROXY_ENDPOINT: props.databaseProxy.endpoint,
        DATABASE_SECRET_ARN: props.databaseSecret.secretArn,
        CLERK_SECRET_ARN: props.clerkSecret.secretArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // Grant Lambda access to secrets (password auth, not IAM auth per ADR-003)
    props.databaseSecret.grantRead(this.function);
    props.clerkSecret.grantRead(this.function);

    // REST API Gateway (switched from HTTP API for WAF support - see ADR-006)
    this.api = new apigateway.RestApi(this, 'RestApi', {
      restApiName: 'HomeThrive-API',
      description: 'HomeThrive Medication Manager API',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 50, // Requests per second
        throttlingBurstLimit: 100, // Max concurrent requests
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      },
    });

    // Lambda integration - proxy all requests to Fastify
    const lambdaIntegration = new apigateway.LambdaIntegration(this.function, {
      proxy: true,
    });

    // Root path
    this.api.root.addMethod('ANY', lambdaIntegration);

    // Proxy resource for all nested paths
    const proxyResource = this.api.root.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
    });

    // Associate WAF with API Gateway if provided
    if (props.webAclArn) {
      new wafv2.CfnWebACLAssociation(this, 'WafAssociation', {
        resourceArn: this.api.deploymentStage.stageArn,
        webAclArn: props.webAclArn,
      });
    }

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      exportName: 'HomeThrive-ApiUrl',
    });
  }
}
