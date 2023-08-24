import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { Rekognition } from "@aws-sdk/client-rekognition";
import { S3Event } from "aws-lambda";
import { nanoid } from "nanoid";
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

type DetectLabelsParams = {
  bucketName: string;
  objectName: string;
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
    MinConfidence: 80,
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
    TableName: "livebus-dynamodb",
    Item: {
      id: { S: nanoid() },
      payload: { S: JSON.stringify(data) },
      insertedAt: { S: new Date().toISOString() }
    },
  });
}

function countLabel(labels: string[], rekognitionPayload: any) {
  return rekognitionPayload.Labels.filter((label: { Name: string }) => labels.includes(label.Name)).reduce((acc, label) => acc + label.Instances.length, 0);
}

const main = async (event: S3Event) => {
  try {
    await insertDynamoDBItem(event);
    const objectInfo = event.Records?.[0]?.s3;

    if (!objectInfo) throw new Error("No object info");

    const labelsResponse = await detectLabels({
      bucketName: objectInfo.bucket.name,
      objectName: objectInfo.object.key,
    });

    const weaponsCount = countLabel(["Weapon", "Knife", "Gun"], labelsResponse);
    const peopleCount = countLabel(["Person"], labelsResponse);

    const device = await prisma.device.findFirst({
      where: {
        code: objectInfo.bucket.name,
      }
    });

    if (device) {
      if (weaponsCount > 0) {
        await prisma.alert.create({
          data: {
            expiredAt: new Date(Date.now() + 15 * 60 * 1000),
            deviceId: device.id,
            type: "WEAPON_DETECTION",
            description: `${weaponsCount} weapons detected in ${objectInfo.object.key}`,
          }
        })
      }

      await prisma.telemetry.create({
        data: {
          passengerCount: peopleCount,
          deviceId: device.id,
        }
      });
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    }
  }

  return "Process Finished";
};

export { main };