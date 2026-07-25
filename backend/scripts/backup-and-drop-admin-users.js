const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function loadEnv() {
  const env = {};
  const envPaths = ['.env', '.env.local'];

  for (const p of envPaths) {
    const full = path.resolve(p);
    if (!fs.existsSync(full)) continue;

    const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (!line || line.trim().startsWith('#')) continue;
      const i = line.indexOf('=');
      if (i < 0) continue;
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }

  return env;
}

async function main() {
  const env = loadEnv();
  const connection = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  const [existsRows] = await connection.query("SHOW TABLES LIKE 'admin_users'");
  if (existsRows.length === 0) {
    console.log('admin_users absente');
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables:');
    for (const row of tables) {
      console.log(Object.values(row)[0]);
    }
    await connection.end();
    return;
  }

  const [structureRows] = await connection.query('SHOW CREATE TABLE admin_users');
  const [dataRows] = await connection.query('SELECT * FROM admin_users');

  const backupDir = path.resolve('backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `admin_users_backup_${stamp}.json`);

  const payload = {
    createdAt: new Date().toISOString(),
    table: 'admin_users',
    createTable: structureRows[0]['Create Table'] || null,
    rowCount: dataRows.length,
    rows: dataRows,
  };

  fs.writeFileSync(backupPath, JSON.stringify(payload, null, 2), 'utf8');

  await connection.query('DROP TABLE admin_users');

  const [tablesAfter] = await connection.query('SHOW TABLES');
  console.log('Backup:', backupPath);
  console.log('admin_users supprimee');
  console.log('Tables restantes:');
  for (const row of tablesAfter) {
    console.log(Object.values(row)[0]);
  }

  await connection.end();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
