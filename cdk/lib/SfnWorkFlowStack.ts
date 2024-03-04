import {
  Stack, type StackProps, RemovalPolicy,
  type aws_ec2 as ec2,
  aws_iam as iam,
  aws_logs as logs,
  aws_stepfunctions as sfn
} from 'aws-cdk-lib'
import { type Construct } from 'constructs'
import { SfnLambdaInvoke } from './constructs/sfnLambdaInvoke'
import { S3Bucket } from './constructs/s3Bucket'
import { SfnWorkFlowNode } from './constructs/sfnWorkFlowNode'
import { SfnS3PutObject } from './constructs/sfnS3PutObject'
import { NagSuppressions } from 'cdk-nag'

interface CustomProps extends StackProps {
  vpc: ec2.IVpc
}

export class SfnWorkFlowStack extends Stack {
  constructor (scope: Construct, id: string, props: CustomProps) {
    super(scope, id, props)

    // //////////
    // StepFunctionsで使用するコンポーネントの定義

    // 生成した画像とメタデータを保存するS3の定義
    const s3Bucket = new S3Bucket(this, 'S3', {})

    // lambdaを使ったタスクの定義
    // eslint-disable-next-line no-new
    new SfnLambdaInvoke(this, 'SfnLambdaInvoke', {
      vpc: props.vpc,
      s3Bucket
    })

    // S3 PutObject
    // eslint-disable-next-line no-new
    new SfnS3PutObject(this, 'SfnS3PutObject', {
      metadataBucket: s3Bucket.metadataBucket
    })

    // Step Functionsのログ出力の設定
    const logGroup = new logs.LogGroup(this, 'StepFunctionsLogGroup', {
      logGroupName: 'StepFunctionsLogGroup',
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.TWO_WEEKS // 保存期間は運用ポリシーに応じて変更すること
    })

    // StepFunctionsで使用するロールの定義
    const role = new iam.Role(this, 'StepFunctionsRole', {
      roleName: 'StepFunctionsRole',
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      inlinePolicies: {
        iamPass: new iam.PolicyDocument({
          statements: [
            // lambdaの実行権限を付与
            new iam.PolicyStatement({
              actions: [
                'lambda:InvokeFunction'
              ],
              resources: [
                `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:*`
              ]
            }),
            new iam.PolicyStatement({
              actions: [
                'iam:passRole'
              ],
              resources: [
                '*'
              ],
              conditions: {
                StringEquals: {
                  'iam:PassedToService': 'ecs-tasks.amazonaws.com'
                }
              }
            }),
            new iam.PolicyStatement({
              actions: [
                'events:PutTargets',
                'events:PutRule',
                'events:DescribeRule'
              ],
              resources: [
                `arn:aws:events:${Stack.of(this).region}:${Stack.of(this).account}:rule/StepFunctionsGetEventsForECSTaskRule`
              ]
            }),
            new iam.PolicyStatement({
              actions: [
                'states:StartExecution'
              ],
              resources: [
                `arn:aws:states:${Stack.of(this).region}:${Stack.of(this).account}:stateMachine:GenerateImages`
              ]
            })
          ]
        })
      }
    })

    // distributed mapのlistをS3から読み取るための権限
    s3Bucket.unprocessedIdList.grantRead(role)
    // distributed mapのmetadataをS3にputObjectするための権限
    s3Bucket.metadataBucket.grantReadWrite(role)
    // distributed mapの結果を保存するための権限
    s3Bucket.sfnDistributedMapResultBucket.grantWrite(role)

    // ワークフローの定義
    const sfnWorkFlow = new SfnWorkFlowNode(this, 'SfnWorkFlow', {
    })

    // ワークフロー
    // eslint-disable-next-line no-new
    new sfn.StateMachine(this, 'StateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(sfnWorkFlow.firstTask),
      stateMachineName: 'GenerateImages',
      role,
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL
      },
      tracingEnabled: true
    })

    NagSuppressions.addResourceSuppressions(role,
      [
        {
          id: 'AwsPrototyping-IAMNoWildcardPermissions',
          reason: 'iam:passRole need "*" for resources'
        }
      ],
      true
    )
  }
}
