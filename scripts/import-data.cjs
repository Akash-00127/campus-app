// Import COPY data only; SQL commands from the dump are never executed.
const fs = require('node:fs');
const path = require('node:path');
const backend = path.resolve(__dirname, '../../Campus-Backend');
const { Client } = require(path.join(backend, 'node_modules/pg'));
const env = require(path.join(backend, 'node_modules/dotenv')).parse(fs.readFileSync(path.join(backend, '.env')));
const quote = value => '"' + value.replaceAll('"', '""') + '"';
function decode(value) {
  if (value === '\\N') return null;
  return value.replace(/\\([0-7]{1,3}|x[0-9a-fA-F]{1,2}|.)/g, (_, escaped) => {
    if (/^[0-7]/.test(escaped)) return String.fromCharCode(parseInt(escaped, 8));
    if (escaped.startsWith('x') && escaped.length > 1) return String.fromCharCode(parseInt(escaped.slice(1), 16));
    return ({ b:'\b', f:'\f', n:'\n', r:'\r', t:'\t', v:'\v' })[escaped] ?? escaped;
  });
}
async function main() {
  if (!process.argv[2]) throw Error('Usage: node scripts/import-data.cjs <dump.sql>');
  const sql = fs.readFileSync(process.argv[2], 'utf8');
  const blocks = [...sql.matchAll(/^COPY public\.(\w+) \((.+)\) FROM stdin;\r?\n([\s\S]*?)^\\\.$/gm)];
  if (!blocks.length) throw Error('No PostgreSQL COPY data found.');
  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r => r.tablename);
    await client.query('LOCK TABLE ' + tables.map(t => 'public.' + quote(t)).join(',') + ' IN SHARE ROW EXCLUSIVE MODE');
    const backup = {};
    for (const table of tables) backup[table] = (await client.query('SELECT * FROM public.' + quote(table))).rows;
    const directory = path.resolve(__dirname, '../.build/backups');
    fs.mkdirSync(directory, { recursive: true });
    const backupFile = path.join(directory, 'before-import-' + Date.now() + '.json');
    fs.writeFileSync(backupFile, JSON.stringify(backup));
    console.log('Backup:', backupFile);
    // Existing accounts keep their credentials; imported references use their IDs.
    const userIds = new Map();
    const userBlock = blocks.find(b => b[1] === 'users');
    if (userBlock) {
      const cols = userBlock[2].split(', ').map(c => c.replace(/^"|"$/g, ''));
      for (const line of userBlock[3].split(/\r?\n/).filter(Boolean)) {
        const row = line.split('\t').map(decode);
        const existing = backup.users.find(u => u.email === row[cols.indexOf('email')]);
        if (existing) {
          if (existing.role !== row[cols.indexOf('role')]) throw Error('Conflicting role for an existing account; import cancelled.');
          userIds.set(row[cols.indexOf('id')], existing.id);
        }
      }
    }
    const order = ['universities','campuses','users','vendors','categories','products','addresses','coupons','orders','order_items','order_status_history','reviews','notifications','device_tokens','support_tickets','app_settings','audit_logs','migrations'];
    for (const block of blocks) if (!order.includes(block[1]) || !tables.includes(block[1])) throw Error('Unknown table: ' + block[1]);
    for (const table of order) {
      const block = blocks.find(b => b[1] === table);
      if (!block) continue;
      const columns = block[2].split(', ').map(c => c.replace(/^"|"$/g, ''));
      const rows = block[3].split(/\r?\n/).filter(Boolean).map(line => line.split('\t').map(value => {
        const decoded = decode(value);
        return userIds.get(decoded) ?? decoded;
      }));
      if (!rows.length) continue;
      if (rows.some(row => row.length !== columns.length)) throw Error('Invalid row in ' + table);
      if (table === 'migrations') {
        for (const row of rows) {
          await client.query('INSERT INTO public.migrations ("timestamp", name) SELECT $1::bigint,$2::varchar WHERE NOT EXISTS (SELECT 1 FROM public.migrations WHERE name=$2::varchar)', [row[columns.indexOf('timestamp')], row[columns.indexOf('name')]]);
        }
      } else {
        let inserted = 0;
        for (let offset=0; offset<rows.length; offset+=200) {
          const batch = rows.slice(offset, offset+200);
          const params = batch.flat();
          const values = batch.map((row, i) => '(' + row.map((_, j) => '$' + (i*columns.length+j+1)).join(',') + ')').join(',');
          const result = await client.query('INSERT INTO public.' + quote(table) + ' (' + columns.map(quote).join(',') + ') VALUES ' + values + ' ON CONFLICT (id) DO NOTHING', params);
          inserted += result.rowCount;
        }
        const ids = rows.map(row => row[columns.indexOf('id')]);
        const present = await client.query('SELECT count(*) FROM public.' + quote(table) + ' WHERE id::text = ANY($1::text[])', [ids]);
        if (Number(present.rows[0].count) !== rows.length) throw Error('Verification failed: ' + table);
        console.log(table + ': ' + inserted + ' added, ' + (rows.length-inserted) + ' existing preserved');
      }
    }
    await client.query('COMMIT');
    console.log('Import committed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode=1; });

