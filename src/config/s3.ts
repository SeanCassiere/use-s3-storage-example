import S3 from "aws-sdk/clients/s3";
import { env } from "./env";

export const s3 = new S3({
	region: env.AWS_BUCKET_REGION,
	accessKeyId: env.AWS_ACCESS_KEY,
	secretAccessKey: env.AWS_SECRET_KEY,
});
