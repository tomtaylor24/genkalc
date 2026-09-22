import mysql from "mysql2/promise"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URLが.envに設定されていません")
}

const rawCaCert = process.env.DATABASE_CA_CERT
const caCert = rawCaCert
  ? rawCaCert.includes("-----BEGIN")
    ? rawCaCert.replace(/\\n/g, "\n")
    : Buffer.from(rawCaCert, "base64").toString("utf8")
  : undefined

const pool = mysql.createPool({
  uri: databaseUrl,
  decimalNumbers: true,
  timezone: "Z",
  connectionLimit: 3,
  ...(caCert ? { ssl: { ca: caCert } } : {})
})

export default pool
