// Release configuration, not legal authorization. Keep both gates off until
// jurisdiction, review operations and database publication rules are approved.
export const nutritionLaunchPolicy = Object.freeze({
  coachingCategoryId: 'nutrition',
  coachingEnabled: false,
  regulatedCategoryId: 'dietetics',
  regulatedEnabled: false,
  coachingScope: 'nonclinical',
  reviewRequired: ['protected_titles', 'disease_treatment', 'medical_nutrition_therapy', 'credential_name_mismatch'],
  requiredApprovals: ['jurisdiction_scope', 'review_operations', 'database_publication_rules'],
} as const);

export const pausedCategories = new Set([
  ...(!nutritionLaunchPolicy.coachingEnabled ? [nutritionLaunchPolicy.coachingCategoryId] : []),
  ...(!nutritionLaunchPolicy.regulatedEnabled ? [nutritionLaunchPolicy.regulatedCategoryId] : []),
  'recovery_bodywork','special_population_fitness','group_fitness_instruction',
]);
export const categoryAvailable = (id: string) => !pausedCategories.has(id.replaceAll('-', '_'));
export const savedScopeCopy = {
  en: { title: 'Saved selections unavailable at launch', body: 'These selections are kept until you remove them. Choose an available option below; no replacement is automatic.', remove: 'Remove', injury: 'Injury-aware training (saved)' },
  'es-419': { title: 'Opciones guardadas no disponibles en el lanzamiento', body: 'Estas opciones se conservan hasta que las elimines. Elige una opción disponible a continuación; no se sustituye ninguna automáticamente.', remove: 'Eliminar', injury: 'Entrenamiento adaptado a lesiones (guardado)' },
  'pt-BR': { title: 'Opções salvas indisponíveis no lançamento', body: 'Estas opções são mantidas até você removê-las. Escolha uma opção disponível abaixo; nenhuma substituição é automática.', remove: 'Remover', injury: 'Treinamento adaptado a lesões (salvo)' },
};
export const scopeCopy = {
  en: { title: 'Not available for new bookings', body: 'This service is outside the current launch scope or awaiting review. Existing visits and records remain available in your account.', notice: 'Admins review identity, claimed certifications and public services under one nonclinical marketplace policy. Only out-of-scope service claims or ambiguous cases receive specialized review. Voluntary certifications are not professional licenses.', boundaries: 'Do not offer diagnosis, treatment, rehabilitation, nutrition services or hands-on bodywork. Approval covers only the reviewed nonclinical services.' },
  'es-419': { title: 'No disponible para nuevas reservas', body: 'Este servicio queda fuera del alcance del lanzamiento o está pendiente de revisión. Las visitas y registros existentes siguen disponibles en tu cuenta.', notice: 'Los administradores revisan identidad, certificaciones declaradas y servicios públicos con una sola política no clínica. Solo los servicios fuera de alcance o los casos ambiguos pasan a revisión especializada. Las certificaciones voluntarias no son licencias profesionales.', boundaries: 'No ofrezcas diagnóstico, tratamiento, rehabilitación, servicios de nutrición ni terapias manuales. La aprobación solo cubre los servicios no clínicos revisados.' },
  'pt-BR': { title: 'Indisponível para novas reservas', body: 'Este serviço está fora do escopo do lançamento ou aguardando revisão. Visitas e registros existentes continuam disponíveis na sua conta.', notice: 'Os administradores revisam identidade, certificações declaradas e serviços públicos com uma única política não clínica. Apenas serviços fora do escopo ou casos ambíguos passam por análise especializada. Certificações voluntárias não são licenças profissionais.', boundaries: 'Não ofereça diagnóstico, tratamento, reabilitação, serviços de nutrição ou terapias manuais. A aprovação cobre apenas os serviços não clínicos revisados.' },
};
