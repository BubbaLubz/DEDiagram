/**
 * One-time migration: imports diagrams.json into Supabase.
 * Run: node server/migrations/migrate_json.js
 * After success, renames diagrams.json to diagrams.json.migrated
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { getSupabase } = require('../supabase');

const DIAGRAMS_FILE = path.join(__dirname, '../data/diagrams.json');
const SYSTEM_USER_ID = process.env.MIGRATION_OWNER_ID || 'system';

async function migrate() {
  if (!fs.existsSync(DIAGRAMS_FILE)) {
    console.log('No diagrams.json found — nothing to migrate.');
    return;
  }

  const diagrams = JSON.parse(fs.readFileSync(DIAGRAMS_FILE, 'utf8'));
  if (!diagrams.length) {
    console.log('diagrams.json is empty — nothing to migrate.');
    return;
  }

  const supabase = getSupabase();

  // Ensure system user exists
  await supabase.from('users').upsert({
    id: SYSTEM_USER_ID, email: 'system@migration', display_name: 'System (Migration)',
  }, { onConflict: 'id', ignoreDuplicates: true });

  let migrated = 0;
  for (const d of diagrams) {
    const { error: dErr } = await supabase.from('diagrams').upsert({
      id: d.id, name: d.name, description: d.description || '',
      owner_id: SYSTEM_USER_ID, is_template: d.isTemplate || false,
      nodes: d.nodes || [], edges: d.edges || [],
      created_at: d.createdAt, updated_at: d.updatedAt,
    }, { onConflict: 'id' });
    if (dErr) { console.error(`Failed to migrate diagram ${d.id}:`, dErr.message); continue; }

    await supabase.from('diagram_permissions').upsert({
      diagram_id: d.id, user_id: SYSTEM_USER_ID, role: 'owner',
    }, { onConflict: 'diagram_id,user_id', ignoreDuplicates: true });

    // Create initial snapshot
    await supabase.from('snapshots').insert({
      diagram_id: d.id, name: 'Initial (migrated)', trigger: 'migration',
      author_id: SYSTEM_USER_ID, nodes: d.nodes || [], edges: d.edges || [],
    });

    migrated++;
    console.log(`  ✓ ${d.name}`);
  }

  fs.renameSync(DIAGRAMS_FILE, DIAGRAMS_FILE + '.migrated');
  console.log(`\nMigrated ${migrated}/${diagrams.length} diagrams. diagrams.json renamed to diagrams.json.migrated.`);
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1); });
