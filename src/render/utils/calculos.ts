import { ALICUOTAS_IVA } from '../constants/afip'

export interface Articulo {
  codigo?: string
  descripcion: string
  cantidad: number
  unidadMedida: string
  precioUnitario: number // Ahora representa el precio FINAL (con IVA incluido)
  alicuotaIVA: string
  subtotal?: number
}

export interface TotalesFactura {
  neto: number // Precio sin IVA
  iva: number // IVA
  total: number // Precio final (con IVA)
}

export interface IVAAgrupado {
  id: string
  porcentaje: number
  baseImponible: number // Sin IVA
  importeIVA: number // IVA
}

export interface IVAParaAFIP {
  Id: number
  BaseImp: number // Sin IVA
  Importe: number // IVA
}

/**
 * Calcula el precio SIN IVA a partir del precio final (con IVA incluido)
 */
export function calcularPrecioSinIVA(precioConIVA: number, porcentajeIVA: number): number {
  // Fórmula: Precio sin IVA = Precio con IVA / (1 + porcentaje/100)
  return precioConIVA / (1 + porcentajeIVA / 100)
}

/**
 * Calcula el importe de IVA a partir del precio final (con IVA incluido)
 */
export function calcularImporteIVA(precioConIVA: number, porcentajeIVA: number): number {
  const precioSinIVA = calcularPrecioSinIVA(precioConIVA, porcentajeIVA)
  return precioConIVA - precioSinIVA
}

/**
 * Calcula el subtotal SIN IVA de un artículo
 * El precio unitario ahora es el precio FINAL (con IVA incluido)
 */
export function calcularSubtotalSinIVA(articulo: Articulo): number {
  const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)
  const porcentajeIVA = alicuota?.porcentaje || 0
  
  const precioFinalUnitario = articulo.precioUnitario
  const precioSinIVAUnitario = calcularPrecioSinIVA(precioFinalUnitario, porcentajeIVA)
  
  return articulo.cantidad * precioSinIVAUnitario
}

/**
 * Calcula el subtotal CON IVA de un artículo (precio final)
 */
export function calcularSubtotal(articulo: Articulo): number {
  return articulo.cantidad * articulo.precioUnitario
}

/**
 * Calcula el IVA de un artículo
 */
export function calcularIVAArticulo(articulo: Articulo): number {
  const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)

  if (!alicuota)
    return 0

  const precioFinalTotal = calcularSubtotal(articulo)
  return calcularImporteIVA(precioFinalTotal, alicuota.porcentaje)
}

/**
 * Calcula los totales de una lista de artículos
 */
export function calcularTotalesFactura(articulos: Articulo[]): TotalesFactura {
  let totalNeto = 0 // Sin IVA
  let totalIVA = 0

  articulos.forEach((articulo) => {
    totalNeto += calcularSubtotalSinIVA(articulo)
    totalIVA += calcularIVAArticulo(articulo)
  })

  return {
    neto: Number.parseFloat(totalNeto.toFixed(2)),
    iva: Number.parseFloat(totalIVA.toFixed(2)),
    total: Number.parseFloat((totalNeto + totalIVA).toFixed(2)),
  }
}

/**
 * Agrupa artículos por alícuota de IVA con información detallada
 */
export function agruparIVAPorAlicuota(articulos: Articulo[]): IVAAgrupado[] {
  const ivaAgrupado = new Map<string, { porcentaje: number, baseImponible: number, importeIVA: number }>()

  articulos.forEach((articulo) => {
    const subtotalSinIVA = calcularSubtotalSinIVA(articulo)
    const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)

    if (alicuota) {
      const importeIVA = calcularIVAArticulo(articulo)

      if (ivaAgrupado.has(articulo.alicuotaIVA)) {
        const actual = ivaAgrupado.get(articulo.alicuotaIVA)!
        ivaAgrupado.set(articulo.alicuotaIVA, {
          porcentaje: alicuota.porcentaje,
          baseImponible: actual.baseImponible + subtotalSinIVA,
          importeIVA: actual.importeIVA + importeIVA,
        })
      }
      else {
        ivaAgrupado.set(articulo.alicuotaIVA, {
          porcentaje: alicuota.porcentaje,
          baseImponible: subtotalSinIVA,
          importeIVA,
        })
      }
    }
  })

  return Array.from(ivaAgrupado.entries()).map(([id, valores]) => ({
    id,
    porcentaje: valores.porcentaje,
    baseImponible: Number.parseFloat(valores.baseImponible.toFixed(2)),
    importeIVA: Number.parseFloat(valores.importeIVA.toFixed(2)),
  }))
}

function redondearMoneda(valor: number): number {
  return Number.parseFloat(valor.toFixed(2))
}

export interface NotaCreditoParcialResultado {
  articulos: Articulo[]
  ivasAgrupados: IVAAgrupado[]
  impNeto: number
  impIVA: number
  impTotal: number
}

