import { Router } from "express";
import { z } from "zod";
import { sign } from "jsonwebtoken";
import { cookieJwtScan, TypedRequest } from "../middlewares/cookieJwt";
import { env } from "../config/env";
import { prisma } from "../config/prisma";

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

pagesRouter.route("/").get(cookieJwtScan, (req: TypedRequest, res) => {
	const mascots = [
		{ name: "Sammy", organization: "DigitalOcean", birth_year: 2012 },
		{ name: "Tux", organization: "Linux", birth_year: 1996 },
		{ name: "Moby Dock", organization: "Docker", birth_year: 2013 },
	];
	const tagline = "No programming concept is complete without a cute animal mascot.";
	res.render("pages/index", {
		mascots: mascots,
		tagline: tagline,
		user: req.user ?? null,
	});
});

pagesRouter
	.route("/login")
	.get(cookieJwtScan, (req: TypedRequest, res) => {
		if (req.user && req.user?.id) {
			return res.redirect("/");
		}

		return res.render("pages/login", {
			user: req.user ?? null,
		});
	})
	.post(async (req, res) => {
		const body = await loginSchema.safeParseAsync(req.body);
		if (!body.success) {
			return res.redirect("/login");
		}
		const data = body.data;
		const user = await getUser(data.username);
		if (!user) {
			return res.redirect("/login");
		}

		const accessToken = sign(user, env.JWT_SECRET, {
			subject: user.id,
			expiresIn: "30d",
		});

		res.cookie("access-token", accessToken, { httpOnly: true });
		return res.redirect("/");
	});

pagesRouter.get("/logout", (_, res) => {
	res.clearCookie("access-token").redirect("/");
});
