import multer from "multer";
import fs from "fs";
import util from "util";
import { Router } from "express";
import { z } from "zod";
import { sign } from "jsonwebtoken";

import { cookieJwtAuth, cookieJwtScan, TypedRequest } from "../middlewares/cookieJwt";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { s3 } from "../config/s3";

const unlinkFile = util.promisify(fs.unlink);
const upload = multer({ dest: "upload/" });

export const pagesRouter = Router();

const loginSchema = z.object({
	username: z.string(),
});

async function getUser(username: string) {
	return await prisma.user.findFirst({
		where: {
			username: {
				equals: username.toLowerCase(),
				mode: "insensitive",
			},
		},
	});
}

async function uploadFile(userId: string, file: Express.Multer.File) {
	const fileStream = fs.createReadStream(file.path);
	const ext = file.mimetype.split("/")[1];

	const uploadParams = {
		Bucket: env.AWS_BUCKET_NAME,
		Body: fileStream,
		Key: `${userId}/${file.filename}.${ext}`,
	};

	return s3.upload(uploadParams).promise();
}

function getFileStream(key: string) {
	return s3.getObject({ Bucket: env.AWS_BUCKET_NAME, Key: key }).createReadStream();
}

pagesRouter
	.route("/files/proxy-upload")
	.get(cookieJwtAuth, (req: TypedRequest, res) => {
		if (req.user === null) {
			return res.redirect("/");
		}

		return res.render("pages/proxy-upload", {
			user: req.user,
		});
	})
	.post(cookieJwtAuth, upload.single("file"), async (req: TypedRequest, res) => {
		const file = req.file;

		if (!file || !req.user) {
			return res.redirect("/files/proxy-upload");
		}

		try {
			const data = await uploadFile(req.user.id, file);
			console.log("uploaded file", data);
		} catch (error) {
			console.log("upload failed", error);
		}

		try {
			await unlinkFile(file.path);
		} catch (error) {
			console.log("error unlinking file", error);
		}
		return res.redirect("/files");
	});

pagesRouter.route("/storage/:userId/:storageKey").get(async (req, res) => {
	const userId = req.params.userId;
	const storageKey = req.params.storageKey;

	const readStream = getFileStream(`${userId}/${storageKey}`);

	readStream.pipe(res);
});

pagesRouter.route("/files").get(cookieJwtAuth, (req: TypedRequest, res) => {
	if (req.user === null) {
		// console.log("User not found");
		return res.redirect("/");
	}

	return res.render("pages/files", {
		user: req.user ?? null,
		files: [],
	});
});

pagesRouter.get("/logout", (_, res) => {
	res.clearCookie("access-token").redirect("/");
});

pagesRouter
	.route("/")
	.get(cookieJwtScan, (req: TypedRequest, res) => {
		if (req.user && req.user.id) {
			return res.redirect("/files");
		}

		res.render("pages/index", {
			user: req.user ?? null,
		});
	})
	.post(async (req, res) => {
		const body = await loginSchema.safeParseAsync(req.body);
		const errString = `/?error=login-failed`;
		if (!body.success) {
			return res.redirect(errString);
		}
		const data = body.data;
		const user = await getUser(data.username);
		if (!user) {
			return res.redirect(errString);
		}

		const accessToken = sign(user, env.JWT_SECRET, {
			subject: user.id,
			expiresIn: "30d",
		});

		res.cookie("access-token", accessToken, { httpOnly: true });
		return res.redirect("/files");
	});
