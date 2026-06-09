/**
 * Extracto estructurado del Reglamento Nacional de Edificaciones (RNE) del Perú
 * para proyectos residenciales multifamiliares en Lima.
 *
 * Fuentes:
 *   A.010 — Condiciones Generales de Diseño (RM N° 191-2021-VIVIENDA)
 *   A.020 — Vivienda (RM N° 188-2021-VIVIENDA)
 *   A.130 — Requisitos de Seguridad (DS N° 017-2012-VIVIENDA)
 *   E.030 — Diseño Sismorresistente (RM N° 043-2019-VIVIENDA)
 *   E.060 — Concreto Armado (DS N° 010-2009-VIVIENDA)
 */

export const RNE_CONTEXTO = `
=== REGLAMENTO NACIONAL DE EDIFICACIONES (RNE) — PERÚ ===
=== Aplicable a edificios residenciales multifamiliares en Lima ===

──────────────────────────────────────────────────────────────
NORMA A.010 — CONDICIONES GENERALES DE DISEÑO (2021)
──────────────────────────────────────────────────────────────

ALTURAS MÍNIMAS DE AMBIENTES (Art. 18)
• Altura libre mínima piso terminado → cielo raso: 2.30 m (uso residencial)
• Baños y servicios higiénicos: 2.10 m mínimo
• Depósitos, cuartos técnicos, instalaciones mecánicas: 2.00 m mínimo
• Vigas u otros elementos horizontales: libre mínimo 2.10 m sobre piso
• Cada piso residencial = máx 3.00 m para cálculo de altura de edificación
• Cada piso comercial = máx 4.00 m para cálculo de altura

VANOS — PUERTAS (Art. 19)
• Altura mínima de vano: 2.10 m
• Acceso principal al departamento: 0.90 m de ancho libre
• Dormitorios, sala, comedor, cocina: 0.80 m mínimo
• Baños y servicios: 0.70 m mínimo
• Acceso principal a edificio multifamiliar: 1.20 m mínimo

PASAJES Y CIRCULACIONES (Art. 13 A.010 / Art. 13 A.020)
• Interior del departamento (entre ambientes): 0.90 m mínimo
• Pasaje que sirve hasta 2 viviendas: 1.00 m mínimo
• Pasaje que sirve hasta 4 viviendas: 1.20 m mínimo
• Áreas comunes de acceso a las viviendas: 1.20 m mínimo
• Escaleras integradas (edificio): 1.00 m mínimo (incluyendo pasamanos)
• Escaleras protegidas: 1.20 m libre entre paramentos

ESTACIONAMIENTOS PRIVADOS — VIVIENDA (Art. 53-54 A.010)
• Cajón individual: 2.70 m ancho × 5.00 m largo × 2.10 m altura libre
• 2 cajones contiguos: 2.50 m ancho c/u × 5.00 m largo
• 3 o más cajones contiguos: 2.40 m ancho c/u × 5.00 m largo
• Estacionamiento en paralelo: 2.40 m ancho × 5.40 m largo
• Rampa de acceso a sótanos: pendiente máxima 15%
• Ingreso vehicular mínimo (vivienda): 2.50 m ancho × 3.00 m alto
• Ingreso vehicular mínimo (comercio): 3.25 m ancho × 4.50 m alto
• Ventilación sótano: ductos 0.036 m²/inodoro por piso; mínimo 0.24 m²

VOLADIZOS Y RETIROS (Art. A.010)
• Voladizos sobre retiro frontal: máx 0.50 m a partir de 2.30 m de altura

──────────────────────────────────────────────────────────────
NORMA A.020 — VIVIENDA (2021)
──────────────────────────────────────────────────────────────

DENSIDAD HABITACIONAL (Art. 7)
• 1 dormitorio → 2 personas
• 2 dormitorios → 3 personas
• 3 dormitorios → 4 personas
• Más de 3 dormitorios (multifamiliar) → 1 persona adicional por dormitorio extra

DIMENSIONES MÍNIMAS POR AMBIENTE (práctica Lima, basado en habitabilidad RNE)
• Dormitorio principal: 9.0 m² mínimo, frente libre mínimo 2.70 m
• Dormitorio secundario doble: 7.5 m² mínimo, frente libre mínimo 2.40 m
• Dormitorio simple: 6.0 m² mínimo, frente libre mínimo 2.40 m
• Sala: 12.0 m² mínimo
• Comedor: 8.0 m² mínimo (sala+comedor integrados: 18.0 m²)
• Cocina: 5.5 m² mínimo, ancho libre entre muebles contrapuestos: 1.10 m
• Lavandería / patio de servicio: 2.5 m² mínimo
• Baño completo (inodoro + lavatorio + ducha): 3.0 m² mínimo
• Baño simple (inodoro + ducha): 2.0 m² mínimo
• Hall / vestíbulo de departamento: 1.5 m² mínimo

SERVICIOS SANITARIOS (Art. 23 A.020)
• Vivienda hasta 25 m²: 1 inodoro + 1 ducha + 1 lavadero
• Vivienda mayor a 25 m²: 1 inodoro + 1 lavatorio + 1 ducha + 1 lavadero
• Departamentos deben tener medidores individuales de agua y luz

ILUMINACIÓN Y VENTILACIÓN NATURAL (Art. 11)
• Dormitorios, sala, comedor, cocina: iluminación y ventilación natural obligatoria
• Baños, depósitos, halls, sótanos: pueden ventilar por ductos o mecánicamente
• Pozo de luz mínimo: dormitorio/sala/comedor: 2.00 m perpendicular mínimo
• Pozo de luz mínimo: cocina/patio servicio: 1.80 m perpendicular mínimo
• Para edificios hasta 18 m: pozo = 30% de la altura más baja del paramento (dormitorios)
• Para edificios 19-36 m: tramo adicional suma 15% adicional

ESCALERAS EN EDIFICIOS MULTIFAMILIARES (Art. 15)
• Escalera integrada: permitida hasta que el 5to piso quede a ≤ 12.00 m sobre nivel ingreso
• Escalera protegida (a prueba de fuego): requerida cuando el 5to piso está a > 12.00 m
• Escalera protegida con vestíbulo previo: para edificios > 30 m
• Resistencia al fuego: hasta 15 m → 60 min; 15-72 m → 120 min; > 72 m → 180 min
• Acceso al techo/azotea (uso técnico): escalera tipo gato permitida
• Ascensores: obligatorios en edificios que excedan 7 pisos desde nivel de acceso
• Distancia máx recorrido evacuante (escalera integrada): 56 m sin rociadores / 71 m con rociadores

PROTECCIÓN CONTRA INCENDIOS — MULTIFAMILIAR (Cuadro 9 A.020)
• Hasta 15.00 m: señalética + detectores humo + extintores + red agua + escalera protegida opción 11/12/13
• 15.01 a 30.00 m: + central alarma incendios + bomba contra incendios
• 30.01 a 60.00 m: + rociadores automáticos + bomba certificada + cisterna reserva
• Más de 60.00 m: + rociadores totales + mínimo 2 escaleras protegidas
• Notas: un edificio 10 pisos × 2.80 m/piso = 28 m → rango 15-30 m; con piso técnico puede llegar a 30+ m

TABIQUERÍA ENTRE DEPARTAMENTOS
• Resistencia al fuego mínima: 60 minutos entre unidades de vivienda
• Tabiques entre zona no cubierta: mínimo 2.10 m desde piso terminado

──────────────────────────────────────────────────────────────
NORMA E.030 — DISEÑO SISMORRESISTENTE (2019) — LIMA
──────────────────────────────────────────────────────────────

PARÁMETROS SÍSMICOS — LIMA METROPOLITANA
• Zona sísmica: Zona 4 → Factor Z = 0.45 (mayor sismicidad del Perú)
• Categoría edificaciones residenciales: C (comunes) → Factor U = 1.0
• Factor de amplificación sísmica máxima: C = 2.5

PERFILES DE SUELO EN LIMA (más frecuentes)
• Miraflores / San Isidro / San Borja (roca y grava): Perfil S1 → S=1.00, Tp=0.4s, TL=2.5s
• Surco / La Molina / Barranco (suelo intermedio): Perfil S2 → S=1.05, Tp=0.6s, TL=2.0s
• San Miguel / Magdalena / Jesús María (arena/relleno): Perfil S2-S3 → S=1.10-1.15, Tp=0.6-1.0s
• Zonas costeras/relleno (Callao, borde mar): Perfil S3 → S=1.10, Tp=1.0s, TL=1.6s
• Estudio de suelos específico obligatorio para todos los proyectos

SISTEMAS ESTRUCTURALES RECOMENDADOS (Art. 16-18)
• Muros de concreto armado: Ro = 6 (más común Lima, alta rigidez lateral)
• Sistema dual (pórtico + muros): Ro = 7 (buena alternativa)
• Pórticos de concreto: Ro = 8 (solo planta libre, requiere más sección)
• Muros de albañilería confinada: Ro = 3 (hasta ~5 pisos en Lima)

SEPARACIÓN SÍSMICA ENTRE EDIFICIOS (Art. 33)
• Mínimo s = 0.006 × h (h = altura del edificio en metros), mínimo 3 cm
• Edificio 28 m → s ≥ 0.006 × 28 = 0.168 m → mínimo 17 cm de separación

──────────────────────────────────────────────────────────────
NORMA E.060 — CONCRETO ARMADO (referencias prácticas Lima)
──────────────────────────────────────────────────────────────

PREDIMENSIONAMIENTO ESTRUCTURAL (referencias prácticas Lima)
• Losa maciza: espesor = L/40 (L = luz mayor del paño en m); mínimo 10 cm
• Losa aligerada unidireccional: espesor = L/25; común 20 cm (4+12+4) o 25 cm
• Losa aligerada bidireccional: espesor = L/35 a L/45
• Viga principal: peralte = L/10 a L/12; ancho = peralte/2 (mínimo 25 cm)
• Viga secundaria: peralte = L/14 a L/16
• Columna: dimensión mínima 25 cm; típica Lima = √(P/0.45f'c)
• Muro de concreto: espesor mínimo 10 cm; típico 15-20 cm en vivienda
• Cimentación: profundidad mínima 0.80 m bajo nivel de piso terminado
• Resistencia concreto estructural: f'c = 210 kg/cm² (21 MPa) mínimo en Lima
• Acero de refuerzo: fy = 4200 kg/cm² (Grado 60)

SÓTANOS — MUROS DE CONTENCIÓN
• Muro sótano: espesor = H/12 a H/15 (H = altura libre del sótano)
• Sótano H=2.50 m → muro ~20-25 cm de espesor
• Impermeabilización obligatoria en sótanos; drenaje perimetral recomendado
• Altura libre mínima sótano vehicular: 2.10 sección limpia (A.010)

──────────────────────────────────────────────────────────────
PARÁMETROS URBANÍSTICOS TÍPICOS — DISTRITOS LIMA (REFERENCIA)
──────────────────────────────────────────────────────────────

ESTACIONAMIENTOS (ratio mínimo por normativa municipal Lima)
• Zona residencial R4/R6/R8: 1 plaza/departamento (normativa base)
• Miraflores, San Isidro: pueden exigir 1.5-2 plazas/depto según ordenanza
• Proyectos con área vendible >80 m²: generalmente 1 plaza/depto
• Proyectos sociales/VIS: puede reducirse a 0.5 plaza/depto con autorización

ALTURAS Y SISTEMAS DE REFERENCIA
• 1 piso residencial = 2.70-3.00 m de piso a piso (tipico Lima: 2.80 m)
• Sótano vehicular típico: 2.80-3.00 m libre de piso a fondo de viga
• Azotea: no cuenta como piso pero sí en altura total
• Edificio 10 pisos = aprox 28-30 m de altura total (sin azotea técnica)

TIPOLOGÍAS DEPARTAMENTOS — PRECIOS LIMA 2025-2026 (referencia mercado)
• Flat 1 dorm (~40-55 m²): USD 1,800-2,500/m² (zona premium), 1,200-1,800 (zona media)
• Flat 2 dorm (~60-80 m²): USD 1,800-2,800/m²
• Flat 3 dorm (~90-120 m²): USD 2,000-3,200/m²
• Dúplex / penthouse: +20-30% sobre precio piso estándar
• Distritos premium (Miraflores, San Isidro): USD 2,500-4,500/m²
• Distritos consolidados (Surco, La Molina, San Borja): USD 1,800-2,800/m²
• Distritos emergentes (Jesús María, Magdalena, Barranco): USD 1,500-2,200/m²
`
