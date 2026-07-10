-- ============================================================================
-- PackFlow — migration : correction de la génération des tokens
-- Bug corrigé : Postgres encode() ne supporte PAS le format 'base64url'
-- (seuls 'base64', 'hex' et 'escape' existent). Résultat concret : toute
-- création de lien d'invitation ou de lien déménageur échouait, car la
-- valeur par défaut de la colonne `token` levait une erreur à l'insertion.
-- Cette migration bascule sur de l'hexadécimal, toujours valide.
-- À exécuter si tu avais déjà lancé une version précédente de 01_schema.sql.
-- ============================================================================

alter table invite_tokens alter column token set default encode(gen_random_bytes(24), 'hex');
alter table mover_tokens  alter column token set default encode(gen_random_bytes(24), 'hex');
