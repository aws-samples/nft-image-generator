import {
  type StackProps,
  type aws_s3 as s3,
  aws_stepfunctions as sfn, aws_stepfunctions_tasks as sfnTasks
} from 'aws-cdk-lib'
import { Construct } from 'constructs'

interface CustomProps extends StackProps {
  metadataBucket: s3.Bucket
}

export class SfnS3PutObject extends Construct {
  public task: sfnTasks.CallAwsService

  constructor (scope: Construct, id: string, props: CustomProps) {
    super(scope, id)

    this.task = new sfnTasks.CallAwsService(this, 'PutObject', {
      service: 's3',
      action: 'putObject',
      parameters: {
        Bucket: props.metadataBucket.bucketName,
        Key: sfn.JsonPath.stringAt('$.Payload.MetadataKey'),
        Body: sfn.JsonPath.stringAt('$.Payload.Metadata'),
        ContentType: 'application/json'
      },
      iamResources: [
        props.metadataBucket.arnForObjects('*')
      ],
      iamAction: 's3:PutObject'
    })
  }
}
