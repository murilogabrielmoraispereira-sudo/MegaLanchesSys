import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupArg = process.argv[2];
if (!backupArg) {
  console.log("Uso: node scripts/restore-backup.js <arquivo.db>");
  process.exit(1);
}

const backupDir = path.join(__dirname, "..", "backups");
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "mega-lanches.db");

const backupPath = path.isAbsolute(backupArg)
  ? backupArg
  : path.join(backupDir, backupArg);

if (!fs.existsSync(backupPath)) {
  console.error("Backup nao encontrado:", backupPath);
  process.exit(1);
}

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

if (fs.existsSync(dbPath)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const preRestore = path.join(backupDir, `pre-restore-${stamp}.db`);
  fs.copyFileSync(dbPath, preRestore);
}

fs.copyFileSync(backupPath, dbPath);
console.log("Backup restaurado:", backupPath);
console.log("Lembre-se de iniciar o servidor novamente.");
