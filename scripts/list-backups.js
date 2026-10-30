import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupDir = path.join(__dirname, "..", "backups");
if (!fs.existsSync(backupDir)) {
  console.log("Nenhum backup encontrado.");
  process.exit(0);
}

const files = fs
  .readdirSync(backupDir)
  .filter((f) => f.endsWith(".db"))
  .map((f) => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
  .sort((a, b) => b.time - a.time);

if (files.length === 0) {
  console.log("Nenhum backup encontrado.");
  process.exit(0);
}

files.forEach((f) => console.log(f.name));
