/**
 * Datos de costos de construcción en Lima extraídos de la Revista Costos
 * Ediciones Enero–Abril 2026.
 *
 * Fuentes:
 *   Revista Costos Nº (Enero 2026) — Tipología B: Edificio Multifamiliar 3 pisos 420 m²
 *   Revista Costos Nº (Febrero 2026) — Tipología H: Campamento Minero Ingenieros
 *   Revista Costos Nº (Marzo 2026)   — Tipología D: Losa Deportiva con iluminación
 *   Revista Costos Nº (Abril 2026)   — Tipología G: Campamento Minero Obreros
 *
 * IMPORTANTE: Los costos directos NO incluyen GG, Utilidad, IGV ni Honorarios.
 * Multiplicador para presupuesto con IGV: CD × 1.20 (GG+utilidad) × 1.18 (IGV) = × 1.416
 * Multiplicador para presupuesto sin IGV (desarrollador): CD × 1.20
 */

export const COSTOS_REVISTA = `
=== COSTOS DE CONSTRUCCIÓN LIMA 2026 — REVISTA COSTOS (Ene–Abr 2026) ===
=== Fuente oficial de referencia para el mercado peruano ===

──────────────────────────────────────────────────────────────
TIPOS DE CAMBIO MENSUALES 2026 (S/ por USD)
──────────────────────────────────────────────────────────────
• Enero 2026:   TC = S/ 3.368 / USD
• Febrero 2026: TC = S/ 3.355 / USD
• Marzo 2026:   TC = S/ 3.368 / USD
• Abril 2026:   TC = S/ 3.495 / USD

──────────────────────────────────────────────────────────────
COSTOS DIRECTOS POR TIPOLOGÍA — RESUMEN
──────────────────────────────────────────────────────────────
Solo incluyen costo directo de obra (materiales + mano de obra + equipos).
NO incluyen: GG del contratista, utilidad, IGV ni honorarios profesionales.

| Mes     | Tipología | Descripción                              | S//m²    | USD/m²  |
|---------|-----------|------------------------------------------|----------|---------|
| Ene 26  | B         | Edificio Multifamiliar 3 pisos (420 m²)  | 1,834.61 | 544.72  |
| Feb 26  | H         | Campamento Minero – Módulo Ingenieros    |   706.53 | 210.59  |
| Mar 26  | D         | Losa Deportiva con iluminación           |   218.40 |  64.85  |
| Abr 26  | G         | Campamento Minero – Módulo Obreros       |   734.28 | 210.09  |

──────────────────────────────────────────────────────────────
DESGLOSE COSTO DIRECTO — MULTIFAMILIAR TIPOLOGÍA B (Enero 2026)
Edificio Multifamiliar 3 pisos, área construida ~420 m²
──────────────────────────────────────────────────────────────
Partida                                        S//m²     % CD
─────────────────────────────────────────────────────────────
Trabajos provisionales / preliminares          67.82     3.7%
Movimiento de tierras                          38.72     2.1%
Concreto simple                                58.67     3.2%
Concreto armado (partida mayor)               517.62    28.2%  ← 28% del total
Estructuras de madera (encofrado)              47.58     2.6%
Muros y tabiques de albañilería               117.40     6.4%
Revoques y enlucidos                          145.82     7.9%
Cielorrasos                                    47.92     2.6%
Pisos y contrapisos                            91.65     5.0%
Carpintería de madera                         114.00     6.2%
Vidrios y cristales                            63.48     3.5%
Pintura                                        93.84     5.1%
Instalaciones sanitarias (total)              139.59     7.6%
Instalaciones eléctricas y mecánicas (total)  179.79     9.8%
─────────────────────────────────────────────────────────────
TOTAL COSTO DIRECTO                         1,834.61   100.0%
Equivalente en USD (TC S/ 3.368):             544.72 USD/m²

Notas del desglose:
• Concreto armado incluye: vigas, columnas, losas, muros estructurales, escaleras.
• Instalaciones eléctricas incluye: tableros, alimentadores, iluminación, CCTV básico.
• Instalaciones sanitarias incluye: agua fría/caliente, desagüe, aparatos sanitarios.
• Estructura de madera refiere al encofrado (no estructura permanente).
• Este desglose corresponde a acabados de nivel MEDIO-BÁSICO para NSE C/D Lima.

──────────────────────────────────────────────────────────────
COSTOS DIRECTOS CALIBRADOS — MULTIFAMILIAR LIMA 2026
Ajustes basados en Tipología B (Enero 2026) por altura y zona
──────────────────────────────────────────────────────────────

BASE: Edificio 3 pisos = 544.72 USD/m² costo directo (CD)

Por altura (complejidad estructural acumulada):
• 3 pisos (base Tipología B):   545 USD/m² CD
• 5–7 pisos (+15% complejidad): 627 USD/m² CD
• 8–10 pisos (+25%):            681 USD/m² CD
• 11–15 pisos (+35%):           736 USD/m² CD
• 15+ pisos (+45%):             790 USD/m² CD

Factor por zona/acabados (aplicar sobre CD según altura):
• Zona básica (SJL, VMT, Ate):            × 0.75
• Zona media (Surco, La Molina, Barranco):× 1.00 (base)
• Zona premium (Miraflores, San Isidro):  × 1.30 – 1.40 (mejores acabados, vidrios doble
                                           templado, HVAC, lobbies premium)

MULTIPLICADORES PARA PRESUPUESTO COMPLETO:
• CD × 1.20 = presupuesto contratista sin IGV (incluye GG 12% + utilidad 8%)
• CD × 1.20 × 1.18 = presupuesto con IGV (para comparación de cotizaciones formales)
• Multiplicador total con IGV: × 1.416

Ejemplo: Edificio 8 pisos en Miraflores
  CD = 681 USD/m² × 1.35 (factor premium) = 919 USD/m² CD
  Con GG+utilidad = 919 × 1.20 = 1,103 USD/m² (precio contratista)
  Con IGV = 919 × 1.416 = 1,301 USD/m²

──────────────────────────────────────────────────────────────
PRECIOS DE MATERIALES CLAVE (Lima, Enero 2026)
──────────────────────────────────────────────────────────────

ACERO CORRUGADO f'y = 4,200 kg/cm² Grado 60:
• Precio promedio en tonelada:   S/ 974.58/ton
• Varilla 3/8" (9.5 mm) × 9 m:  S/ 18.27/varilla
• Varilla 1/2" (12.7 mm) × 9 m: S/ 32.08/varilla
• Varilla 5/8" (15.9 mm) × 9 m: S/ 49.99/varilla
• Varilla 3/4" (19.1 mm) × 9 m: S/ 73.59/varilla

CEMENTO PORTLAND TIPO I (bolsa 42.5 kg):
• Rango Lima:   S/ 20.76 – S/ 30.93/bolsa
• Promedio:     ~S/ 24.00/bolsa
• Uso referencial: ~8 bolsas por m³ de concreto (mezcla 1:2:3 sin aditivos)

AGREGADOS (puesto en obra, Lima):
• Arena gruesa:      S/ 49.15/m³
• Piedra chancada:   S/ 46.61/m³

──────────────────────────────────────────────────────────────
TARIFAS DE MAQUINARIA Y EQUIPOS — TABLA COMPLETA
Fuente: Revista Costos Enero 2026, pp. 52–53 (Tarifa de Alquiler de Maquinaria)
Tarifas horarias en S/ al 31/12/2025. NO incluye IGV.
Incluyen: costo de posesión + costo de operación (combustible, lubricantes, operador).
──────────────────────────────────────────────────────────────

EXCAVADORAS (la selección depende de profundidad, suelo y espacio — ver guía abajo):
• Excavadora sobre llantas  58 HP  1.0 YD³:   S/ 162.80/hora  — urbana, suelo blando, maniobra fácil
• Excavadora sobre orugas  80–110 HP  0.5–1.3 YD³: S/ 202.70/hora  — 1 sótano, suelo medio
• Excavadora sobre orugas 115–165 HP  0.75–1.6 YD³: S/ 290.26/hora  — 1–2 sótanos, la MÁS COMÚN Lima
• Excavadora sobre orugas 170–250 HP  1.1–2.75 YD³: S/ 403.61/hora  — 2–3 sótanos, suelo duro
• Excavadora sobre orugas 325 HP  2.0–3.8 YD³: S/ 559.83/hora  — proyectos grandes, roca
• Minicargador 70 HP  0.5 YD³:   S/ 117.86/hora  — lotes estrechos, limpieza de fondo

CARGADORES Y TRACTORES:
• Cargador sobre llantas  80–95 HP:  S/ 177.36/hora
• Cargador sobre llantas 100–115 HP: S/ 198.02/hora
• Cargador sobre llantas 125–155 HP: S/ 234.88/hora
• Tractor sobre orugas  60–70 HP:   S/ 175.82/hora
• Tractor sobre orugas  75–100 HP:  S/ 205.48/hora
• Tractor sobre orugas 105–135 HP:  S/ 296.75/hora

VOLQUETES (transporte de desmonte):
• Volquete 4×2  8 m³  210–280 HP:  S/ 282.99/hora
• Volquete 6×4 10 m³  330 HP:      S/ 321.38/hora
• Volquete 6×4 12 m³  330 HP:      S/ 329.49/hora
• Volquete 6×4 15 m³  330 HP:      S/ 348.78/hora

IZAJE Y TRANSPORTE VERTICAL:
• Montacargas  5.0 ton:   S/ 120.81/hora
• Montacargas  7.5 ton:   S/ 144.33/hora

COMPACTACIÓN Y CONCRETO:
• Compactador vibratorio (plancha):  S/ 40.38/hora
• Vibrador de concreto:              S/  6.61/hora
• Compactador sobre llantas 81–100 HP: S/ 165.79/hora

──────────────────────────────────────────────────────────────
GUÍA DE SELECCIÓN DE EXCAVADORA — EDIFICIOS LIMA
(Lógica técnica para recomendar el equipo correcto)
──────────────────────────────────────────────────────────────

PASO 1 — Determinar profundidad de excavación:
  • 0 sótanos:  0–1.5 m → limpieza + cimentación superficial
  • 1 sótano:   3.0–4.5 m de profundidad (sótano vehicular H libre 2.10 m + losa + relleno)
  • 2 sótanos:  5.5–7.0 m de profundidad
  • 3 sótanos:  8.0–10.5 m de profundidad

PASO 2 — Evaluar tipo de suelo Lima:
  • Grava/roca dura (Miraflores, San Isidro, Surco): excavadora + martillo rompedor adjunto
  • Arena densa / gravas sueltas (zonas medias): excavadora estándar
  • Arena suelta / relleno (zonas costeras, Callao): cuidado con estabilidad de taludes; posible entibado

PASO 3 — Evaluar espacio disponible (ancho libre de trabajo):
  • < 10 m ancho:  minicargador complementario + winche vertical; maniobra limitada
  • 10–16 m:       excavadora estándar opera sin restricciones
  • > 16 m:        cualquier equipo; posible pareja de excavadoras en paralelo

PASO 4 — Evaluar vecindad (calzaduras):
  • Sin edificios vecinos:  excavación directa con talud 1:1 (o 1:0.5 en grava)
  • Edificios vecinos ≤ 5 m: calzadura tipo Berlín (pilotes H + planchas acero + relleno) — requiere equipo de perforación adicional (S/ 99/hora compresora)
  • Edificios en medianero: calzadura tradicional manual + perforación — proceso más lento

RECOMENDACIÓN POR ESCENARIO TÍPICO LIMA:

Caso 1 — LOTE PEQUEÑO (≤200 m²), 1 sótano, zona urbana:
  → Minicargador + Excavadora 80–110 HP (si cabe) o solo minicargador
  → Costo estimado: S/ 120–203/hora según equipo
  → Volquete 8 m³ para desmonte

Caso 2 — EDIFICIO TÍPICO (200–500 m²), 1–2 sótanos, Lima media:
  → Excavadora sobre orugas 115–165 HP  ← la más común en Lima para multifamiliar
  → Costo: S/ 290.26/hora
  → 2–3 volquetes 10 m³ para no parar la excavadora
  → Si hay calzadura Berlín: añadir compresora S/ 148–234/hora

Caso 3 — EDIFICIO GRANDE (>500 m²), 2–3 sótanos, zona premium:
  → Excavadora sobre orugas 170–250 HP
  → Costo: S/ 403.61/hora
  → Posiblemente martillo rompedor en Miraflores/San Isidro (grava muy densa)
  → 3–4 volquetes 12 m³

Caso 4 — TERRENO ROCOSO o excavación profunda >8 m:
  → Excavadora 325 HP + martillo rompedor
  → Costo: S/ 559.83/hora + equipo de perforación
  → Requiere estudio de suelos específico antes de cotizar

CÁLCULO DE VOLUMEN DE DESMONTE (para estimar horas y viajes):
  Volumen (m³) = Área planta libre (m²) × Profundidad excavación (m) × 1.25 (factor esponjamiento)
  Ejemplo: 250 m² × 6 m (2 sótanos) × 1.25 = 1,875 m³ de desmonte
  Horas excavadora 115 HP = 1,875 m³ / 40 m³/hora (rendimiento típico) = ~47 horas
  Costo excavación = 47 × S/ 290.26 = ~S/ 13,642

NOTA SOBRE COTIZACIONES DE EMPRESAS:
Si el usuario ha subido cotizaciones de empresas (CIEMSA, Grúas Atlas, Betondecken, etc.)
al KB del proyecto, esas cotizaciones tienen PRIORIDAD sobre los precios de referencia de
esta sección. Siempre buscar en base de conocimiento antes de usar estos valores de referencia.

──────────────────────────────────────────────────────────────
GRÚAS TORRE — REFERENCIA MERCADO LIMA 2026
(Nota: no listadas en Revista Costos; son equipos especializados en alquiler)
──────────────────────────────────────────────────────────────

Las grúas torre se contratan directamente con proveedores especializados.
Precios en USD/mes (incluye operador, montaje y desmontaje básico):

| Tipo                             | Capacidad  | Alcance | Costo/mes (USD) | Para edificios |
|----------------------------------|------------|---------|-----------------|----------------|
| Montacargas industrial           | 3–7.5 ton  | Vertical| S/ 120–144/hora | ≤ 6 pisos      |
| Grúa Torre Auto-ereccionable     | 1.5–2.5 ton| 25–30 m | $3,000–$4,500   | 6–10 pisos     |
|   (Potain Igo 15/21)             |            |         |                 |                |
| Grúa Torre Estándar              | 5 ton      | 45 m    | $5,500–$8,000   | 8–15 pisos     |
|   (Potain MC 85B o similar)      |            |         |                 |                |
| Grúa Torre Grande                | 8 ton      | 50 m    | $10,000–$15,000 | 15+ pisos      |
|   (Liebherr 280 EC-H o similar)  |            |         |                 |                |

Recomendación por altura de edificio:
• 1–6 pisos:   Montacargas industrial (S/ 120–144/hora) — sin necesidad de grúa torre
• 7–12 pisos:  Grúa torre auto-ereccionable ($3,000–$4,500/mes) — relación costo-beneficio óptima
• 13–18 pisos: Grúa torre estándar ($5,500–$8,000/mes) — necesario por radio de alcance
• 19+ pisos:   Grúa torre grande ($10,000–$15,000/mes) — proyectos premium o torres

Impacto en presupuesto (referencia para proyecto tipo 10 pisos, 14 meses de obra):
  Grúa estándar: $6,500/mes × 14 meses = ~$91,000 (incluir en imprevistos o línea aparte)

Proveedores principales Lima: CIEMSA, Grúas Atlas Perú, Equipark, distribuidores Manitowoc-Potain.
`
