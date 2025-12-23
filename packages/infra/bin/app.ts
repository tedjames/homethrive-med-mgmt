#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { HomeThiveStack } from '../lib/homethrive-stack.js';

const app = new cdk.App();

// Stack name is configurable via STACK_NAME env var
// Default: homethrive-test-ted (for take-home submission identification)
const stackName = process.env.STACK_NAME || 'homethrive-test-ted';

new HomeThiveStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.AWS_REGION || 'us-east-1',
  },
  stackName,
});
