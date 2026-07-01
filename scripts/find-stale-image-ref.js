const { Client } = require('pg');
require('dotenv').config();

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const term = '1-1780721479610.webp';
  console.log('searching for', term);
  const schemaRes = await client.query(
    "select table_name,column_name,data_type from information_schema.columns where table_schema='public' and data_type in ('character varying','text','character') order by table_name"
  );
  for (const row of schemaRes.rows) {
    const { table_name, column_name } = row;
    try {
      const res = await client.query(
        `select count(*) as count from ${table_name} where ${column_name}::text ilike $1 limit 1`,
        ['%' + term + '%']
      );
      if (res.rows[0].count !== '0') {
        console.log('match', table_name, column_name, res.rows[0].count);
        const rows = await client.query(
          `select * from ${table_name} where ${column_name}::text ilike $1 limit 5`,
          ['%' + term + '%']
        );
        console.log(rows.rows);
      }
    } catch (e) {
      // ignore query failures for unsupported columns/types
    }
  }
  await client.end();
})();
