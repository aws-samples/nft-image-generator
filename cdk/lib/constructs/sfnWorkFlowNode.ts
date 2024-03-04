import {
  type StackProps,
  aws_stepfunctions as sfn,
  type aws_stepfunctions_tasks as sfnTasks
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { SfnDistributedMap } from './sfnDistributedMap'

interface CustomProps extends StackProps {
}

export class SfnWorkFlowNode extends Construct {
  public firstTask: sfnTasks.LambdaInvoke | sfnTasks.EcsRunTask | sfn.Parallel | sfn.CustomState

  constructor (scope: Construct, id: string, props: CustomProps) {
    super(scope, id)

    // StepFunctionのフローを定義
    const success = new sfn.Succeed(this, 'success')

    // SfnのDistributed Map. 最大1万並列で実行可能なタスクを定義。
    const sfnDistributedMap = new SfnDistributedMap(this, 'SfnDistributedMap', {})
    sfnDistributedMap.distributedMap.next(success)

    // ワークフローの起点
    this.firstTask = sfnDistributedMap.distributedMap
  }
}
