import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface MonitoringProps {
  lambdaFunction: lambda.Function;
  alertEmail?: string;
}

export class MonitoringConstruct extends Construct {
  constructor(scope: Construct, id: string, props: MonitoringProps) {
    super(scope, id);

    // SNS topic for alerts (only if email provided)
    let alarmTopic: sns.Topic | undefined;
    if (props.alertEmail) {
      alarmTopic = new sns.Topic(this, 'AlarmTopic', {
        topicName: 'HomeThrive-Alarms',
      });
      alarmTopic.addSubscription(
        new subscriptions.EmailSubscription(props.alertEmail)
      );
    }

    // Lambda error alarm
    const errorAlarm = new cloudwatch.Alarm(this, 'LambdaErrors', {
      alarmName: 'HomeThrive-API-Errors',
      metric: props.lambdaFunction.metricErrors({
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    // Lambda duration alarm (approaching timeout)
    const durationAlarm = new cloudwatch.Alarm(this, 'LambdaDuration', {
      alarmName: 'HomeThrive-API-Duration',
      metric: props.lambdaFunction.metricDuration({
        period: cdk.Duration.minutes(5),
        statistic: 'p99',
      }),
      threshold: 25000, // 25 seconds (timeout is 30s)
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    });

    if (alarmTopic) {
      errorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
      durationAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
    }
  }
}
