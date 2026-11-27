/* eslint-disable no-console */
import "dotenv/config";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

async function main() {
  const email = `db-check-${Date.now()}@example.com`;
  const id = BigInt(Date.now());

  try {
    const user = await prisma.user.create({
      data: { email, name: "DB Check", login: "db-check" },
    });

    const installation = await prisma.installation.create({
      data: { userId: user.id, installationId: id, accountLogin: "db-check" },
    });

    const repo = await prisma.repository.create({
      data: {
        installationId: installation.id,
        githubRepoId: id,
        owner: "db-check",
        name: "demo",
        fullName: "db-check/demo",
      },
    });

    const issue = await prisma.issue.create({
      data: {
        repositoryId: repo.id,
        githubIssueId: id,
        number: 1,
        title: "Test issue",
      },
    });

    const run = await prisma.run.create({
      data: { issueId: issue.id, userId: user.id },
    });

    const found = await prisma.run.findUniqueOrThrow({ where: { id: run.id } });
    console.log(`Run status: ${found.status}`);

    try {
      await prisma.user.create({ data: { email } });
      throw new Error("FAIL: duplicate email was accepted");
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        console.log("OK: duplicate rejected (P2002)");
      } else {
        throw e;
      }
    }
  } finally {
    // Cascade rules delete the installation, repo, issue, and run too.
    await prisma.user.deleteMany({ where: { email } });
    const left = await prisma.user.count({ where: { email } });
    console.log(left === 0 ? "OK: test data deleted" : "FAIL: test data left");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());