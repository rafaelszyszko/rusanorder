import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config();

const config = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    charset: 'utf8mb4',
};

// Providers gerenciados (TiDB, PlanetScale, Aiven) exigem TLS.
// Habilitamos via DB_SSL=true sem CA específico — usa o store padrão do Node.
if (String(process.env.DB_SSL).toLowerCase() === 'true') {
    config.ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: true };
}

export const connection = mysql.createConnection(config);