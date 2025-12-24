import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { DatabaseConstruct } from './constructs/database.js';
import { ApiConstruct } from './constructs/api.js';
import { MonitoringConstruct } from './constructs/monitoring.js';
import { FrontendConstruct } from './constructs/frontend.js';
import { MigrationConstruct } from './constructs/migration.js';
import { WafConstruct } from './constructs/waf.js';

export class HomeThiveStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // WAF for CloudFront (must be CLOUDFRONT scope for CloudFront distributions)
    // Note: CloudFront WAFs must be created in us-east-1, but CDK handles this
    const cloudfrontWaf = new WafConstruct(this, 'CloudFrontWAF', {
      scope: 'CLOUDFRONT',
      nameSuffix: 'CloudFront',
    });

    // WAF for API Gateway (REGIONAL scope)
    const apiWaf = new WafConstruct(this, 'ApiWAF', {
      scope: 'REGIONAL',
      nameSuffix: 'API',
    });

    // Database (VPC + RDS + Proxy + Secrets)
    const database = new DatabaseConstruct(this, 'Database');

    // Migration Lambda (runs Drizzle migrations)
    const migration = new MigrationConstruct(this, 'Migration', {
      vpc: database.vpc,
      databaseProxy: database.proxy,
      databaseSecret: database.secret,
    });

    // Allow Migration Lambda to connect to RDS Proxy
    database.proxy.connections.allowFrom(
      migration.function,
      ec2.Port.tcp(5432),
      'Allow Migration Lambda to connect to RDS Proxy'
    );

    // API (Lambda in VPC + REST API Gateway with WAF)
    // Per ADR-003: Lambda in private subnet with NAT for Clerk auth
    // Per ADR-006: Switched to REST API for WAF support
    const api = new ApiConstruct(this, 'API', {
      vpc: database.vpc,
      databaseProxy: database.proxy,
      databaseSecret: database.secret,
      clerkSecret: database.clerkSecret,
      clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      webAclArn: apiWaf.webAcl.attrArn,
    });

    // Allow Lambda to connect to RDS Proxy
    database.proxy.connections.allowFrom(
      api.function,
      ec2.Port.tcp(5432),
      'Allow Lambda to connect to RDS Proxy'
    );

    // Monitoring
    new MonitoringConstruct(this, 'Monitoring', {
      lambdaFunction: api.function,
      alertEmail: process.env.ALERT_EMAIL,
    });

    // Frontend (S3 + CloudFront with WAF for SPA hosting)
    // Per ADR-006: WAF protection on CloudFront
    new FrontendConstruct(this, 'Frontend', {
      webAclArn: cloudfrontWaf.webAcl.attrArn,
    });

    // Stack tags - uses stack name for easy identification
    // Configurable via STACK_NAME env var (default: homethrive-test-ted)
    cdk.Tags.of(this).add('Project', this.stackName);
  }
}