/**
 * Calcula una nota de crédito parcial prorrateando los importes originales.
 */
export function prepararNotaCreditoParcial(articulos: Articulo[], montoAcreditar: number): NotaCreditoParcialResultado {
  const totalesOriginales = calcularTotalesFactura(articulos)
  const montoObjetivo = redondearMoneda(Math.max(montoAcreditar, 0))
  const totalOriginal = redondearMoneda(totalesOriginales.total)

  if (montoObjetivo <= 0 || totalOriginal <= 0 || montoObjetivo >= totalOriginal) {
    const ivasAgrupados = agruparIVAPorAlicuota(articulos)

    return {
      articulos,
      ivasAgrupados,
      impNeto: redondearMoneda(totalesOriginales.neto),
      impIVA: redondearMoneda(totalesOriginales.iva),
      impTotal: totalOriginal,
    }
  }

  const factor = montoObjetivo / totalOriginal

  const articulosAjustados = articulos.map(არტiculo => {
    const subtotalOriginal = calcularSubtotal(articulo)
    const subtotalAjustado = subtotalOriginal * factor
    const precioUnitario = (Number(articulo.cantidad) || 0) > 0
      ? subtotalAjustado / Number(articulo.cantidad)
      : subtotalAjustado

    return {
      ...articulo,
      precioUnitario,
      subtotal: redondearMoneda(subtotalAjustado),
    }
  })

  const ivasAgrupados = agruparIVAPorAlicuota(articulosAjustados)
  let impNeto = redondearMoneda(ivasAgrupados.reduce((acc, iva) => acc + iva.baseImponible, 0))
  let impIVA = redondearMoneda(ivasAgrupados.reduce((acc, iva) => acc + iva.importeIVA, 0))

  const totalCalculado = redondearMoneda(impNeto + impIVA)
  const diferencia = redondearMoneda(montoObjetivo - totalCalculado)

  if (diferencia !== 0 && ivasAgrupados.length > 0) {
    const indiceAjuste = [...ivasAgrupados].reverse().findIndex(iva => redondearMoneda(iva.importeIVA) !== 0)
    const indiceFinal = indiceAjuste === -1 ? ivasAgrupados.length - 1 : ivasAgrupados.length - 1 - indiceAjuste
    const grupo = ivasAgrupados[indiceFinal]

    if (redondearMoneda(grupo.importeIVA) !== 0) {
      grupo.importeIVA = redondearMoneda(grupo.importeIVA + diferencia)
    } else {
      grupo.baseImponible = redondearMoneda(grupo.baseImponible + diferencia)
    }

    impNeto = redondearMoneda(ivasAgrupados.reduce((acc, iva) => acc + iva.baseImponible, 0))
    impIVA = redondearMoneda(ivasAgrupados.reduce((acc, iva) => acc + iva.importeIVA, 0))
  }

  return {
    articulos: articulosAjustados,
    ivasAgrupados,
    impNeto,
    impIVA,
    impTotal: redondearMoneda(impNeto + impIVA),
  }
}

/**
 * Agrupa artículos por alícuota de IVA en formato para AFIP
 */
export function agruparIVAParaAFIP(articulos: Articulo[]): IVAParaAFIP[] {
  const ivaAgrupado = new Map<string, { BaseImp: number, Importe: number }>()

  articulos.forEach((articulo) => {
    const subtotalSinIVA = calcularSubtotalSinIVA(articulo)
    const importeIVA = calcularIVAArticulo(articulo)

    if (ivaAgrupado.has(articulo.alicuotaIVA)) {
      const actual = ivaAgrupado.get(articulo.alicuotaIVA)!
      ivaAgrupado.set(articulo.alicuotaIVA, {
        BaseImp: actual.BaseImp + subtotalSinIVA,
        Importe: actual.Importe + importeIVA,
      })
    }
    else {
      ivaAgrupado.set(articulo.alicuotaIVA, {
        BaseImp: subtotalSinIVA,
        Importe: importeIVA,
      })
    }
  })

  return Array.from(ivaAgrupado.entries()).map(([id, valores]) => ({
    Id: Number.parseInt(id),
    BaseImp: Number.parseFloat(valores.BaseImp.toFixed(2)),
    Importe: Number.parseFloat(valores.Importe.toFixed(2)),
  }))
}

/**
 * Obtiene el nombre de una condición IVA
 */
export function getNombreCondicionIVA(condicionIVA: string, tipoFactura: string): string {
  if (tipoFactura === 'B') {
    return condicionIVA === '4' ? 'IVA Sujeto Exento' : 'Consumidor Final'
  }
  return 'Responsable Inscripto'
}

/**
 * Formatea un número como moneda en formato ARS
 * Ejemplo: 2000000 -> $2.000.000,00
 */
export function formatearMoneda(valor: number): string {
  return `$${valor.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
