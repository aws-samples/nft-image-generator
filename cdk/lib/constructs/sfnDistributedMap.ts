import {
  type StackProps, Stack,
  aws_stepfunctions as sfn
} from 'aws-cdk-lib'

import { Construct } from 'constructs'

interface CustomProps extends StackProps {
}

export class SfnDistributedMap extends Construct {
  public distributedMap: sfn.CustomState

  constructor (scope: Construct, id: string, props: CustomProps) {
    super(scope, id)

    const retry = {
      Retry: [
        {
          ErrorEquals: [
            'Lambda.ClientExecutionTimeoutException',
            'Lambda.ServiceException',
            'Lambda.AWSLambdaException',
            'Lambda.SdkClientException'
          ],
          IntervalSeconds: 2,
          MaxAttempts: 6,
          BackoffRate: 2
        },
        {
          ErrorEquals: [
            'States.ALL'
          ],
          IntervalSeconds: 5,
          MaxAttempts: 3,
          BackoffRate: 2
        }
      ]
    }

    this.distributedMap = new sfn.CustomState(this, 'distributed map state', {
      stateJson: {
        Type: 'Map',
        ItemProcessor: {
          ProcessorConfig: {
            Mode: 'DISTRIBUTED',
            ExecutionType: 'STANDARD'
          },
          StartAt: 'generateImage',
          States: {
            generateImage: {
              ...retry,
              Type: 'Task',
              InputPath: '$',
              OutputPath: '$',
              ResultPath: '$',
              Resource: 'arn:aws:states:::lambda:invoke',
              Parameters: {
                FunctionName: `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:generateImage`,
                'Payload.$': '$'
              },
              End: true
            }
          }
        }
      }
    })
  }
}
