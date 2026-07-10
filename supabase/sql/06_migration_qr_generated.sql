-- ============================================================================
-- PackFlow — migration : QR codes générés par la plateforme
-- À exécuter uniquement si tu avais déjà lancé une version précédente de
-- 01_schema.sql (avec une colonne qr_code sur boxes). Sans effet si tu pars
-- d'une base neuve avec la dernière version de 01_schema.sql.
--
-- Changement de modèle : le QR n'est plus une valeur externe à associer,
-- il est généré par l'app (encode l'URL de la fiche carton) et régénérable
-- à la volée depuis l'id — donc rien à stocker.
-- ============================================================================

drop index if exists idx_boxes_move_qr;
alter table boxes drop column if exists qr_code;
