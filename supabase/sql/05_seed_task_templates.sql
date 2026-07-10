-- ============================================================================
-- PackFlow — bibliothèque de tâches du rétro-planning
-- move_type = null → tâche commune à tous les types de déménagement.
-- offset_days est relatif au jour J (négatif = avant, positif = après).
-- ============================================================================

truncate table task_templates;

insert into task_templates (move_type, label, offset_days, category) values
-- Communes à tous les types --------------------------------------------------
(null, 'Faire le tri : trier, donner ou vendre ce qui ne suit pas',        -60, 'admin'),
(null, 'Demander au moins 3 devis de déménagement',                        -45, 'admin'),
(null, 'Réserver les déménageurs ou le camion de location',                -42, 'cartons'),
(null, 'Prévenir l''employeur et l''école des enfants du changement d''adresse', -30, 'admin'),
(null, 'Mettre en place la réexpédition du courrier',                      -30, 'admin'),
(null, 'Commencer à emballer les pièces peu utilisées',                    -21, 'cartons'),
(null, 'Résilier ou transférer les abonnements annexes (sport, presse…)',  -21, 'admin'),
(null, 'Résilier ou transférer le contrat internet / box',                 -14, 'energie'),
(null, 'Résilier ou transférer les contrats électricité et gaz',           -14, 'energie'),
(null, 'Prévenir la mutuelle et les assurances (habitation, auto)',        -14, 'admin'),
(null, 'Emballer le carton "premier jour" (essentiels, chargeurs, trousse de toilette)', -7, 'cartons'),
(null, 'Confirmer le créneau avec les déménageurs',                        -7,  'admin'),
(null, 'Vider et dégivrer le réfrigérateur et le congélateur',             -1,  'logement'),
(null, 'Préparer le sac ou la valise pour la nuit du déménagement',        -1,  'cartons'),
(null, 'Relever les compteurs (eau, électricité, gaz) au départ',          0,   'jour_j'),
(null, 'Remettre les clés de l''ancien logement',                          0,   'jour_j'),
(null, 'Relever les compteurs du nouveau logement',                        1,   'jour_j'),
(null, 'Ouvrir les contrats électricité, gaz et internet du nouveau logement', 3, 'energie'),
(null, 'Mettre à jour l''adresse : carte grise et carte d''identité',      7,   'admin'),
(null, 'Mettre à jour l''adresse : banque, employeur, sécurité sociale, impôts', 7, 'admin'),
(null, 'Vérifier que la réexpression du courrier fonctionne bien',         14,  'apres'),
(null, 'Faire le bilan des cartons encore non déballés',                   30,  'apres'),

-- Location → Achat -----------------------------------------------------------
('rent_buy', 'Donner congé au propriétaire (préavis de départ)',           -60, 'logement'),
('rent_buy', 'Finaliser le financement (offre de prêt, signature)',        -45, 'admin'),
('rent_buy', 'Planifier la remise des clés avec le propriétaire / l''agence', -14, 'logement'),
('rent_buy', 'Vérifier les modalités de restitution du dépôt de garantie', -7,  'logement'),

-- Achat → Achat ---------------------------------------------------------------
('buy_buy', 'Signer le compromis de vente du bien actuel',                 -60, 'admin'),
('buy_buy', 'Coordonner les dates de signature chez le notaire',           -45, 'admin'),
('buy_buy', 'Confirmer la date de signature chez le notaire',              -14, 'logement'),
('buy_buy', 'Signature notariale et remise des clés',                      0,   'jour_j'),

-- Location → Location ----------------------------------------------------------
('rent_rent', 'Envoyer le préavis de départ au propriétaire actuel',       -60, 'logement'),
('rent_rent', 'Constituer le dossier de location pour le nouveau logement', -45, 'logement'),
('rent_rent', 'Signer le nouveau bail',                                    -30, 'admin'),
('rent_rent', 'Planifier les états des lieux sortant et entrant',          -7,  'logement'),

-- Achat → Location --------------------------------------------------------------
('buy_rent', 'Mettre le bien en vente ou finaliser le compromis',          -60, 'admin'),
('buy_rent', 'Constituer le dossier de location pour le nouveau logement', -45, 'logement'),
('buy_rent', 'Signer le nouveau bail',                                     -30, 'admin'),
('buy_rent', 'Anticiper la fiscalité de la vente (plus-value, notaire)',   -14, 'admin');
