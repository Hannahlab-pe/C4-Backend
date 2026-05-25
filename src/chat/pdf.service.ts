import { Injectable } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit')

const BLUE = '#2563EB'
const DARK = '#1E293B'
const GRAY = '#64748B'
const LIGHT = '#F1F5F9'
const GREEN = '#16A34A'

@Injectable()
export class PdfService {
  async generarInforme(params: {
    nombre: string
    distrito: string
    cabida: any
    estructura: any
    financiero: any
  }): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))

      const W = doc.page.width - 100 // ancho útil

      // ── Encabezado ───────────────────────────────────────────────────────────
      doc.rect(50, 45, W, 60).fill(BLUE)
      doc.fontSize(18).font('Helvetica-Bold').fillColor('white')
        .text('C4 — ANÁLISIS DE PRE-INVERSIÓN', 65, 60, { width: W - 30 })
      doc.fontSize(10).font('Helvetica').fillColor('white')
        .text(`${params.nombre}  ·  ${params.distrito}  ·  ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}`, 65, 83, { width: W - 30 })

      doc.moveDown(4)

      // ── Cabida ───────────────────────────────────────────────────────────────
      this.sectionTitle(doc, '1. CABIDA ARQUITECTÓNICA', W)
      const c = params.cabida
      this.twoCol(doc, W, [
        ['Área del terreno', `${this.fmt(c.area_terreno)} m²`],
        ['Planta libre (tras retiros)', `${this.fmt(c.planta_libre)} m²`],
        ['Pisos de vivienda', String(c.pisos_vivienda)],
        ['Sótanos', String(c.sotanos)],
      ], [
        ['Área construida bruta', `${this.fmt(c.area_construida_bruta)} m²`],
        ['Área vendible total', `${this.fmt(c.area_vendible_total)} m²`],
        ['Departamentos', String(c.num_departamentos)],
        ['Estacionamientos', `${c.estacionamientos_requeridos} (${c.estacionamientos_en_sotano} en sótano)`],
      ])
      this.highlight(doc, W, `Área vendible: ${this.fmt(c.area_vendible_total)} m²   ·   ${c.num_departamentos} departamentos   ·   CUS utilizado: ${c.cus_utilizado}`)

      doc.moveDown(0.5)

      // ── Estructura ───────────────────────────────────────────────────────────
      this.sectionTitle(doc, '2. PREDIMENSIONAMIENTO ESTRUCTURAL  *(empírico, referencial)*', W)
      const e = params.estructura
      this.twoCol(doc, W, [
        ['Vigas principales', `${e.base_viga_cm} × ${e.peralte_viga_cm} cm`],
        ['Losa aligerada', `h = ${e.espesor_losa_cm} cm`],
      ], [
        ['Columnas cuadradas', `${e.lado_columna_cm} × ${e.lado_columna_cm} cm`],
        ['Concreto f\'c=210 / Acero fy=4200', `${this.fmt(e.concreto_total_m3, 1)} m³  /  ${this.fmt(e.acero_total_ton, 2)} ton`],
      ])

      doc.moveDown(0.5)

      // ── Financiero ───────────────────────────────────────────────────────────
      this.sectionTitle(doc, '3. MODELO FINANCIERO', W)
      const f = params.financiero
      this.twoCol(doc, W, [
        ['Inversión total', `$${this.fmt(f.costo_total_usd)} USD`],
        ['Ingresos proyectados', `$${this.fmt(f.ingreso_total_ventas_usd)} USD`],
        ['Utilidad neta', `$${this.fmt(f.utilidad_neta_usd)} USD`],
        ['Margen bruto', `${f.margen_bruto_pct}%`],
      ], [
        ['TIR anual', `${f.tir_anual_pct}%`],
        ['VAN (tasa 12%)', `$${this.fmt(f.van_usd)} USD`],
        ['Payback', `${f.payback_meses} meses`],
        ['Punto de equilibrio', `${f.punto_equilibrio_deptos} departamentos`],
      ])
      this.highlight(doc, W,
        `TIR: ${f.tir_anual_pct}%  ·  Margen: ${f.margen_bruto_pct}%  ·  Utilidad: $${this.fmt(f.utilidad_neta_usd)} USD`,
        GREEN,
      )

      doc.moveDown(0.5)

      // ── Flujo de caja simplificado ────────────────────────────────────────────
      if (f.flujo_caja?.length) {
        this.sectionTitle(doc, '4. FLUJO DE CAJA (resumen trimestral)', W)
        this.flujoCaja(doc, W, f.flujo_caja)
      }

      // ── Pie de página ─────────────────────────────────────────────────────────
      const pageH = doc.page.height
      doc.fontSize(7).font('Helvetica').fillColor(GRAY)
        .text(
          'Informe generado por C4 Motor de Pre-inversión  ·  Los valores son referenciales y no reemplazan estudios técnicos formales (ETABS, estudios de suelo, tasaciones).',
          50, pageH - 40, { width: W, align: 'center' },
        )

      doc.end()
    })
  }

  // ─── Helpers privados ────────────────────────────────────────────────────────

  private sectionTitle(doc: any, title: string, W: number) {
    const y = doc.y
    doc.rect(50, y, W, 20).fill(LIGHT)
    doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
      .text(title, 58, y + 5, { width: W - 16 })
    doc.moveDown(1.2)
  }

  private twoCol(doc: any, W: number, left: [string, string][], right: [string, string][]) {
    const colW = (W - 20) / 2
    const startY = doc.y

    left.forEach(([label, value], i) => {
      const y = startY + i * 16
      doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(label, 50, y, { width: colW - 5 })
      doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK).text(value, 50 + colW * 0.55, y, { width: colW * 0.45, align: 'right' })
    })

    right.forEach(([label, value], i) => {
      const y = startY + i * 16
      const x = 50 + colW + 20
      doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(label, x, y, { width: colW - 5 })
      doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK).text(value, x + colW * 0.55, y, { width: colW * 0.45, align: 'right' })
    })

    const rows = Math.max(left.length, right.length)
    doc.y = startY + rows * 16 + 4
    doc.moveDown(0.3)
  }

  private highlight(doc: any, W: number, text: string, color = BLUE) {
    const y = doc.y
    doc.rect(50, y, W, 18).fill(color + '18') // 18 = ~10% opacity hex
    doc.fontSize(9).font('Helvetica-Bold').fillColor(color)
      .text(text, 58, y + 4, { width: W - 16, align: 'center' })
    doc.moveDown(1.2)
  }

  private flujoCaja(doc: any, W: number, flujo: any[]) {
    // Agrupar en trimestres
    const trimestres: { label: string; ingresos: number; egresos: number; neto: number }[] = []
    for (let t = 0; t < flujo.length; t += 3) {
      const chunk = flujo.slice(t, t + 3)
      trimestres.push({
        label: `T${Math.floor(t / 3) + 1}`,
        ingresos: chunk.reduce((a, m) => a + m.ingresos, 0),
        egresos: chunk.reduce((a, m) => a + m.egresos, 0),
        neto: chunk.reduce((a, m) => a + m.flujo_neto, 0),
      })
    }

    // Header tabla
    const colW = W / 4
    const startY = doc.y
    ;['Trimestre', 'Ingresos USD', 'Egresos USD', 'Neto USD'].forEach((h, i) => {
      doc.rect(50 + i * colW, startY, colW, 14).fill(DARK)
      doc.fontSize(7).font('Helvetica-Bold').fillColor('white')
        .text(h, 53 + i * colW, startY + 3, { width: colW - 6, align: i === 0 ? 'left' : 'right' })
    })

    // Filas (máximo 8 trimestres para no exceder página)
    trimestres.slice(0, 8).forEach((t, idx) => {
      const y = startY + 14 + idx * 13
      const bg = idx % 2 === 0 ? LIGHT : 'white'
      doc.rect(50, y, W, 13).fill(bg)
      const cols = [t.label, `$${this.fmt(t.ingresos)}`, `$${this.fmt(t.egresos)}`, `$${this.fmt(t.neto)}`]
      cols.forEach((val, i) => {
        const color = i === 3 ? (t.neto >= 0 ? GREEN : '#DC2626') : DARK
        doc.fontSize(7).font(i === 3 ? 'Helvetica-Bold' : 'Helvetica').fillColor(color)
          .text(val, 53 + i * colW, y + 3, { width: colW - 6, align: i === 0 ? 'left' : 'right' })
      })
    })

    doc.y = startY + 14 + Math.min(trimestres.length, 8) * 13 + 8
    doc.moveDown(0.5)
  }

  private fmt(n: number, decimals = 0): string {
    return n.toLocaleString('es-PE', { maximumFractionDigits: decimals })
  }
}
