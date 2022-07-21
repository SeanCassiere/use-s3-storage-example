import S3 from "aws-sdk/clients/s3";
import fs from "fs";
import crypto from "crypto";
import { promisify } from "util";

import { env } from "./env";

const randomBytes = promisify(crypto.randomBytes);

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
export async function makeUploadStorageKey(userId: string, extension: string) {
	const rawBytes = await randomBytes(16);
	const storageKey = rawBytes.toString("hex");
	return s3FormStorageKey(userId, `${storageKey}.${extension}`);
}

/**
 * @desc A helper function to upload a file from express & multer to S3
 * @param userId
 * @param file
 * @returns the upload information such as the Tag and the Key
 */
export async function uploadS3File(userId: string, file: Express.Multer.File) {
	const fileStream = fs.createReadStream(file.path);
	const ext = file.mimetype.split("/")[1];

	const uploadParams = {
		Bucket: env.AWS_BUCKET_NAME,
		Body: fileStream,
		Key: await makeUploadStorageKey(userId, ext),
	};

	return s3.upload(uploadParams).promise();
}

/**
 * @desc A helper function to get a file stream from S3 as a readable stream
 * @param storageKey
 * @returns readable stream of the file in S3
 */
export function getS3FileStream(storageKey: string) {
	return s3.getObject({ Bucket: env.AWS_BUCKET_NAME, Key: storageKey }).createReadStream();
}

/**
 * @desc Used to generate a presigned URL for a user on the client-side to upload an expected image.
 * @param userId
 * @param extension
 * @returns Presigned upload capable URL
 */
export async function getS3PresignedUploadUrl(userId: string, extension: string) {
	const key = await makeUploadStorageKey(userId, extension);
	return {
		storageKey: key,
		url: await s3.getSignedUrlPromise("putObject", { Bucket: env.AWS_BUCKET_NAME, Key: key, Expires: 60 }),
	};
}

/**
 * @desc Used to generate a presigned URL for a user on the client-side to download an expected image.
 * @param storageKey
 * @returns Presigned download capable URL
 */
export async function getS3PresignedViewUrl(storageKey: string) {
	return {
		storageKey: storageKey,
		url: await s3.getSignedUrlPromise("putObject", { Bucket: env.AWS_BUCKET_NAME, Key: storageKey }),
	};
}
