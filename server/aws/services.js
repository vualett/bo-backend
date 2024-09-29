import { Textract } from '@aws-sdk/client-textract';
import { S3Client } from '@aws-sdk/client-s3';
import { AWS_ACCESS_KEY_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY } from '../keys';

const config = {
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
};

const s3 = new S3Client(config);

const textract = new Textract(config);

export { s3, textract };
