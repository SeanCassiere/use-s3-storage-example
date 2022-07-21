import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface TypedRequest extends Request {
	user?: {
		id: string;
		username: string;
		password: string;
	};
}

export const cookieJwtAuth = (req: TypedRequest, res: Response, next: NextFunction) => {
	const token = req.cookies["access-token"];
	try {
		const user = jwt.verify(token, env.JWT_SECRET) as any;
		req.user = user;
		next();
	} catch (err) {
		res.clearCookie("access-token");
		return res.redirect("/");
	}
};

export const cookieJwtScan = (req: TypedRequest, res: Response, next: NextFunction) => {
	const token = req.cookies["access-token"];
	try {
		const user = jwt.verify(token, env.JWT_SECRET) as any;
		req.user = user;
		next();
	} catch (err) {
		req.user == null;
		next();
	}
};
