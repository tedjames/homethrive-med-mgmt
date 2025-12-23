import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class DatabaseConstruct extends Construct {
  public readonly vpc: ec2.Vpc;
  public readonly proxy: rds.DatabaseProxy;
  public readonly secret: secretsmanager.ISecret;
  public readonly clerkSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // VPC with NAT Gateway for Lambda internet access (Clerk auth)
    // Per ADR-003: Lambda in private subnet, RDS in isolated subnet
    this.vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      natGateways: 1, // NAT Gateway for Lambda outbound internet
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, // Lambda goes here
        },
        {
          cidrMask: 24,
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED, // RDS goes here
        },
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC, // NAT Gateway goes here
        },
      ],
    });

    // Database credentials
    this.secret = new secretsmanager.Secret(this, 'DBSecret', {
      secretName: 'homethrive/db',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // Security group for RDS
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS Postgres',
    });

    // RDS Postgres instance in isolated subnet
    const instance = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.secret),
      databaseName: 'homethrive',
      allocatedStorage: 20,
      maxAllocatedStorage: 50,
      backupRetention: cdk.Duration.days(7),
      // Deletion protection disabled for easy teardown of this demo app.
      // For production, set deletionProtection: true to prevent accidental data loss.
      deletionProtection: false,
      // Skip final snapshot on deletion - for demo app only.
      // For production, remove this to get automatic final snapshots.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      multiAz: false, // Cost optimization, enable for HA later
      storageEncrypted: true,
      publiclyAccessible: false,
    });

    // RDS Proxy in private subnet (Lambda connects from same private subnet)
    // Per ADR-003: Password auth via Secrets Manager, not IAM auth
    this.proxy = new rds.DatabaseProxy(this, 'Proxy', {
      proxyTarget: rds.ProxyTarget.fromInstance(instance),
      secrets: [this.secret],
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      requireTLS: true,
      dbProxyName: 'homethrive',
    });

    // Allow proxy to connect to RDS
    instance.connections.allowFrom(
      this.proxy,
      ec2.Port.tcp(5432),
      'Allow RDS Proxy to connect'
    );

    // Clerk secrets (populate manually in AWS console with real keys)
    // Per ADR-003: Clerk keys stored in Secrets Manager, fetched at Lambda cold start
    this.clerkSecret = new secretsmanager.Secret(this, 'ClerkSecret', {
      secretName: 'homethrive/clerk',
      description: 'Clerk authentication keys - update manually with real values',
    });

    // Outputs
    new cdk.CfnOutput(this, 'ProxyEndpoint', {
      value: this.proxy.endpoint,
      exportName: 'HomeThrive-DBProxyEndpoint',
    });

    new cdk.CfnOutput(this, 'SecretArn', {
      value: this.secret.secretArn,
      exportName: 'HomeThrive-DBSecretArn',
    });

    new cdk.CfnOutput(this, 'ClerkSecretArn', {
      value: this.clerkSecret.secretArn,
      exportName: 'HomeThrive-ClerkSecretArn',
    });
  }
}
