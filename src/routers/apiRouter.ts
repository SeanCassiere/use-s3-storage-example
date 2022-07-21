import { Router } from "express";
import { cookieJwtAuth } from "../middlewares/cookieJwt";

export const apiRouter = Router();

apiRouter.get("/", cookieJwtAuth, (_, res) => res.send("You've access an auth page"));
