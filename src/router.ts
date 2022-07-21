import multer from "multer";
import fs from "fs";
import util from "util";
import { Router } from "express";
import { z } from "zod";
import { sign } from "jsonwebtoken";

import { cookieJwtAuth, cookieJwtScan, TypedRequest } from "./middlewares/cookieJwt";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { getS3FileStream, s3FormStorageKey, uploadS3File } from "./config/s3";

const unlinkFile = util.promisify(fs.unlink);
const upload = multer({ dest: "upload/" });

export const router = Router();

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

router
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
			const data = await uploadS3File(req.user.id, file);
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

router.route("/storage/:userId/:storageKey").get(async (req, res) => {
	const userId = req.params.userId;
	const storageKey = req.params.storageKey;

	const readStream = getS3FileStream(s3FormStorageKey(userId, storageKey));

	readStream.pipe(res);
});

router.route("/files").get(cookieJwtAuth, (req: TypedRequest, res) => {
	if (req.user === null) {
		// console.log("User not found");
		return res.redirect("/");
	}

	return res.render("pages/files", {
		user: req.user ?? null,
		files: [],
	});
});

router.get("/logout", (_, res) => {
	res.clearCookie("access-token").redirect("/");
});

router
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