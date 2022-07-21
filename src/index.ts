import { createServer } from "http";
import express from "express";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { router } from "./router";

const app = express();
const server = createServer(app);

app.set("view engine", "ejs");
app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/health", (_, res) => res.send({ status: "OK", uptime: process.uptime() }));

app.use("/", router);

server.listen(env.PORT, () => {
	console.log(`🚀 app is listening on port ${env.PORT} in the ${env.NODE_ENV} environment`);
});
