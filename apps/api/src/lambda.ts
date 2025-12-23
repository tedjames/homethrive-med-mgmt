/**
 * AWS Lambda handler entry point.
 * Per ADR-003: Config is initialized at cold start to fetch secrets from Secrets Manager.
 */

import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import awsLambdaFastify from '@fastify/aws-lambda';

import { buildApp } from './app.js';
import { getConfig } from './config.js';

type LambdaHandler = (event: APIGatewayProxyEventV2, context: Context) => Promise<unknown>;

let cachedHandler: LambdaHandler | null = null;

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<unknown> => {
  if (!cachedHandler) {
    // Initialize config first (fetches secrets from Secrets Manager)
    await getConfig();

    const app = buildApp({ logger: false });
    // Create Lambda handler BEFORE calling ready() - awsLambdaFastify adds decorators
    cachedHandler = awsLambdaFastify(app);
    await app.ready();
  }

  return cachedHandler(event, context);
};
