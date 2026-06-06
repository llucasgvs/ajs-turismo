// Invalidação compartilhada dos caches de módulo do admin.
//
// As páginas do admin guardam caches em memória (lista de roteiros, dashboard,
// lista de viagens das reservas) para reentrada instantânea. Após qualquer mutação
// (criar/editar roteiro, data, ou reserva), chamamos invalidateAdminCache(): isso
// marca um timestamp "sujo" que faz as páginas tratarem seus caches como obsoletos
// e rebuscarem na próxima montagem.

let _dirtyTs = 0;

/** Marca todos os caches do admin como obsoletos. Chamar após qualquer mutação. */
export function invalidateAdminCache() {
  _dirtyTs = Date.now();
}

/** Timestamp da última invalidação. Um cache é válido só se foi criado depois disso. */
export function adminDirtyTs(): number {
  return _dirtyTs;
}
