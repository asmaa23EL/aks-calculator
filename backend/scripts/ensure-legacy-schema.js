const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local'), override: true });

async function addColumnIfMissing(connection, tableName, columnName, definitionSql) {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (rows.length > 0) {
    return;
  }

  try {
    await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definitionSql}`);
  } catch (error) {
    if (error && error.code === 'ER_DUP_FIELDNAME') {
      return;
    }
    throw error;
  }
}

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lead_submissions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        nom VARCHAR(255) NOT NULL,
        prenom VARCHAR(255) NOT NULL,
        societe VARCHAR(255) NULL,
        role VARCHAR(255) NULL,
        telephone VARCHAR(50) NULL,
        submitted_at DATETIME NOT NULL,
        lead_json JSON NOT NULL,
        results_json JSON NOT NULL,
        pdf_sent TINYINT(1) NOT NULL DEFAULT 0,
        contacted TINYINT(1) NOT NULL DEFAULT 0,
        status_note TEXT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'NOUVEAU',
        note TEXT NULL,
        next_action_date DATE NULL,
        next_action VARCHAR(255) NULL,
        last_contacted_at DATETIME NULL,
        last_pdf_sent_at DATETIME NULL,
        email_count INT UNSIGNED NOT NULL DEFAULT 0,
        last_email_at DATETIME NULL,
        pdf_download_count INT UNSIGNED NOT NULL DEFAULT 0,
        last_pdf_download_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_lead_submissions_email (email),
        KEY idx_lead_submissions_submitted_at (submitted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await addColumnIfMissing(connection, 'lead', 'statut_crm', 'statut_crm VARCHAR(30) NULL');
    await addColumnIfMissing(connection, 'lead', 'crm_id', 'crm_id VARCHAR(100) NULL');
    await addColumnIfMissing(connection, 'lead', 'date_modification', 'date_modification DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    await addColumnIfMissing(connection, 'lead', 'rapport_envoye', 'rapport_envoye BOOLEAN NOT NULL DEFAULT FALSE');
    await addColumnIfMissing(connection, 'lead', 'telephone', 'telephone VARCHAR(30) NULL');
    await addColumnIfMissing(connection, 'lead', 'source', 'source VARCHAR(50) NOT NULL DEFAULT \'calculateur_web\'');

    await addColumnIfMissing(connection, 'simulation', 'gitops_actif', 'gitops_actif BOOLEAN NULL');
    await addColumnIfMissing(connection, 'simulation', 'cout_heure_indisp', 'cout_heure_indisp DECIMAL(12,2) NULL');
    await addColumnIfMissing(connection, 'simulation', 'Id_LEAD', 'Id_LEAD BIGINT UNSIGNED NULL');

    await addColumnIfMissing(connection, 'resultat', 'Id_SIMULATION', 'Id_SIMULATION BIGINT UNSIGNED NULL');
    await addColumnIfMissing(connection, 'resultat', 'roi_12_mois', 'roi_12_mois DECIMAL(10,2) NULL');
    await addColumnIfMissing(connection, 'resultat', 'payback_mois', 'payback_mois DECIMAL(10,2) NULL');

    await addColumnIfMissing(connection, 'email_log', 'message_erreur', 'message_erreur TEXT NULL');

    console.log('Schema compatibility check completed');
  } finally {
    await connection.end();
  }
})();
