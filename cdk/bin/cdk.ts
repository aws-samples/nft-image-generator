#!/usr/bin/env node
/* eslint-disable no-new */
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { VPCStack } from '../lib/VPCStack'
import { SfnWorkFlowStack } from '../lib/SfnWorkFlowStack'
import { AwsPrototypingChecks } from '@aws-prototyping-sdk/pdk-nag'

void (async () => {
  const app = new cdk.App()
  cdk.Aspects.of(app).add(new AwsPrototypingChecks())

  // 検証用のVPCを作成する
  const vpc = new VPCStack(app, 'VPCStack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION
    }
  })

  // ワークフローで必要なバックエンドとSfnのステートマシンをデプロイ
  new SfnWorkFlowStack(app, 'SfnWorkFlowStack', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION
    },
    vpc: vpc.vpc
  })
})()
