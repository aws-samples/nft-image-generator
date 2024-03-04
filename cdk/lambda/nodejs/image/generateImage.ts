import { RandomWithSeed } from './lib/Random'
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: "us-east-1",
});

// Inputをもとに一意に決まるランダムな画像を生成する
exports.handler = async (event: any, context: any, callback: any) => {
  console.log(event)

  // InputとしてIDとレアリティを受け取る
  const id = event.id ?? 'A001' // ID
  const rank = event.rank ?? 'common' // レアリティ
  const bucketName = event.bucketName ?? '111122223333-aa-example-1-image-bucket'
  const inputPrompt = event.prompt ?? ''

  // IDとレアリティをシード値として画像を動的生成する
  const seed = convertToDecimal(id + rank)
  // シード値を使って乱数生成器を初期化
  const rnd = new RandomWithSeed(seed)
  

  // 入力画像の取得
  const inputBucketName: string = event.inputBucketName
  const inputKeyName: string = event.inputKeyName
  const model = event.model || 'stability.stable-diffusion-xl-v1'

  const inputImageData = await getImageFromS3(inputBucketName, inputKeyName)

  const outputImage = await generateImage(model, inputImageData, rnd.random(), inputPrompt)
  
  await putImageToS3(bucketName, outputImage, `${id}/${rank}.png`, 'image/png', 'base64')
  
}

async function generateImage(model: string, inputImageBase64: string, seed: number, inputPrompt: string) {
  const param = JSON.stringify({
    text_prompts: [
      {
        // プロンプト
        text: `icon, illustration, woman, facing left, close up, ${inputPrompt}` ,
        weight: 1,
      },
      {
        text: "extra fingers, mutated hands, poorly drawn hands, mutation, deformed, malformed, ugly, extra limbs",
        weight: -1,
      }
    ],
    cfg_scale: 20,
    style_preset: "cinematic",
    seed: seed,
    steps: 50,
    init_image: inputImageBase64,
    image_strength: 0.35
  })

  const command = new InvokeModelCommand({
    modelId: model,
    body: param,
    accept: "application/json",
    contentType: "application/json",
  })
  const res = await client.send(command);

  const body = JSON.parse(Buffer.from(res.body).toString("utf-8"));
  return body.artifacts[0].base64

}

async function getImageFromS3 (inputBucketName: string, inputKeyName: string): Promise<any> {
  const client = new S3Client({
    region: 'ap-northeast-1'
  });
  const command = new GetObjectCommand({
    Bucket: inputBucketName,
    Key: inputKeyName
  });

  try {
    const response = await client.send(command);
    
    const imageData = Buffer.from(await response.Body?.transformToByteArray() as Buffer).toString('base64')
    return imageData

  } catch (err) {
    console.error(err);
    throw new Error("Failed to get image from S3");
  }
}

async function putImageToS3 (bucketName: string, imageData: string, imageKey: string, ContentType: string, ContentEncoding: string) {
  const client = new S3Client({
    region: 'ap-northeast-1'
  });

  const buf = Buffer.from(imageData, 'base64')

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Body: buf,
    Key: imageKey,
    ContentType,
    ContentEncoding
  });

  try {
    const response = await client.send(command);
    console.log(response);
  } catch (err) {
    console.error(err);
    throw new Error("Failed to put image to S3");
  }
}


function convertToDecimal (input: string): number {
  // 文字列を1文字ずつ配列に変換
  const chars = input.split('')

  // 10進数への変換ロジック
  let decimal = 0
  for (let i = 0; i < chars.length; i++) {
    const asciiCode = chars[i].charCodeAt(0)
    decimal += asciiCode * Math.pow(10, chars.length - i - 1)
  }

  return decimal
}

// main
if (require.main === module) {
  exports.handler({
    "bucketName": "111122223333-aa-example-1-unprocessed-id-list-bucket",
    "bucketKey": "testRank.json",
    "id": "test",
    "rank": "testRank",
    "inputBucketName": "111122223333-aa-example-1-input-image-bucket",
    "inputKeyName": "image.jpeg",
    "model": "stability.stable-diffusion-xl-v1"
  }, null, null)
}
