import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface WafProps {
  /** WAF scope - CLOUDFRONT for CloudFront distributions, REGIONAL for API Gateway */
  scope: 'CLOUDFRONT' | 'REGIONAL';
  /** Name suffix to differentiate multiple WAFs */
  nameSuffix: string;
  /** Rate limit: requests per 5 minutes per IP (default: 2000) */
  rateLimit?: number;
}

/**
 * Creates a WAF WebACL with rate limiting and AWS managed rule sets.
 *
 * Protection includes:
 * - Rate limiting (default: 2000 requests per 5 minutes per IP)
 * - AWS Managed Rules - Common Rule Set (SQL injection, XSS, etc.)
 * - AWS Managed Rules - Known Bad Inputs (Log4j, etc.)
 * - AWS Managed Rules - IP Reputation List (known malicious IPs)
 */
export class WafConstruct extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafProps) {
    super(scope, id);

    const rateLimit = props.rateLimit ?? 2000;
    const name = `HomeThrive-WAF-${props.nameSuffix}`;
    const metricPrefix = `HomeThrive${props.nameSuffix}`;

    this.webAcl = new wafv2.CfnWebACL(this, 'WebACL', {
      name,
      scope: props.scope,
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${metricPrefix}WAF`,
      },
      rules: [
        // Rate limiting - block IPs exceeding threshold
        {
          name: 'RateLimitRule',
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: rateLimit,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${metricPrefix}RateLimit`,
          },
        },
        // AWS Managed - Common Rule Set (SQL injection, XSS, bad inputs)
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${metricPrefix}CommonRules`,
          },
        },
        // AWS Managed - Known Bad Inputs (Log4j, etc.)
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${metricPrefix}KnownBadInputs`,
          },
        },
        // AWS Managed - IP Reputation (known malicious IPs)
        {
          name: 'AWSManagedRulesAmazonIpReputationList',
          priority: 4,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAmazonIpReputationList',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${metricPrefix}IpReputation`,
          },
        },
      ],
    });
  }
}
