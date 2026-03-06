const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const srcDir = path.join(projectRoot, "src");
const prismaDir = path.join(projectRoot, "prisma");
const distDir = path.join(projectRoot, "dist");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const cleanDir = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
};

const copyDirectoryContents = (fromDir, toDir) => {
  if (!fs.existsSync(fromDir)) {
    throw new Error(`Missing source directory: ${fromDir}`);
  }

  ensureDir(toDir);
  const entries = fs.readdirSync(fromDir);

  for (const entry of entries) {
    const fromPath = path.join(fromDir, entry);
    const toPath = path.join(toDir, entry);
    fs.cpSync(fromPath, toPath, { recursive: true });
  }
};

const copyIfExists = (fromPath, toPath) => {
  if (fs.existsSync(fromPath)) {
    fs.cpSync(fromPath, toPath, { recursive: true });
  }
};

const main = () => {
  console.log("[build] Cleaning dist directory...");
  cleanDir(distDir);
  ensureDir(distDir);

  console.log("[build] Copying src -> dist...");
  copyDirectoryContents(srcDir, distDir);

  console.log("[build] Copying prisma -> dist/prisma...");
  copyIfExists(prismaDir, path.join(distDir, "prisma"));

  console.log("[build] Copying .env.example -> dist/.env.example...");
  copyIfExists(path.join(projectRoot, ".env.example"), path.join(distDir, ".env.example"));

  console.log("[build] Build completed successfully.");
  console.log("[build] Output folder: dist");
};

try {
  main();
} catch (error) {
  console.error("[build] Failed:", error.message);
  process.exit(1);
}
