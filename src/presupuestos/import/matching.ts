/**
 * Módulo AISLADO de matching de partidas (código + fuzzy por texto).
 * A propósito no depende de nada del resto: se puede reemplazar por embeddings
 * semánticos más adelante sin tocar el flujo de import.
 */

/** Normaliza texto para comparar: minúsculas, sin tildes, sin puntuación, espacios colapsados. */
export function normalizar(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/[^a-z0-9\s]/g, ' ')                     // quita puntuación
    .replace(/\s+/g, ' ')
    .trim()
}

/** Distancia de edición de Levenshtein (iterativa, memoria O(min)). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => i)
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]
    dp[0] = j
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i]
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1])
      prev = tmp
    }
  }
  return dp[m]
}

/** Similitud 0..1: mezcla Levenshtein normalizado (60%) + Jaccard de tokens (40%). */
export function similitud(a: string, b: string): number {
  const na = normalizar(a), nb = normalizar(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const lev = 1 - levenshtein(na, nb) / Math.max(na.length, nb.length)
  const ta = new Set(na.split(' ')), tb = new Set(nb.split(' '))
  const inter = [...ta].filter((t) => tb.has(t)).length
  const uni = new Set([...ta, ...tb]).size
  const jacc = uni ? inter / uni : 0
  return Math.max(0, Math.min(1, 0.6 * lev + 0.4 * jacc))
}

export interface CatalogoItem { id: string; codigo: string; descripcion: string; unidad: string }
export type MatchTipo = 'codigo' | 'texto' | 'nuevo'
export interface MatchResultado {
  tipo: MatchTipo
  partidaId: string | null
  codigoCatalogo: string | null
  descripcionCatalogo: string | null
  unidadCatalogo: string | null
  confianza: number // 0..1
}

/**
 * Encuentra la mejor coincidencia de una partida (del Excel) contra el catálogo de C4.
 *  1) match exacto por código → confianza 1
 *  2) fuzzy por descripción ≥ umbral → sugerencia con su confianza
 *  3) sin match razonable → "nueva"
 */
export function matchPartida(
  codigo: string,
  descripcion: string,
  catalogo: CatalogoItem[],
  umbral = 0.62,
): MatchResultado {
  const cod = (codigo || '').trim().toLowerCase()

  // Mejor coincidencia por texto (se necesita igual, también para corroborar el código).
  let mejor: CatalogoItem | null = null, mejorSim = 0
  for (const c of catalogo) {
    const s = similitud(descripcion, c.descripcion)
    if (s > mejorSim) { mejorSim = s; mejor = c }
  }

  // 1) Código exacto, pero CORROBORADO por la descripción. Cada empresa usa su propia numeración,
  //    así que un código igual con descripción muy distinta es una COLISIÓN, no un match real.
  if (cod) {
    const porCod = catalogo.find((c) => c.codigo.trim().toLowerCase() === cod)
    if (porCod && (!descripcion || similitud(descripcion, porCod.descripcion) >= 0.45)) {
      return { tipo: 'codigo', partidaId: porCod.id, codigoCatalogo: porCod.codigo, descripcionCatalogo: porCod.descripcion, unidadCatalogo: porCod.unidad, confianza: 1 }
    }
  }

  // 2) Fuzzy por texto.
  if (mejor && mejorSim >= umbral) {
    return { tipo: 'texto', partidaId: mejor.id, codigoCatalogo: mejor.codigo, descripcionCatalogo: mejor.descripcion, unidadCatalogo: mejor.unidad, confianza: +mejorSim.toFixed(2) }
  }
  return { tipo: 'nuevo', partidaId: null, codigoCatalogo: null, descripcionCatalogo: null, unidadCatalogo: null, confianza: +mejorSim.toFixed(2) }
}
