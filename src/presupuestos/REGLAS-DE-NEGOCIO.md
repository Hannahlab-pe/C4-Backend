# Módulo Presupuestos y Costos — Reglas de negocio implementadas

Base de datos maestra del ERP (equivalente al "Módulo I" de S10). El resto de módulos
(Gerencia de Proyectos, Compras, Almacenes, Nóminas, Contabilidad) consumirán de aquí.

Estado de esta iteración: **modelo de datos + motor de cálculo + tests**. API y UI vienen después.

---

## 1. Regla de precisión (crítica — evita el redondeo acumulado)

`engine/precision.ts`. Aritmética con **decimal.js** (no float64).

- Cálculos intermedios y sumas: **precisión completa, sin redondear**.
- Redondeo **solo** en la frontera de guardado/visualización:
  - **Cantidades → 4 decimales** (ej. jornales/m² = 0.0833)
  - **Montos (S/) → 2 decimales**
- Redondeo comercial **HALF_UP**.
- Las columnas `decimal` de Postgres se leen como **string** y alimentan a decimal.js sin pérdida.

## 2. Recursos (`pre_recursos` + `pre_recurso_precios`)

4 tipos = 4 elementos genéricos: **MO** (mano de obra), **MAT** (materiales), **EQP** (equipo),
**SUB** (subcontrato). El **precio unitario actual vive solo en el Recurso** (fuente única de
verdad); cada cambio se historia en `pre_recurso_precios`. Catálogo transversal
(`proyecto_id = null`) o precio propio por proyecto.

## 3. APU — Análisis de Precios Unitarios (`engine/apu.engine.ts`)

`calcularApu(partidaId, ctx)` → `{ costoUnitario, lineas, porGenerico }`.

Por cada línea del APU:
- **MO / EQP** (rinden por jornada): `cantidad = cuadrilla / rendimiento`.
- **MAT / SUB**: `cantidad` fija por unidad de partida.
- **Sub-partida (PARTIDA)**: precio unitario = **costo unitario recursivo** de la sub-partida.
- `parcial = cantidad × precio unitario`.

`Costo Unitario = Σ parciales` (MO + MAT + EQP + SUB). **Reactivo**: se computa en vivo con el
precio ACTUAL de los recursos. **Detecta ciclos** de sub-partidas. `porGenerico` expande el desglose
de las sub-partidas hacia el genérico real (insumo de la fórmula polinómica).

> Reactivo vs snapshot: el APU del catálogo es en vivo; al colocar una partida en un presupuesto se
> guarda un **snapshot** (`costo_unitario_snapshot`) para que el presupuesto no cambie
> retroactivamente. Un "recalcular" explícito refresca el snapshot.

## 4. Presupuesto — árbol WBS y totales (`engine/presupuesto.engine.ts`)

`calcularPresupuesto(items, config)`. Árbol Título → Sub-título → Partida.
- Partida: `parcial = metrado × costo_unitario_snapshot`.
- Título: `subtotal = Σ` recursiva de descendientes.
- **Costo Directo (CD)** = Σ items de primer nivel.

```
GG        = gg_fijo + (gg_% × CD)
Utilidad  = utilidad_% × CD
Subtotal  = CD + GG + Utilidad
IGV       = igv_% × Subtotal          (0.18 por defecto)
TOTAL     = Subtotal + IGV
```

Porcentajes como **fracción** (0.10 = 10%), **configurables por proyecto**. Detecta ciclos del árbol.

## 5. Tres presupuestos (`pre_presupuestos`)

Entidades independientes relacionadas por `origen_id`:
- **meta** — control interno (sin margen comercial).
- **venta** — contractual al cliente (con utilidad + IGV).
- **linea_base** — foto congelada (`congelado = true`); no se edita: los cambios pasan por
  **adicionales/deductivos** (`pre_adicionales`), que nunca sobrescriben la línea base.

## 6. Fórmula polinómica (`engine/polinomica.engine.ts`)

`K = Σ aᵢ × (Irᵢ / Ioᵢ)`, K a 3 decimales. Valida que **Σ aᵢ = 1**.
`coeficientesIncidencia(porGenerico, CD)` genera los coeficientes desde el desglose real del
presupuesto (`aᵢ = costo_genérico_i / CD`) y **ajusta el residual** para que sumen exacto 1 (en S10
se estima a mano; acá sale de los datos). Índices INEI mensuales en `pre_indices_unificados`.

## 7. Auditoría (`pre_audit_log`)

Todo cambio de precio, cantidad, rendimiento o metrado se registra (quién, campo, valor anterior →
nuevo, cuándo).

---

## Cómo lo consume otro módulo

Importar el motor puro:
```ts
import { calcularApu, calcularPresupuesto, calcularK, coeficientesIncidencia } from '../presupuestos/engine'
```
No depende de NestJS ni de la DB: recibe datos planos y devuelve resultados. Las entidades TypeORM
(`pre_*`) son el modelo persistente; los snapshots (`*_snapshot`) preservan el costo histórico.

## Tests

`engine/*.spec.ts` (15 casos): APU (cuadrilla/rendimiento, materiales, sub-partidas, ciclos),
presupuesto (parciales, subtotales, CD→GG→Ut→IGV→Total, anidamiento), polinómica (K, coeficientes).
Correr: `npx jest presupuestos`.
