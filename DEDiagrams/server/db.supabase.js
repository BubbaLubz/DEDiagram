/**
 * Supabase-backed persistence adapter.
 * Implements the same interface as db.js (JSON adapter) so server/index.js
 * can swap between them with a single env-var check.
 *
 * All methods are async-aware but use .then() chains to stay compatible
 * with the synchronous call sites in routes (the routes don't await db calls
 * in Phase 1, so we'll convert them to async in this phase).
 */
const { getSupabase } = require('./supabase');

const db = {
  async listDiagrams(userId) {
    const supabase = getSupabase();
    // Return diagrams where user is owner or has a permission record
    const { data, error } = await supabase
      .from('diagrams')
      .select(`
        id, name, description, is_template, created_at, updated_at, nodes, edges,
        diagram_permissions!inner(role)
      `)
      .eq('diagram_permissions.user_id', userId);
    if (error) throw error;
    return data.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description,
      isTemplate: d.is_template,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      role: d.diagram_permissions[0]?.role,
      // Lightweight shape for thumbnail rendering — not the full node data
      nodes: (d.nodes || []).map(n => ({ id: n.id, position: n.position, componentType: n.data?.componentType })),
      edges: (d.edges || []).map(e => ({ source: e.source, target: e.target })),
    }));
  },

  async getDiagram(id, userId) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('diagrams')
      .select('*, diagram_permissions(role, user_id)')
      .eq('id', id)
      .single();
    if (error) return null;
    // Check access
    const perm = data.diagram_permissions.find(p => p.user_id === userId);
    if (!perm) return null; // no access
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      nodes: data.nodes,
      edges: data.edges,
      docCells: data.doc_cells || [],
      isTemplate: data.is_template,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      role: perm.role,
    };
  },

  async createDiagram({ name, description, nodes, edges, docCells, isTemplate, ownerId }) {
    const supabase = getSupabase();
    // Ensure user exists
    await db.upsertUser({ id: ownerId });
    const { data: diagram, error } = await supabase
      .from('diagrams')
      .insert({ name, description: description || '', nodes, edges: edges || [],
        doc_cells: docCells || [], is_template: isTemplate || false, owner_id: ownerId })
      .select()
      .single();
    if (error) throw error;
    // Create owner permission
    await supabase.from('diagram_permissions').insert({
      diagram_id: diagram.id, user_id: ownerId, role: 'owner',
    });
    return {
      id: diagram.id, name: diagram.name, description: diagram.description,
      nodes: diagram.nodes, edges: diagram.edges, docCells: diagram.doc_cells || [],
      isTemplate: diagram.is_template,
      createdAt: diagram.created_at, updatedAt: diagram.updated_at,
    };
  },

  async updateDiagram(id, updates, userId) {
    const supabase = getSupabase();
    // Verify user has editor+ access
    const perm = await db.getUserPermission(id, userId);
    if (!perm || perm.role === 'viewer') return null;
    const dbUpdates = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.nodes !== undefined) dbUpdates.nodes = updates.nodes;
    if (updates.edges !== undefined) dbUpdates.edges = updates.edges;
    if (updates.docCells !== undefined) dbUpdates.doc_cells = updates.docCells;
    if (updates.isTemplate !== undefined) dbUpdates.is_template = updates.isTemplate;
    const { data, error } = await supabase
      .from('diagrams').update(dbUpdates).eq('id', id).select().single();
    if (error) return null;
    return { id: data.id, name: data.name, description: data.description,
      nodes: data.nodes, edges: data.edges, docCells: data.doc_cells || [], isTemplate: data.is_template,
      createdAt: data.created_at, updatedAt: data.updated_at };
  },

  async deleteDiagram(id, userId) {
    const supabase = getSupabase();
    const perm = await db.getUserPermission(id, userId);
    if (!perm || perm.role !== 'owner') return false;
    const { error } = await supabase.from('diagrams').delete().eq('id', id);
    return !error;
  },

  async getUserPermission(diagramId, userId) {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('diagram_permissions')
      .select('role')
      .eq('diagram_id', diagramId)
      .eq('user_id', userId)
      .single();
    return data;
  },

  async upsertUser({ id, email, displayName, avatarUrl }) {
    const supabase = getSupabase();
    const { error } = await supabase.from('users').upsert(
      { id, email: email || '', display_name: displayName || '', avatar_url: avatarUrl || null },
      { onConflict: 'id', ignoreDuplicates: false }
    );
    if (error && error.code !== '23505') throw error; // ignore unique violations
  },

  // Passport identity — replaces the old local users.json file, which
  // doesn't survive a restart on an ephemeral filesystem (Render free tier).
  async getUserById(id) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  },

  async findUserByOAuthId(field, value) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('users').select('*').eq(field, value).maybeSingle();
    if (error) return null;
    return data;
  },

  async createUser({ id, email, displayName, avatarUrl, githubId, googleId }) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('users').insert({
      id, email: email || '', display_name: displayName || '', avatar_url: avatarUrl || null,
      github_id: githubId || null, google_id: googleId || null,
    }).select().single();
    if (error) throw error;
    return data;
  },

  // Backfills an OAuth id onto an existing row found by email — handles a
  // pre-existing user's first login after migrating identity into Supabase,
  // so it links to their old account/diagrams instead of creating a duplicate.
  async linkOAuthId(userId, field, value) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('users').update({ [field]: value }).eq('id', userId).select().single();
    if (error) throw error;
    return data;
  },

  // Comments
  async getComments(diagramId, nodeId) {
    const supabase = getSupabase();
    const query = supabase.from('comments').select(`
      id, diagram_id, node_id, author_id, parent_id, body, resolved, created_at, updated_at,
      users(display_name, avatar_url)
    `).eq('diagram_id', diagramId).order('created_at', { ascending: true });
    if (nodeId) query.eq('node_id', nodeId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createComment({ diagramId, nodeId, authorId, parentId, body }) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('comments')
      .insert({ diagram_id: diagramId, node_id: nodeId, author_id: authorId,
        parent_id: parentId || null, body })
      .select(`id, diagram_id, node_id, author_id, parent_id, body, resolved, created_at,
        users(display_name, avatar_url)`)
      .single();
    if (error) throw error;
    return data;
  },

  async resolveComment(commentId, userId, resolved) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('comments')
      .update({ resolved }).eq('id', commentId).eq('author_id', userId).select().single();
    if (error) return null;
    return data;
  },

  // Snapshots
  async getSnapshots(diagramId) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('snapshots')
      .select('id, name, trigger, author_id, created_at, users(display_name, avatar_url)')
      .eq('diagram_id', diagramId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createSnapshot({ diagramId, name, trigger, authorId, nodes, edges }) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('snapshots')
      .insert({ diagram_id: diagramId, name, trigger, author_id: authorId, nodes, edges })
      .select().single();
    if (error) throw error;
    return data;
  },

  async getSnapshot(snapshotId) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('snapshots')
      .select('*').eq('id', snapshotId).single();
    if (error) return null;
    return data;
  },

  // User search (invite-by-user flow) — ILIKE with a leading wildcard is
  // accelerated by the pg_trgm GIN index from migration 004, not a plain
  // btree, which is why this is fast even as the users table grows.
  async searchUsers(query, excludeUserId) {
    const supabase = getSupabase();
    const safe = query.replace(/[,()%]/g, '').trim();
    if (!safe) return [];
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, email, avatar_url')
      .or(`display_name.ilike.%${safe}%,email.ilike.%${safe}%`)
      .neq('id', excludeUserId)
      .limit(8);
    if (error) throw error;
    return data;
  },

  // Permissions
  async setPermission({ diagramId, userId, role, invitedBy }) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('diagram_permissions')
      .upsert({ diagram_id: diagramId, user_id: userId, role, invited_by: invitedBy },
        { onConflict: 'diagram_id,user_id' }).select().single();
    if (error) throw error;
    return data;
  },

  async removePermission(diagramId, userId) {
    const supabase = getSupabase();
    const { error } = await supabase.from('diagram_permissions')
      .delete().eq('diagram_id', diagramId).eq('user_id', userId)
      .neq('role', 'owner'); // can't remove the owner
    return !error;
  },

  async getDiagramMembers(diagramId) {
    const supabase = getSupabase();
    // diagram_permissions has two FKs to users (user_id, invited_by), so the
    // embedded select must be qualified by FK name or PostgREST can't tell
    // which relationship to embed and errors out.
    const { data, error } = await supabase.from('diagram_permissions')
      .select('role, user_id, users!diagram_permissions_user_id_fkey(display_name, avatar_url, email)')
      .eq('diagram_id', diagramId);
    if (error) throw error;
    return data;
  },

  async setShareLink(diagramId, ownerId, role) {
    const supabase = getSupabase();
    const perm = await db.getUserPermission(diagramId, ownerId);
    if (perm?.role !== 'owner') return null;
    const token = role ? require('crypto').randomBytes(16).toString('hex') : null;
    const { data, error } = await supabase.from('diagrams')
      .update({ share_link_token: token, share_link_role: role || null })
      .eq('id', diagramId).select('share_link_token, share_link_role').single();
    if (error) return null;
    return data;
  },

  async getDiagramByShareToken(token) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('diagrams')
      .select('id, share_link_role').eq('share_link_token', token).single();
    if (error) return null;
    return data;
  },
};

module.exports = db;
