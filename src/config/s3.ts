import S3 from "aws-sdk/clients/s3";
import fs from "fs";
import { nanoid } from "nanoid";
import { env } from "./env";

export const s3 = new S3({
	region: env.AWS_BUCKET_REGION,
	accessKeyId: env.AWS_ACCESS_KEY,
	secretAccessKey: env.AWS_SECRET_KEY,
	signatureVersion: "v4",
});

/**
 * @desc Makes a key that is unique to the user and the file name
 * @param userId the user id to get the file for
 * @param storageKey the file name
 * @returns a unique key
 */
export function s3FormStorageKey(userId: string, storageKey: string) {
	return `${userId}/${storageKey}`;
}

/**
 * @desc Makes a unique key to upload to S3
 * @param userId the user id to get the file for
 * @param extension extension of the filename
 * @returns a new storage key
 */
export function makeUploadStorageKey(userId: string, extension: string) {
	const storageKey = nanoid(15);
	return s3FormStorageKey(userId, `${storageKey}.${extension}`);
}

export async function uploadS3File(userId: string, file: Express.Multer.File) {
	const fileStream = fs.createReadStream(file.path);
	const ext = file.mimetype.split("/")[1];

	const uploadParams = {
		Bucket: env.AWS_BUCKET_NAME,
		Body: fileStream,
		Key: makeUploadStorageKey(userId, ext),
	};

	return s3.upload(uploadParams).promise();
}

export function getS3FileStream(key: string) {
	return s3.getObject({ Bucket: env.AWS_BUCKET_NAME, Key: key }).createReadStream();
}
