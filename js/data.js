import { supabase } from "./supabaseClient.js";

// ---------------------------------------------------------------------------
// Auth & compte
// ---------------------------------------------------------------------------
export async function signUp({ email, password, moveName }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  // Le trigger SQL handle_new_user() crée automatiquement le déménagement
  // et le membership "owner" à partir de move_name dans les metadata.
  return data;
}

export async function signUpWithMoveName(email, password, moveName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { move_name: moveName } },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
export async function redeemInviteToken(token) {
  // 1) Session anonyme Supabase (auth.signInAnonymously) si besoin — l'appareil
  //    obtient un vrai auth.uid() sans email/mot de passe.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const { error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) throw anonError;
  }
  // 2) RPC SECURITY DEFINER : valide le token côté serveur, rattache
  //    auth.uid() courant à move_members, marque le token consommé.
  const { data, error } = await supabase.rpc("redeem_invite_token", { p_token: token });
  if (error) throw error;
  return data; // move_id
}

function shareableUrl(param, token) {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/?${param}=${token}`;
}

export async function createInviteLink() {
  const { data, error } = await supabase.rpc("create_invite_token");
  if (error) throw error;
  return { token: data.token, url: shareableUrl("invite", data.token) };
}

export async function createMoverLink() {
  const { data, error } = await supabase.rpc("create_mover_token");
  if (error) throw error;
  return { token: data.token, url: shareableUrl("mover", data.token) };
}

// ---------------------------------------------------------------------------
// Déménagement
// ---------------------------------------------------------------------------
export async function getMyMove() {
  const { data, error } = await supabase
    .from("moves")
    .select("*, move_members!inner(role)")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMoveConfig(moveId, patch) {
  const { data, error } = await supabase
    .from("moves")
    .update(patch)
    .eq("id", moveId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Cartons
// ---------------------------------------------------------------------------
export async function generateBoxId(moveId) {
  const { data, error } = await supabase.rpc("generate_box_id", { p_move_id: moveId });
  if (error) throw error;
  return data; // string 4 caractères
}

export async function createBox(box) {
  const { data, error } = await supabase.from("boxes").insert(box).select().single();
  if (error) throw error;
  return data;
}

export async function updateBox(boxId, patch) {
  const { data, error } = await supabase.from("boxes").update(patch).eq("id", boxId).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBox(boxId) {
  const { error } = await supabase.from("boxes").delete().eq("id", boxId);
  if (error) throw error;
}

export async function listBoxes(moveId) {
  const { data, error } = await supabase
    .from("boxes")
    .select("*, items(count)")
    .eq("move_id", moveId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getBoxById(moveId, id) {
  const { data, error } = await supabase
    .from("boxes")
    .select("*, items(*)")
    .eq("move_id", moveId)
    .eq("id", id.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Objets d'un carton
// ---------------------------------------------------------------------------
export async function addItem(boxId, item) {
  const { data, error } = await supabase
    .from("items")
    .insert({ box_id: boxId, ...item })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeItem(itemId) {
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Tâches (rétro-planning)
// ---------------------------------------------------------------------------
export async function listTasks(moveId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("move_id", moveId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function seedTasksFromTemplate(moveId) {
  const { error } = await supabase.rpc("seed_tasks_from_template", { p_move_id: moveId });
  if (error) throw error;
}

export async function updateTask(taskId, patch) {
  const { data, error } = await supabase.from("tasks").update(patch).eq("id", taskId).select().single();
  if (error) throw error;
  return data;
}

export async function createCustomTask(task) {
  const { data, error } = await supabase.from("tasks").insert({ ...task, custom: true }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTask(taskId) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Mobilier & volume
// ---------------------------------------------------------------------------
export async function listFurniture(moveId) {
  const { data, error } = await supabase.from("furniture").select("*").eq("move_id", moveId).order("created_at");
  if (error) throw error;
  return data;
}

export async function addFurniture(item) {
  const { data, error } = await supabase.from("furniture").insert(item).select().single();
  if (error) throw error;
  return data;
}

export async function removeFurniture(id) {
  const { error } = await supabase.from("furniture").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Notifications push
// ---------------------------------------------------------------------------
export async function savePushSubscription(moveId, subscription) {
  const json = subscription.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert({
    move_id: moveId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  }, { onConflict: "endpoint" });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Mode déménageur (accès scopé, via edge function, jamais de requête directe)
// ---------------------------------------------------------------------------
export async function moverLookup(moverToken, code) {
  const { data, error } = await supabase.functions.invoke("mover-access", {
    body: { token: moverToken, code },
  });
  if (error) throw error;
  return data; // { box_id, destination } uniquement
}
