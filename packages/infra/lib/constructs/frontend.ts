import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface FrontendProps {
  /** WAF WebACL ARN to associate with CloudFront (must be CLOUDFRONT scope) */
  webAclArn?: string;
}

/**
 * Frontend hosting construct for the HomeThrive SPA
 * Creates S3 bucket + CloudFront distribution for static hosting
 */
export class FrontendConstruct extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly distributionUrl: string;

  constructor(scope: Construct, id: string, props?: FrontendProps) {
    super(scope, id);

    // S3 bucket for static assets (private, CloudFront access only)
    this.bucket = new s3.Bucket(this, 'Bucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev; use RETAIN for prod
      autoDeleteObjects: true, // For dev; remove for prod
    });

    // Origin Access Control for CloudFront -> S3
    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
      originAccessControlName: 'HomeThrive-Frontend-OAC',
      signing: cloudfront.Signing.SIGV4_ALWAYS,
    });

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'HomeThrive Frontend',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      // Default root object for SPA
      defaultRootObject: '_shell.html',
      // SPA routing: serve _shell.html for all 404s (client-side routing)
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/_shell.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/_shell.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
      // Price class - North America and Europe only for cost savings
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      // Enable HTTP/2 and HTTP/3
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      // WAF protection (see ADR-006)
      webAclId: props?.webAclArn,
    });

    // Store the distribution URL
    this.distributionUrl = `https://${this.distribution.distributionDomainName}`;

    // Grant CloudFront access to S3 bucket via bucket policy
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'AllowCloudFrontServicePrincipal',
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        actions: ['s3:GetObject'],
        resources: [this.bucket.arnForObjects('*')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${cdk.Stack.of(this).account}:distribution/${this.distribution.distributionId}`,
          },
        },
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      exportName: 'HomeThrive-FrontendBucket',
      description: 'S3 bucket for frontend assets',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      exportName: 'HomeThrive-DistributionId',
      description: 'CloudFront distribution ID',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: this.distributionUrl,
      exportName: 'HomeThrive-FrontendUrl',
      description: 'CloudFront distribution URL for the frontend',
    });
  }
}
