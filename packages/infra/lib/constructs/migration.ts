import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface MigrationProps {
  vpc: ec2.Vpc;
  databaseProxy: rds.DatabaseProxy;
  databaseSecret: secretsmanager.ISecret;
}

export class MigrationConstruct extends Construct {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: MigrationProps) {
    super(scope, id);

    this.function = new nodejs.NodejsFunction(this, 'Function', {
      functionName: 'HomeThrive-MigrationLambda',
      entry: path.join(__dirname, '../../../../packages/db/src/lambda-migrate.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 512,
      timeout: cdk.Duration.minutes(5),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      environment: {
        NODE_ENV: 'production',
        DATABASE_PROXY_ENDPOINT: props.databaseProxy.endpoint,
        DATABASE_SECRET_ARN: props.databaseSecret.secretArn,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'],
        // Include migrations folder in the bundle
        commandHooks: {
          beforeBundling(_inputDir: string, _outputDir: string): string[] {
            return [];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [
              `cp -r ${inputDir}/packages/db/migrations ${outputDir}/migrations`,
            ];
          },
          beforeInstall(): string[] {
            return [];
          },
        },
      },
    });

    // Grant Lambda permission to read database secret
    props.databaseSecret.grantRead(this.function);

    // Output the function name for the deploy script
    new cdk.CfnOutput(this, 'FunctionName', {
      value: this.function.functionName,
      exportName: 'HomeThrive-MigrationLambda',
    });
  }
}
