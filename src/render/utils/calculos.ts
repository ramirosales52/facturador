import { ALICUOTAS_IVA } from '../constants/afip';

export interface Articulo {
  codigo?: string;
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  alicuotaIVA: string;
}

export interface TotalesFactura {
  neto: number;
  iva: number;
  total: number;
}

export interface IVAAgrupado {
  id: string;
  porcentaje: number;
  baseImponible: number;
  importeIVA: number;
}

export interface IVAParaAFIP {
  Id: number;
  BaseImp: number;
  Importe: number;
}

/**
 * Calcula el subtotal de un artículo
 */
export function calcularSubtotal(articulo: Articulo): number {
  return articulo.cantidad * articulo.precioUnitario;
}

/**
 * Calcula el IVA de un artículo
 */
export function calcularIVAArticulo(articulo: Articulo): number {
  const subtotal = calcularSubtotal(articulo);
  const alicuota = ALICUOTAS_IVA.find((a) => a.id === articulo.alicuotaIVA);
  
  if (!alicuota) return 0;
  
  return subtotal * (alicuota.porcentaje / 100);
}

/**
 * Calcula los totales de una lista de artículos
 */
export function calcularTotalesFactura(articulos: Articulo[]): TotalesFactura {
  let totalNeto = 0;
  let totalIVA = 0;

  articulos.forEach((articulo) => {
    totalNeto += calcularSubtotal(articulo);
    totalIVA += calcularIVAArticulo(articulo);
  });

  return {
    neto: parseFloat(totalNeto.toFixed(2)),
    iva: parseFloat(totalIVA.toFixed(2)),
    total: parseFloat((totalNeto + totalIVA).toFixed(2)),
  };
}

/**
 * Agrupa artículos por alícuota de IVA con información detallada
 */
export function agruparIVAPorAlicuota(articulos: Articulo[]): IVAAgrupado[] {
  const ivaAgrupado = new Map<string, { porcentaje: number; baseImponible: number; importeIVA: number }>();

  articulos.forEach((articulo) => {
    const subtotal = calcularSubtotal(articulo);
    const alicuota = ALICUOTAS_IVA.find((a) => a.id === articulo.alicuotaIVA);

    if (alicuota) {
      const importeIVA = calcularIVAArticulo(articulo);

      if (ivaAgrupado.has(articulo.alicuotaIVA)) {
        const actual = ivaAgrupado.get(articulo.alicuotaIVA)!;
        ivaAgrupado.set(articulo.alicuotaIVA, {
          porcentaje: alicuota.porcentaje,
          baseImponible: actual.baseImponible + subtotal,
          importeIVA: actual.importeIVA + importeIVA,
        });
      } else {
        ivaAgrupado.set(articulo.alicuotaIVA, {
          porcentaje: alicuota.porcentaje,
          baseImponible: subtotal,
          importeIVA,
        });
      }
    }
  });

  return Array.from(ivaAgrupado.entries()).map(([id, valores]) => ({
    id,
    porcentaje: valores.porcentaje,
    baseImponible: parseFloat(valores.baseImponible.toFixed(2)),
    importeIVA: parseFloat(valores.importeIVA.toFixed(2)),
  }));
}

/**
 * Agrupa artículos por alícuota de IVA en formato para AFIP
 */
export function agruparIVAParaAFIP(articulos: Articulo[]): IVAParaAFIP[] {
  const ivaAgrupado = new Map<string, { BaseImp: number; Importe: number }>();

  articulos.forEach((articulo) => {
    const subtotal = calcularSubtotal(articulo);
    const importeIVA = calcularIVAArticulo(articulo);

    if (ivaAgrupado.has(articulo.alicuotaIVA)) {
      const actual = ivaAgrupado.get(articulo.alicuotaIVA)!;
      ivaAgrupado.set(articulo.alicuotaIVA, {
        BaseImp: actual.BaseImp + subtotal,
        Importe: actual.Importe + importeIVA,
      });
    } else {
      ivaAgrupado.set(articulo.alicuotaIVA, {
        BaseImp: subtotal,
        Importe: importeIVA,
      });
    }
  });

  return Array.from(ivaAgrupado.entries()).map(([id, valores]) => ({
    Id: parseInt(id),
    BaseImp: parseFloat(valores.BaseImp.toFixed(2)),
    Importe: parseFloat(valores.Importe.toFixed(2)),
  }));
}

/**
 * Obtiene el nombre de una condición IVA
 */
export function getNombreCondicionIVA(condicionIVA: string, tipoFactura: string): string {
  if (tipoFactura === 'B') {
    return condicionIVA === '4' ? 'IVA Sujeto Exento' : 'Consumidor Final';
  }
  return 'Responsable Inscripto';
}
