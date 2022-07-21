import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export const COOKIE_KEY = "access-token";

export interface TypedRequest extends Request {
	user?: {
		id: string;
		username: string;
	};
}

export const cookieJwtAuth = (req: TypedRequest, res: Response, next: NextFunction) => {
	const token = req.cookies[COOKIE_KEY] ?? "";
	try {
		const user = jwt.verify(token, env.JWT_SECRET) as any;
		req.user = user;
		next();
	} catch (err) {
		res.clearCookie(COOKIE_KEY);
		return res.redirect("/");
	}
};

export const cookieJwtScan = (req: TypedRequest, res: Response, next: NextFunction) => {
	const token = req.cookies[COOKIE_KEY] ?? "";
	try {
		const user = jwt.verify(token, env.JWT_SECRET) as any;
		req.user = user;
	} catch (err) {
		req.user == null;
	}
	next();
};
