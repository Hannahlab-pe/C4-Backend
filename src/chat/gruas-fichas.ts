/**
 * Fichas técnicas de grúas torre disponibles en el mercado peruano.
 * Datos extraídos de fichas técnicas oficiales de fabricantes (2025).
 *
 * Fuentes:
 *   JASO J4510 / J5010 — fichas oficiales JASO (España)
 *   Potain MC85B (City Crane) — ficha Manitowoc
 *   Potain MC175C — ficha ETAC Peru (distribuidor Lima)
 *   Potain MCi 85 A/B — ficha Manitowoc
 *   Liebherr 50 EC-B 8 Litronic — ficha Liebherr (también designado 150 ECB 8)
 *   Liebherr 85 EC-B 5 FR.tronic — ficha Liebherr
 *   DAHAN FT-DH4515 — ficha técnica DAHAN
 *   GJJ QP5613-6T — ficha GJJ Jing Long
 *   IT GT4210 — ficha técnica
 */

export const GRUAS_FICHAS_TECNICAS = `
=== FICHAS TÉCNICAS DE GRÚAS TORRE — MERCADO PERUANO ===
=== Datos para selección y pre-inversión en edificios Lima ===

──────────────────────────────────────────────────────────────
TABLA RESUMEN — TODOS LOS MODELOS
──────────────────────────────────────────────────────────────

| Modelo              | Fabricante  | Pluma máx (m) | Carga máx (kg) | Carga punta (kg) | Altura máx (m) | Tipo         | Base (m)     |
|---------------------|-------------|---------------|----------------|------------------|----------------|--------------|--------------|
| J4510               | JASO        | 45            | 2,500          | 1,000            | 49.1           | Convencional | 3.8 – 4.5    |
| J5010               | JASO        | 50            | 2,500          | 1,000            | 49.1           | Convencional | 3.8 – 4.5    |
| MC85B               | Potain      | 50            | 5,000          | 1,300            | 54.1           | City Crane   | 3.2 × 3.2   |
| MCi 85 A/B          | Potain      | 51.5          | 5,000          | 1,300            | 65.5           | City Crane   | 3.2 × 3.2   |
| MC175C              | Potain      | 60            | 8,000          | 1,500            | 182+           | Convencional | 4.5 × 4.5   |
| 50 EC-B 8 (150 ECB) | Liebherr    | 60            | 8,000          | 1,500            | 63.9           | Convencional | 6.0 – 8.0    |
| 85 EC-B 5 FR.tronic | Liebherr    | 50            | 5,000          | 1,300            | 47.4           | Convencional | 3.0 – 3.8    |
| FT-DH4515           | DAHAN       | 45            | 6,000          | 1,500            | 43.3           | Convencional | n/d          |
| QP5613-6T           | GJJ         | 56            | 6,000          | 1,300            | 160 (trepadora)| Convencional | n/d          |
| GT4210              | IT          | 42            | 7,500          | 1,000            | ~50            | Convencional | n/d          |
| S-46 4T             | SÁEZ        | 46            | 4,000          | 1,000            | 63.4           | Convencional | 1.2 (M39)/1.7 (M45) |
| MC 68 B             | Potain      | 45            | 3,000          | 1,000            | 42.1           | City Crane   | 3.8 / 2.8    |
| MC 125              | Potain      | 60            | 6,000          | 1,150            | 44             | Convencional | cruceta 4.5  |
| MC 175B             | Potain      | 60            | 8,000          | 1,400            | 44             | Convencional | cruceta 4.5  |
| MC 205B             | Potain      | 60            | 10,000         | 2,400            | 64.7           | Convencional | 4.5 / 6      |
| MCH 125             | Potain      | 50            | 8,000          | 2,000            | n/d            | Luffing (abatible) | 6 / 1.6 |
| MCR 160             | Potain      | 51            | 10,000         | 2,400            | n/d            | Luffing (abatible) | 6     |
| MCT 85 F5           | Potain      | 52            | 5,000          | 1,100            | 47.6           | Flat-top     | cruceta 3.8  |
| MCT 185 J8          | Potain      | 65            | 8,000          | 1,500            | 61.3           | Flat-top     | 4.5 / 6      |

──────────────────────────────────────────────────────────────
CURVAS DE CARGA DETALLADAS
──────────────────────────────────────────────────────────────

■ JASO J4510 — (Pluma 45 m, SR2 = 2,500 kg)
  Radio (m):   20    25    30    35    40    45
  Carga (kg):  2500  2500  2500  2000  1500  1000
  Carga máx: 2,500 kg · Potencia total: 25.1 kW
  Base BTX 38/BTX 45 → footprint 3.8 m ó 4.5 m
  Altura máx sin arriostrar: 49.1 m (según base y torre)

■ JASO J5010 — (Pluma 50 m, SR2 = 2,500 kg)
  Radio (m):   20    25    30    35    40    45    50
  Carga (kg):  2500  2200  1800  1515  1300  1135  1000
  Carga máx: 2,500 kg · Potencia total: 26.6 kW
  Base BTX 38/BTX 45 → footprint 3.8 m ó 4.5 m
  Altura máx sin arriostrar: 49.1 m
  Diferencia clave vs J4510: +5 m de pluma, mayor alcance para solares más anchos

■ Potain MC85B — City Crane (Pluma 50 m)
  Radio (m):   3.2   20    25    26.7  30    35    45    50
  Carga (kg):  5000  3900  3000  2500  2200  1900  1600  1300
  Carga máx: 5,000 kg · Potencia: 30–35 kVA
  Base mínima ZFC: 3.2 × 3.2 m — ÓPTIMO PARA SITIOS URBANOS ESTRECHOS
  Altura máx: hasta 54.1 m (con mástil BA45A sin arriostrar)
  Clasificación: City Crane = diseñado para entornos urbanos, poco espacio de maniobra

■ Potain MCi 85 A/B — City Crane compacta (Pluma 51.5 m)
  Radio (m):   20    25    30    35    40    45    51.5
  Carga (kg):  3900  3000  2500  2200  1900  1600  1300
  Carga máx: 5,000 kg
  Altura máx bajo gancho: 65.5 m (con mástil)
  Base: 3.2 × 3.2 m (igual que MC85B)
  Versión electrónica avanzada de la MC85B

■ Potain MC175C (Pluma 60 m) — Distribuidor Lima: ETAC Peru
  Radio (m):   25    30    35    40    45    50    55    60
  Carga (kg):  4800  4300  3300  2800  2400  2100  1700  1500
  Carga máx: 8,000 kg · Potencia: 54–64 kVA (motor 50 LVF ó 60 LVF)
  Base SB16A: 4.5 × 4.5 m | Base VB20A: 6 × 6 m
  Altura sin arriostrar: hasta 44.9 m (SB16A) ó 63.9 m (VB20A)
  Con arriostres: hasta 182+ m
  Fabricante Potain, distribuidor exclusivo Lima: ETAC PERU S.A.C.
  Dirección: Av. El Sol Mz. J1 Lt. 1B, V.E.S. – Lima · Telf.: (51-1) 717-2378 / 717-2379
  Web: www.etacperu.com.pe

■ Liebherr 50 EC-B 8 Litronic (también llamado 150 ECB 8) — (Pluma 60 m)
  Radio (m):   24.4   30    35    40    45    50    55    60
  Carga (kg):  7000   5550  4650  3950  3300  2600  2000  1500
  Carga máx: 8,000 kg · Potencia: 37 kW FU
  Configuraciones torre: 120HC (altura 45.8 m), 185HC (56.8 m), 256HC (63.9 m)
  Footprint carriage: 6.0 m (120HC/185HC) u 8.0 m (256HC)
  Norma: EN 14439:2009 – C25
  Curva adicional FR.tronic (LM2) con 60m pluma:
    Radio (m):   24.4   30    35    40    45    50    60
    Carga (kg):  8000   5830  5420  4900  4080  3190  1700

■ Liebherr 85 EC-B 5 FR.tronic — (Pluma 50 m)
  Radio (m):   20    25    30    35    40    45    50
  Carga (kg):  4150  4150  3150  2500  2000  1600  1300
  Carga máx: 5,000 kg · Potencia: 24 kW FU (31 kVA)
  Base: 3.0 m (estacionaria) ó 3.8 m
  Altura máx con 85LC: hasta 47.4 m (sin arriostrar)
  Footprint mínimo: 3.0 × 3.0 m — compacta para lotes estrechos

■ DAHAN FT-DH4515 — (Pluma 45 m)
  Radio (m):   30    35    40    45
  Carga (kg):  3500  2800  2100  1500
  Carga máx: 6,000 kg · Altura máx: ~43.3 m
  Origen: China (fabricante DAHAN)

■ GJJ QP5613-6T — (Pluma 56 m) — Grúa trepadora
  Radio (m):   21    40    56
  Carga (kg):  6000  3000  1300
  Carga máx: 6,000 kg · Altura máx: hasta 160 m (trepadora interna)
  Fabricante: GJJ / Jing Long Eng. Machinery Co., Ltd.
  Apta para edificios muy altos con sistema self-climbing

■ IT GT4210 — (Pluma 42 m)
  Configuraciones de pluma: 30m, 36m, 40m, 42m
  Pluma 42m: Carga máx 7,500 kg | Carga en punta: 1,000 kg
  Pluma 30m: Carga máx 7,500 kg | Carga en punta: 1,850 kg
  Potencia: motor 1f=9kW, 2f=11kW, 3f=13kW, 4f=19kW
  CEI 38 / IEC 38 → 25–32 kVA (400V / 50Hz)

■ SÁEZ S-46 4T — (Pluma 46 m) — Fabricante SÁEZ Cranes (España)
  Curva de carga — caída sencilla (máx 2,500 kg):
    Radio (m):   12    21    23.6  27    30    33    35.5  39    41    43    46
    Carga (kg):  2500  2460  2110  1840  1630  1560  1420  1300  1200  1100  1000
  Curva de carga — doble caída (máx 4,000 kg):
    Radio (m):   12.8  15    18    21    23.6  27    30    33    35.5  39    43    46
    Carga (kg):  4000  2970  2580  2270  2030  1750  1550  1360  1220  1050  920   850
  Carga máx: 4,000 kg · Carga en punta (46m): 1,000 kg (sencilla) / 850 kg (doble)
  Configuraciones de pluma: 23.6m, 30m, 35.5m, 41m, 46m
  Altura máx bajo gancho autoestable: hasta 63.4 m (mástil S60R/16); configs 57.5 / 53.7 / 49.7 m
  Altura de elevación (cable): 240–265 m · Motor elevación: 25 Hp (18.5 kW) ó 15 Hp (11 kW)
  Mástil: M39 (1.20 m) ó M45 (1.70 m) · Norma DIN/FEM 1001-87, UNE 58-101-92, CE
  Viento fuera de servicio: 150 km/h (Windzone A-B / DIN 15019)
  Perfil: convencional compacta, 4 ton con buen alcance (46m) — ideal edificios 10–18 pisos
  en lotes medianos; mástil angosto (1.20 m) apto para entornos urbanos.

──────────────────────────────────────────────────────────────
GAMA POTAIN MC — Distribuidor Lima: ETAC (Grúas & Equipos Cruz del Sur)
──────────────────────────────────────────────────────────────

■ Potain MC 68 B — City Crane (Pluma 45 m)
  Radio (m):   20    25    30    35    40    45
  Carga (kg):  3000  2350  1900  1550  1300  1000
  Carga máx: 3,000 kg (2 caída) / 2,500 kg (config sencilla) · Carga en punta (45m): 1,000 kg
  Configuraciones de pluma: 20, 25, 30, 35, 40, 45 m
  Altura máx bajo gancho autoestable: 42.1 m (■) / 32.9 m (□) · Ht = H + 5.9 m
  Base: 3.8 × 3.8 m (ó 2.8 × 2.8 m) — City Crane compacta
  Perfil: la más chica de la gama MC — ideal edificios 4–8 pisos, lotes pequeños.

■ Potain MC 125 — (Pluma 60 m)
  Radio (m):   30    40    50    55    60
  Carga (kg):  3700  2900  2200  1600  1150
  Carga máx: 6,000 kg · Carga en punta (60m): 1,150 kg
  Configuraciones de pluma: 30, 40, 50, 55, 60 m
  Altura máx bajo gancho autoestable: 44 m / 41.9 m · Hl = H + 8.5 m
  Base: cruceta empotrada ~4.5 m (mástil 1.6 × 1.6 m)
  Perfil: convencional intermedia — edificios 10–15 pisos, lotes medianos. 6 ton, buen alcance.

■ Potain MC 175B — (Pluma 60 m)
  Radio (m):   25    30    35    40    45    50    55    60
  Carga (kg):  6700  5200  4300  4000  3500  2700  1900  1400
  Carga máx: 8,000 kg · Carga en punta (60m): 1,400 kg
  Configuraciones de pluma: 25, 30, 35, 40, 45, 50, 55, 60 m
  Altura máx bajo gancho autoestable: 44 m / 44.9 m · Ht = h + 8.5 m
  Base: cruceta empotrada ~4.5 m (mástil 1.6 × 1.6 m)
  Perfil: 8 ton con 60m de alcance — edificios 12–18 pisos, cargas pesadas (prefabricados, baldes grandes).
  Versión B de la MC175 (la MC175C es la evolución posterior, también en catálogo ETAC).

■ Potain MC 205B — (Pluma 60 m)
  Radio (m):   30    35    40    45    50    55    60
  Carga (kg):  5100  4700  4000  3500  3000  2700  2400
  Carga máx: 10,000 kg · Carga en punta (60m): 2,400 kg
  Configuraciones de pluma: 30, 35, 40, 45, 50, 55, 60 m
  Altura máx bajo gancho autoestable: hasta 64.7 m (según mástil: 38.7 / 59.7 / 39.7 / 64.7) · Hl = H + 10.1 m
  Base: 4.5 m (mástil 1.6 m) ó 6 m (mástil 2 × 2 m)
  Perfil: 10 ton, alta capacidad en punta (2.4t a 60m) — edificios 15–25 pisos, cargas muy pesadas.

■ Potain MCH 125 — PLUMA ABATIBLE / LUFFING (Pluma 50 m)
  Radio (m):   30.2  35.1  40.1  45    50
  Carga (kg):  5000  4000  3200  2500  2000
  Carga máx: 8,000 kg · Carga en punta (50m horizontal): 2,000 kg · Elevada (35.7m): 4,000 kg
  Configuraciones de pluma: 30.2, 35.1, 40.1, 45, 50 m
  Base: 2 × 2 m (cruceta 6 m) ó 1.6 × 1.6 m
  Perfil: LUFFING (pluma abatible) — IMPRESCINDIBLE en lotes con vecinos altos/medianeros muy
  cercanos o donde NO se puede girar la pluma sobre propiedad vecina o vía pública. Reduce el
  radio de barrido elevando la pluma. 8 ton. Edificios medios en entornos muy congestionados.

■ Potain MCR 160 — PLUMA ABATIBLE / LUFFING (Pluma 51 m)
  Radio (m):   30    35    40    45    50
  Carga (kg):  6500  5000  4200  3200  2400
  Carga máx: 10,000 kg · Carga en punta (50m horizontal): 2,400 kg · Elevada (21m): 10,000 kg
  Configuraciones de pluma: 30, 35, 40, 45, 50, 51 m
  Base: 2 × 2 m (cruceta 6 m) ó 1.6 × 1.6 m
  Perfil: LUFFING pesada (10 ton) — la opción para sitios congestionados que además requieren
  izajes pesados. Mismo principio que MCH 125 pero con 10 ton de capacidad.

■ Potain MCT 85 F5 — FLAT-TOP / sin torreta (Pluma 52 m)
  Radio (m):   20    30    40    45    50    52
  Carga (kg):  3950  2700  1900  1650  1400  1100
  Carga máx: 5,000 kg · Carga en punta (52m): 1,100 kg
  Configuraciones de pluma: 20, 30, 40, 45, 50, 52 m
  Altura máx bajo gancho autoestable: 47.6 m · Base: cruceta 3.8 m (mástil 1.2 × 1.2 m)
  Perfil: FLAT-TOP (topless, sin pico) — montaje/desmontaje rápido y seguro, ideal cuando hay
  varias grúas en obra (menos interferencia entre plumas) o restricción de altura de gálibo.
  5 ton, mástil muy compacto (1.2m) — edificios 8–15 pisos en lotes urbanos.

■ Potain MCT 185 J8 — FLAT-TOP / sin torreta (Pluma 65 m)
  Radio (m):   29.7  34.7  39.7  45    50    55    60    65
  Carga (kg):  5800  4900  4000  3700  3000  2500  2000  1500
  Carga máx: 8,000 kg · Carga en punta (65m): 1,500 kg
  Configuraciones de pluma: 29.7, 34.7, 39.7, 45, 50, 55, 60, 65 m
  Altura máx bajo gancho autoestable: hasta 61.3 m (según mástil: 47.7 / 59.7 / 45.6 / 61.3) · Hl = H + 8 m
  Base: 4.5 m (mástil 1.6 m) ó 6 m (mástil 2 × 2 m)
  Perfil: FLAT-TOP de gran alcance (65m) y 8 ton — edificios 15–20 pisos en terrenos grandes;
  ventaja flat-top para obras multi-grúa y montaje ágil.

──────────────────────────────────────────────────────────────
GUÍA DE SELECCIÓN PARA PROYECTOS EN LIMA
──────────────────────────────────────────────────────────────

EDIFICIOS 5–10 PISOS (aprox. 15–35 m altura):
  → Potain MC85B o JASO J4510
  → Razones: City Crane (MC85B) ocupa solo 3.2×3.2m; JASO J4510 es económica y robusta
  → Radio útil: 30–45 m; carga típica Lima cubierta (2–2.5 ton)
  → Mejor opción lote estrecho (<12 m frente): MC85B (City Crane)

EDIFICIOS 10–15 PISOS (aprox. 35–50 m altura):
  → JASO J5010 o Potain MC85B (o MCi 85 A/B)
  → Radio hasta 50 m; altura bajo gancho ~49–54 m cubre pisos 12–15
  → J5010 más económica; MCi 85 A/B más tecnología y altura
  → Si el lote es ≥12 m frente: J5010 alcanza más con menor costo

EDIFICIOS 15–20 PISOS (aprox. 50–70 m altura):
  → Liebherr 85 EC-B 5 FR.tronic o Potain MCi 85 A/B
  → Altura bajo gancho: hasta 47–65 m
  → Para cargas pesadas (> 3.5 ton en obra): Liebherr 50 EC-B 8 (8 ton carga máx)

EDIFICIOS 20+ PISOS o CARGAS PESADAS (> 5 ton):
  → Liebherr 50 EC-B 8 Litronic (8,000 kg, hasta 63.9 m) o Potain MC175C (8,000 kg, hasta 182 m)
  → MC175C con sistema self-climbing para torres muy altas
  → GJJ QP5613-6T para edificios que superan 60 pisos (trepadora interna, hasta 160 m)

LOTES ESTRECHOS (<12 m de frente, Lima urbana):
  → Primera opción: Potain MC85B o MCi 85 A/B (base 3.2×3.2 m)
  → Segunda opción: Liebherr 85 EC-B 5 (base desde 3.0×3.0 m)
  → Evitar: J4510/J5010 (base 3.8–4.5 m puede interferir con retiros o vecinos)

──────────────────────────────────────────────────────────────
CRITERIOS TÉCNICOS DE SELECCIÓN
──────────────────────────────────────────────────────────────

RADIO MÍNIMO REQUERIDO:
  → Fórmula: R_min = diagonal_edificio / 2 + 5 m (margen de seguridad)
  → Diagonal = √(frente² + fondo²)
  → Ejemplo: edificio 20×15m → diagonal = √(400+225) = 25 m → radio = 17.5 m (J4510 a 20m lo cubre)
  → Para terreno grande: edificio 30×25m → diagonal = 39 m → radio = 24.5 m → usar J5010 o MC85B (50m disponibles)

ALTURA MÍNIMA BAJO GANCHO:
  → Regla: altura_edificio_final + 5 m libre bajo gancho mínimo
  → Altura por piso típica Lima: 2.8 m piso a piso (vivienda), 3.0 m (oficinas)
  → Ejemplo 12 pisos: 12 × 2.8 = 33.6 m → necesitas grúa con H ≥ 38.6 m → J4510 (49 m) ó MC85B (54 m) OK

CARGAS TÍPICAS EN LIMA (para dimensionar):
  → Paquetes de fierro/rebar: 1.5–2.5 ton (J4510/J5010 a radio <35m los mueven)
  → Encofrado metálico: 0.5–1.5 ton (todos los modelos en cualquier radio)
  → Balde de concreto (1 m³): 2.3–2.5 ton → MC85B o Liebherr para radios largos
  → Columnas prefabricadas: 2–5 ton → Liebherr 50 ECB o MC175C
  → Vigas prefabricadas largas: 3–8 ton → Liebherr 50 ECB (8 ton) o MC175C

ESPACIO EN OBRA (Lima urbana):
  → Lote <200 m²: muy restringido, City Crane obligatoria (MC85B/MCi 85/MC68B)
  → Lote 200–500 m²: J4510, MC85B, MC68B o Liebherr 85 ECB (base ≤3.8 m)
  → Lote >500 m²: cualquier modelo según altura y carga requerida
  → Lotes esquina: ventaja para radio y maniobra, permite grúas convencionales

TIPO DE PLUMA — cuándo usar cada arquitectura:
  → CONVENCIONAL (punta/cabeza de torre): la estándar. Mejor relación alcance/costo.
    Modelos: J4510, J5010, MC85B, MC125, MC175B/C, MC205B, S-46, Liebherr, etc.
  → FLAT-TOP (sin torreta/topless): montaje y desmontaje más rápido y seguro, menor altura de
    gálibo. ELEGIR cuando hay VARIAS grúas en la misma obra (las plumas no chocan con la
    cabeza de torre vecina) o hay restricción de altura aérea. Modelos: MCT 85 F5, MCT 185 J8.
  → LUFFING / PLUMA ABATIBLE (relevable): la pluma sube en ángulo para reducir el radio de
    barrido. ELEGIR cuando NO se puede girar la pluma sobre edificios vecinos, medianeros muy
    cercanos o vía pública (restricción de sobrevuelo). Más cara pero a veces la única opción
    legal/física en lotes muy encajonados. Modelos: MCH 125 (8t), MCR 160 (10t).

──────────────────────────────────────────────────────────────
PROTOCOLO DE CONSULTA — CÓMO RECOMENDAR UNA GRÚA
──────────────────────────────────────────────────────────────

Cuando el usuario pregunte qué grúa necesita para su obra, NUNCA responder directamente
solo con los pisos. Siempre hacer PRIMERO estas preguntas (máximo 2 por turno):

DATO 1 — DIMENSIONES DEL EDIFICIO (obligatorio)
  Pregunta: "¿Cuáles son las dimensiones en planta del edificio? (frente × fondo)"
  Por qué: determina el radio mínimo requerido.
  Cálculo: diagonal = √(frente² + fondo²) → radio_min = diagonal/2 + 5m seguridad

DATO 2 — FRENTE DEL LOTE (obligatorio)
  Pregunta: "¿Cuánto mide el frente del lote?"
  Por qué: si frente <12m → city crane obligatoria (MC85B/MCi 85 con base 3.2m)
           si frente ≥12m → convencional (J4510/J5010) posible

DATO 3 — CARGA MÁS PESADA (importante)
  Pregunta: "¿Cuál será la carga más pesada que necesitas levantar?
             Opciones: solo encofrado+rebar (≤2.5 ton), baldes concreto (2.3 ton),
             prefabricados concreto (>3 ton), vigas pesadas (>5 ton)"
  Por qué: si cargas ≤2.5 ton → J4510/J5010/MC85B suficientes
           si cargas 3-5 ton → Liebherr 85 ECB o MC85B necesarios
           si cargas >5 ton → Liebherr 50 ECB o MC175C

DATO 4 — EDIFICIOS VECINOS Y RESTRICCIONES (si aplica)
  Pregunta: "¿Hay edificios altos o medianeros muy cercanos que puedan restringir
             el giro de la pluma?"
  Por qué: puede obligar a usar grúa de menor alcance o city crane con pluma corta
           Para calzaduras tipo Berlín: la grúa también debe poder operar durante
           la excavación (altura libre importante en fase temprana)

EJEMPLO DE RECOMENDACIÓN COMPLETA (con todos los datos):
  Usuario: "11 pisos, edificio 18m×25m, frente lote 14m, cargas hasta 2.5 ton, sin vecinos problemáticos"
  Cálculo: diagonal = √(324+625) = 30.8m → radio_min = 20.4m
  Altura mínima: 11 × 2.8m = 30.8m + 5m = 35.8m bajo gancho
  → Recomendación: JASO J5010 (radio 50m, altura 49m, carga 2.5t, base 3.8m cabe en 14m lote)
    Alternativa: Potain MC85B (City Crane, si espacio es limitado en obra)
  → Proveedor Lima: ETAC Peru para MC85B/MC175C, importación directa para J5010

──────────────────────────────────────────────────────────────
PROVEEDOR EN LIMA — ETAC PERU (distribuidor POTAIN)
──────────────────────────────────────────────────────────────

ETAC PERU S.A.C.
  RUC: 20492134091
  Dirección: Av. El Sol Mz. J1 Lt. 1B, V.E.S. – Lima, Perú
  Teléfonos: (51-1) 717-2378 / (51-1) 717-2379
  Web: www.etacperu.com.pe
  Modelos disponibles en stock/alquiler: Potain MC85B, MC175C, MCi 85 A/B y otras

OTROS DISTRIBUIDORES LIMA (referencial):
  → LIEBHERR: contacto a través de Liebherr Latinoamérica
  → JASO: importación directa o distribuidores eventuales
  → DAHAN / GJJ: importación China directa o brokers maquinaria pesada

──────────────────────────────────────────────────────────────
COSTOS REFERENCIALES DE ALQUILER (Lima, 2026 — en SOLES)
──────────────────────────────────────────────────────────────

REGLA DE PRECIO: el alquiler mensual escala con la CAPACIDAD de la grúa.
A más toneladas de carga máxima, más cara. Rango del mercado Lima:
  • Grúas ~3 ton (City Crane chica, MC68B):        ~S/ 15,000 /mes
  • Grúas ~5 ton (MC85B, J5010, MCT85, S-46):      ~S/ 19,000 – 21,000 /mes
  • Grúas ~8 ton (MC175B, MCH125, MCT185):         ~S/ 24,000 – 27,000 /mes
  • Grúas ~10+ ton (MC205B, MCR160, Liebherr 50):  ~S/ 28,000 – 30,000 /mes

Fórmula orientativa: precio ≈ S/ 15,000 + (toneladas − 3) / 7 × S/ 15,000,
acotado al rango S/ 15,000 (mín) – S/ 30,000 (máx) por mes.
Las grúas LUFFING (MCH/MCR) tienden al extremo alto del rango por su mayor complejidad.

NOTA: El alquiler de grúa representa aprox. 2–5% del costo total de construcción.
Siempre expresa el alquiler de grúa en SOLES (no dólares).
`
