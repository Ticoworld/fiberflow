import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

// Reuse the host's Neon HTTP client; execute once and preserve boolean/null rows.
export async function queryAccessReceipt(sqlText: string, parameters: readonly (string | number | null)[]) {
  return { rows: await sql.query(sqlText, [...parameters]) };
}
