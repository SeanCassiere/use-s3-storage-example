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
 * Makes a `Key` that is scopes to the user, followed by the filename.
 * @param userId the user id to get the file for
 * @param fileName the file name
 * @returns a unique S3 compatible key
 */
export function s3FormStorageKey(userId: string, fileName: string) {
	return `${userId}/${fileName}`;
}

/**
 * Makes a unique `Key`, with a randomized filename, to then use to upload to S3.
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
 * Takes the user's `id` and a file from `express` & `multer` and upload's it onto S3.
 * @param userId
 * @param file
 * @returns the upload information such as the Tag and the Key.
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
 * Takes a S3 storage `Key` to then query and return the file as a readable stream.
 * @param storageKey
 * @returns readable stream of the file in S3
 */
export function getS3FileStream(storageKey: string) {
	return s3.getObject({ Bucket: env.AWS_BUCKET_NAME, Key: storageKey }).createReadStream();
}

/**
 * Takes the user's `id` and the `extension` of file being uploaded (eg: `png`), to then generate a presigned url to which the user may send a `PUT` request with the `Content-Type: multipart/form-data` header to upload their file.
 *
 * This link will be valid for 60 seconds.
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
 * Takes the S3 `Key` to query the bucket to generate a safe url to which the client may access the file.
 *
 * This is used when the bucket is NOT public, and as such requires permission to access the objects within them.
 *
 * A use case for this approach would be protect the document of users, so that they cannot be accessed by anyone else. As such, when authorized, the client can access the file using this link.
 * @param storageKey
 * @returns Presigned download capable URL
 */
export async function getS3PresignedViewUrl(storageKey: string) {
	return {
		storageKey: storageKey,
		url: await s3.getSignedUrlPromise("getObject", { Bucket: env.AWS_BUCKET_NAME, Key: storageKey }),
	};
}

/**
 * Takes the S3 `Key` to delete a file stored in the bucket.
 * @param storageKey
 */
export async function deleteS3Object(storageKey: string) {
	return await s3.deleteObject({ Bucket: env.AWS_BUCKET_NAME, Key: storageKey }).promise();
}
