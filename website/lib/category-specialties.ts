export type CategoryMembership = {
  service_category_id: string; category_slug: string; is_primary: boolean; updated_at: string;
  primary_specialty: string | null; secondary_specialties: string[]; specialty_status: string; options: string[];
};
export type CategorySnapshot = { revision: string; services: CategoryMembership[] };
export type CategoryCatalog = { id: string; slug: string; name: string; public_slug?: string; options: { id: string; labels: Record<string, string> }[] }[];

export function availableCategories(catalog: CategoryCatalog): CategoryCatalog {
  const seen = new Set<string>();
  return catalog.filter(category => {
    if (!category.options.length || seen.has(category.id)) return false;
    seen.add(category.id);
    return true;
  });
}

export function categorySelectionValid(services: CategoryMembership[]): boolean {
  return services.length >= 1 && services.length <= 3
    && new Set(services.map(row => row.service_category_id)).size === services.length
    && services.filter(row => row.is_primary).length === 1
    && services.every(row => !!row.primary_specialty && row.options.includes(row.primary_specialty)
      && row.secondary_specialties.length <= 3
      && new Set(row.secondary_specialties).size === row.secondary_specialties.length
      && row.secondary_specialties.every(id => id !== row.primary_specialty && row.options.includes(id)));
}
export const categoryCopy = {
  en: { title: 'Categories and specialties', featured: 'Featured category', feature: 'Feature this category', add: 'Add another category', primary: 'Primary specialty', secondary: 'Secondary specialties (up to three)', save: 'Save category', remove: 'Remove category', choose: 'Select a category', hint: 'Select up to three categories. New categories require complete details and review before discovery.', failed: 'Unable to save categories. Reload before trying again.', reload: 'Reload', saved: 'Saved', first: 'Save a profile draft first, then select your categories.', confirm: 'Remove this category? Its offerings will be paused. Existing visits and records are retained.', review: 'Choose a primary specialty for each category.' },
  'es-419': { title: 'Categorías y especialidades', featured: 'Categoría destacada', feature: 'Destacar esta categoría', add: 'Agregar otra categoría', primary: 'Especialidad principal', secondary: 'Especialidades secundarias (hasta tres)', save: 'Guardar categoría', remove: 'Eliminar categoría', choose: 'Selecciona una categoría', hint: 'Selecciona hasta tres categorías. Las categorías nuevas requieren datos completos y revisión antes de aparecer en las búsquedas.', failed: 'No se pudieron guardar las categorías. Recarga antes de reintentar.', reload: 'Recargar', saved: 'Guardado', first: 'Guarda un borrador del perfil y luego selecciona tus categorías.', confirm: '¿Eliminar esta categoría? Sus servicios se pausarán. Las visitas y los registros existentes se conservarán.', review: 'Elige una especialidad principal para cada categoría.' },
  'pt-BR': { title: 'Categorias e especialidades', featured: 'Categoria em destaque', feature: 'Destacar esta categoria', add: 'Adicionar outra categoria', primary: 'Especialidade principal', secondary: 'Especialidades secundárias (até três)', save: 'Salvar categoria', remove: 'Remover categoria', choose: 'Selecione uma categoria', hint: 'Selecione até três categorias. Novas categorias exigem dados completos e revisão antes de aparecerem nas buscas.', failed: 'Não foi possível salvar as categorias. Recarregue antes de tentar novamente.', reload: 'Recarregar', saved: 'Salvo', first: 'Salve um rascunho do perfil e depois selecione suas categorias.', confirm: 'Remover esta categoria? Seus serviços serão pausados. As visitas e os registros existentes serão preservados.', review: 'Escolha uma especialidade principal para cada categoria.' },
};
