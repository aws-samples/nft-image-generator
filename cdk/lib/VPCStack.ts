import {
  Stack, type StackProps, CfnOutput,
  aws_ec2 as ec2
} from 'aws-cdk-lib'
import { type Construct } from 'constructs'

interface CustomProps extends StackProps {}

export class VPCStack extends Stack {
  public vpc: ec2.IVpc

  constructor (scope: Construct, id: string, props: CustomProps) {
    super(scope, id, props)

    // 既存のVPCを使用する場合はこちらを有効にする。
    // const VPC_ID = scope.node.tryGetContext("VPC_ID")
    // this.vpc = ec2.Vpc.fromLookup(scope, 'vpc', {
    //   vpcId: VPC_ID
    // })

    // VPCを作成する場合はcdk.jsonからVPCに割り当てるCIDRを取得する
    const VPC_CIDR = this.node.tryGetContext('VPC_CIDR')

    // VPCを新規に作成する
    this.vpc = new ec2.Vpc(this, 'vpc', {
      maxAzs: 2,
      natGateways: 1, // 検証用のためNAT Gatewayを1台に設定。本番環境では各AZに1台ずつ配置することを推奨する
      ipAddresses: ec2.IpAddresses.cidr(VPC_CIDR),
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          mapPublicIpOnLaunch: false,
          cidrMask: 27
        },
        {
          name: 'Private_with_egress',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 27
        },
        {
          name: 'Private_isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 27
        }
      ]
    })

    // eslint-disable-next-line no-new
    new CfnOutput(this, 'VPC ID', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
      exportName: 'VPCID'
    })
  }
}
