import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const username = "test";

prisma.user
	.create({
		data: {
			username,
		},
	})
	.then(() => {
		console.log("Seeded database with user:", username);
	})
	.catch((error) => {
		console.error("There was an error seeding your database. See error below.");
		console.error(error);
	});
