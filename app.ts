import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { Rekognition } from "@aws-sdk/client-rekognition";
import { S3Event } from "aws-lambda";
import { nanoid } from "nanoid";

const main = async (event: S3Event) => {
  const objectInfo = event.Records?.[0]?.s3;
  
  if (!objectInfo) throw new Error("No object info");

  const { name: bucketName } = objectInfo?.bucket;
  const { key: objectKey } = objectInfo?.object;

  if (!objectInfo) throw new Error("No object info");

  const rekognitionResponse = await detectLabels({
    bucketName,
    objectName: objectKey,
  });

  const deviceCode = objectKey.substring(0, objectKey.indexOf("/"));
  
  return insertDynamoDBItem({
    deviceCode,
    rekognitionPayload: rekognitionResponse,
    timestamp: event.Records?.[0]?.eventTime,
  });
};

async function detectLabels({ bucketName, objectName }: DetectLabelsParams) {
  const desiredLabels = ["Person", "Knife", "Gun", "Weapon"];

  return new Rekognition().detectLabels({
    Image: {
      S3Object: {
        Bucket: bucketName,
        Name: objectName,
      },
    },
    MinConfidence: parseInt(process.env.REKOGNITION_MIN_CONFIDENCE || "80"),
    Settings: {
      GeneralLabels: {
        LabelInclusionFilters: desiredLabels,
      },
    },
  });
}

async function insertDynamoDBItem(data: Record<string, any>) {
  const dynamoDB = new DynamoDB({ region: "us-east-1" });

  return dynamoDB.putItem({
    TableName: "lvb-analysis-payload",
    Item: {
      id: { S: nanoid() },
      payload: { S: JSON.stringify(data) },
      insertedAt: { S: new Date().toISOString() },
    },
  });
}

type DetectLabelsParams = {
  bucketName: string;
  objectName: string;
};

export { main };