import {
  aws_ec2 as ec2
} from 'aws-cdk-lib'

export const functionDefinitionParam = {
  entry: './lambda/nodejs/image/generateImage.ts',
  functionName: 'generateImage',
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  environment: {
    // TASKTOKEN: sfn.JsonPath.stringAt('$$.Task.Token')
  }
  // initialPolicy: [
  // ],
  // retry: true,
}
