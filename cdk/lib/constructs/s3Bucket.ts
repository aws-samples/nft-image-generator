import {
  Stack, type StackProps, RemovalPolicy,
  aws_s3 as s3
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { NagSuppressions } from 'cdk-nag'

interface CustomProps extends StackProps {
}

export class S3Bucket extends Construct {
  public unprocessedIdList: s3.Bucket // 未処理のID一覧を格納する場所
  public inputImageBucket: s3.Bucket // 入力画像を格納する場所
  public generativePartsSetBucket: s3.Bucket // Generative Artで使用するパーツ置き場
  public imageBucket: s3.Bucket // 生成した画像を配置する場所
  public metadataBucket: s3.Bucket // メタデータを保存する場所
  public sfnDistributedMapResultBucket: s3.Bucket // StepFunctionsのDistributed Mapの結果を保存する場所

  constructor (scope: Construct, id: string, props: CustomProps) {
    super(scope, id)

    // アクセスログ記録用のs3 bucketの作成
    const accessLogBucket = new s3.Bucket(this, 'AccessLogBucket', {
      bucketName: `${Stack.of(this).account}-${Stack.of(this).region}-access-log-bucket`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY
    })

    this.unprocessedIdList = new s3.Bucket(this, 'unprocessedIdList', {
      bucketName: `${Stack.of(this).account}-${Stack.of(this).region}-unprocessed-id-list-bucket`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: 'unprocessedIdList'
    })

    this.inputImageBucket = new s3.Bucket(this, 'InputImageBucket', {
      bucketName: `${Stack.of(this).account}-${Stack.of(this).region}-input-image-bucket`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: 'InputImageBucket'
    })

    this.sfnDistributedMapResultBucket = new s3.Bucket(this, 'SfnDistributedMapResultBucket', {
      bucketName: `${Stack.of(this).account}-${Stack.of(this).region}-sfn-distributed-map-result-bucket`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: 'SfnDistributedMapResultBucket'
    })

    this.imageBucket = new s3.Bucket(this, 'ImageBucket', {
      bucketName: `${Stack.of(this).account}-${Stack.of(this).region}-image-bucket`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: 'ImageBucket'
    })

    this.metadataBucket = new s3.Bucket(this, 'MetadataBucket', {
      bucketName: `${Stack.of(this).account}-${Stack.of(this).region}-metadata-bucket`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      enforceSSL: true,
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: 'MetadataBucket'
    })

    NagSuppressions.addResourceSuppressions(accessLogBucket,
      [
        {
          id: 'AwsPrototyping-S3BucketLoggingEnabled',
          reason: 'This is access log bucket'
        }
      ],
      true
    )
  }
}
