import {
  type StackProps, Duration, Stack,
  type aws_ec2 as ec2,
  aws_iam as iam,
  aws_logs as logs,
  aws_lambda as lambda,
  aws_lambda_nodejs as lambda_nodejs,
  aws_stepfunctions as sfn, aws_stepfunctions_tasks as sfnTasks
} from 'aws-cdk-lib'
import * as fs from 'fs'
import path = require('path')
import { type S3Bucket } from './s3Bucket'
import { Construct } from 'constructs'
import { NagSuppressions } from 'cdk-nag'

interface CustomProps extends StackProps {
  vpc: ec2.IVpc
  s3Bucket: S3Bucket
}

export class SfnLambdaInvoke extends Construct {
  public executionLambdaRole: iam.Role
  public lambdaInvoke: Record<string, sfnTasks.LambdaInvoke>

  constructor (scope: Construct, id: string, props: CustomProps) {
    super(scope, id)

    const subnetIds = props.vpc.privateSubnets.map(subnet => `arn:aws:ec2:${Stack.of(this).region}:${Stack.of(this).account}:subnet/${subnet.subnetId}`)

    interface FunctionDefinitionParam {
      entry: string
      functionName: string
      vpcSubnets: ec2.SubnetSelection
      environment: any
      initialPolicy: iam.PolicyStatement[]
      retry: boolean
      ignoreError: boolean
      reservedConcurrentExecutions: number
    }

    // lambdaの実行ロールを作成
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole',
      {
        roleName: 'lambdaExecutionRole',
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [],
        inlinePolicies: {
          AWSLambdaVPCAccessExecutionRole: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'ec2:CreateNetworkInterface'
                ],
                resources: [
                  ...subnetIds,
                  `arn:aws:ec2:${Stack.of(this).region}:${Stack.of(this).account}:network-interface/*`,
                  `arn:aws:ec2:${Stack.of(this).region}:${Stack.of(this).account}:security-group/*`
                ]
              }),
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'ec2:AssignPrivateIpAddresses',
                  'ec2:UnassignPrivateIpAddresses'
                ],
                resources: [
                  ...subnetIds,
                  `arn:aws:ec2:${Stack.of(this).region}:${Stack.of(this).account}:network-interface/*`
                ],
                conditions: {
                  // 対象のリソースはCDKで作成したVPCのものに限定する
                  'ForAnyValue:StringEquals': {
                    'ec2:VpcId': props.vpc.vpcId
                  }
                }
              }),
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'ec2:DescribeNetworkInterfaces' // '*'のみサポート. https://docs.aws.amazon.com/ja_jp/service-authorization/latest/reference/list_amazonec2.html
                ],
                resources: [
                  '*'
                ]
              }),
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'ec2:DeleteNetworkInterface'
                ],
                resources: [
                  // '*' // 制限を厳しくかけるとリソースの削除時に失敗する可能性あり
                  `arn:aws:ec2:${Stack.of(this).region}:${Stack.of(this).account}:*/*` //  If you don't specify a resource ID for DeleteNetworkInterface in the execution role, your function may not be able to access the VPC. Either specify a unique resource ID, or include all resource IDs, for example, "Resource": "arn:aws:ec2:us-west-2:123456789012:*/*".
                ]
              }),
              // bedrock invoke
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                  'bedrock:InvokeModel'
                ],
                resources: [
                  '*'
                ]
              })
            ]
          })
        }
      }
    )

    // const paramsAndSecrets = lambda.ParamsAndSecretsLayerVersion.fromVersion(
    //   lambda.ParamsAndSecretsVersions.V1_0_103,
    //   {
    //     cacheSize: 500,
    //     logLevel: lambda.ParamsAndSecretsLogLevel.DEBUG
    //   }
    // )

    const lambdaDefaultParams = {
      architecture: lambda.Architecture.X86_64,
      timeout: Duration.minutes(15),
      role: lambdaExecutionRole,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_MONTH,
      memorySize: 512,
      vpc: props.vpc
    }

    const lambdaDefaultEnvironment = {
    }

    // nodejs用のlambdaInvoke作成
    const createLambdaNodejsInvoke = (functionDefinitionPath: string): sfnTasks.LambdaInvoke => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const functionDefinitionFile = require(functionDefinitionPath)
      const functionDefinitionParam: FunctionDefinitionParam = functionDefinitionFile.functionDefinitionParam as FunctionDefinitionParam

      const func = new lambda_nodejs.NodejsFunction(this, `Lambda-${functionDefinitionParam.functionName}`, {
        runtime: lambda.Runtime.NODEJS_LATEST,
        handler: 'handler',
        functionName: `${functionDefinitionParam.functionName}`,
        entry: `${functionDefinitionParam.entry}`,
        // paramsAndSecrets,
        vpcSubnets: functionDefinitionParam.vpcSubnets,
        environment: {
          ...lambdaDefaultEnvironment,
          ...functionDefinitionParam.environment
        },
        initialPolicy: functionDefinitionParam.initialPolicy,
        ...lambdaDefaultParams
      })

      const lambdaInvoke = new sfnTasks.LambdaInvoke(this, `LambdaInvoke-${functionDefinitionParam.functionName}`, {
        stateName: functionDefinitionParam.functionName,
        lambdaFunction: func,
        inputPath: sfn.JsonPath.stringAt('$'),
        resultPath: sfn.JsonPath.stringAt('$'),
        outputPath: sfn.JsonPath.stringAt('$')
      })

      // // エラーでも処理を継続するオプションが有効な場合、エラーを無視して処理を継続させる
      // if (functionDefinitionParam.ignoreError) {
      //   continueOnError(lambdaInvoke, functionDefinitionParam.functionName)
      // } else {
      //   failedOnError(lambdaInvoke, functionDefinitionParam.functionName)
      // }

      // // リトライフラグが有効な場合、リトライの設定をする. sfnのCustomStateではこの機能は使用しない
      // if (functionDefinitionParam.retry) addRetry(lambdaInvoke, 3, Duration.seconds(5), 2)

      // grant write policy to specific resources of cloudwach logs.
      lambdaExecutionRole.addToPolicy(
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents'
          ],
          resources: [
            `arn:aws:logs:${Stack.of(this).region}:${Stack.of(this).account}:log-group:/aws/lambda/${functionDefinitionParam.functionName}:*`
          ]
        })
      )

      // S3への書き込み権限の付与
      props.s3Bucket.imageBucket.grantPut(lambdaExecutionRole)
      // props.s3Bucket.metadataBucket.grantPut(lambdaExecutionRole)
      props.s3Bucket.inputImageBucket.grantRead(lambdaExecutionRole)
      return lambdaInvoke
    }

    // // エラーでも処理を継続するオプション
    // const continueOnError = (func: sfnTasks.LambdaInvoke, name: string): void => {
    //   // エラーの場合に実施する処理
    //   func.addCatch(
    //     new sfn.Pass(this, `catchSometingFailed`),
    //     {
    //       errors: ['States.ALL']
    //     }
    //   )
    // }

    // // リトライ処理の実装部分
    // const addRetry = (func: sfnTasks.LambdaInvoke, maxAttempts: number = 3, interval: Duration = Duration.seconds(5), backoffRate: number = 2.0): void => {
    //   func.addRetry({
    //     interval,
    //     maxAttempts,
    //     backoffRate
    //   })
    // }

    // /////
    // lambda/nodejsフォルダに含まれるファイル名をすべて取得
    const nodejsFunctionDefinitionFileNames = fs.readdirSync(path.resolve(__dirname, '../../lambda/nodejs/functionDefinitions'))
    // nodejsFileNamesをループする
    nodejsFunctionDefinitionFileNames.forEach((functionDefinitionFilename) => {
      // 拡張子なしのファイル名
      const filenameWithoutType = functionDefinitionFilename.split('.')[0]
      // lambdaInvokeの生成
      const lambdaInvoke = createLambdaNodejsInvoke(`../../lambda/nodejs/functionDefinitions/${functionDefinitionFilename}`)

      // ファイル名をキーに、配列にlambdaInvokeを保存
      this.lambdaInvoke = {
        ...this.lambdaInvoke,
        [filenameWithoutType]: lambdaInvoke
      }
    })

    NagSuppressions.addResourceSuppressions(lambdaExecutionRole,
      [
        {
          id: 'AwsPrototyping-IAMNoWildcardPermissions',
          reason: `lambda execution role needs arn:aws:ec2:${Stack.of(this).region}:${Stack.of(this).account}:*/* for DeleteNetworkInterface`
        }
      ],
      true
    )
  }
}
