/**
 * Ejemplos de uso del módulo ARCA/AFIP
 * 
 * Este archivo contiene ejemplos prácticos de cómo usar el API
 * de facturación electrónica.
 */

// ============================================
// EJEMPLO 1: Verificar conexión con AFIP/ARCA
// ============================================

async function verificarConexion() {
  const response = await fetch('http://localhost:3000/arca/server-status');
  const data = await response.json();
  
  console.log('Estado del servidor:', data);
  // Respuesta esperada:
  // {
  //   success: true,
  //   serverStatus: {
  //     AppServer: "OK",
  //     DbServer: "OK",
  //     AuthServer: "OK"
  //   }
  // }
}

// ============================================
// EJEMPLO 2: Crear Factura C (Consumidor Final)
// ============================================

async function crearFacturaC() {
  const factura = {
    ImpTotal: 121,      // Total con IVA
    ImpNeto: 100,       // Neto sin IVA
    ImpIVA: 21,         // IVA (21%)
    Iva: [
      {
        Id: 5,          // 5 = IVA 21%
        BaseImp: 100,   // Base imponible
        Importe: 21     // Importe de IVA
      }
    ]
  };

  const response = await fetch('http://localhost:3000/arca/factura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(factura)
  });
  
  const data = await response.json();
  console.log('Factura creada:', data);
  // Respuesta esperada:
  // {
  //   success: true,
  //   data: {
  //     CAE: "12345678901234",       // Código de Autorización Electrónico
  //     CAEFchVto: "20240115",       // Fecha de vencimiento del CAE
  //     CbteDesde: 1,                // Número de comprobante
  //     CbteHasta: 1
  //   }
  // }
}

// ============================================
// EJEMPLO 3: Crear Factura B (Responsable Inscripto)
// ============================================

async function crearFacturaB() {
  const factura = {
    CbteTipo: 6,        // 6 = Factura B
    DocTipo: 80,        // 80 = CUIT
    DocNro: 20123456789, // CUIT del cliente
    ImpTotal: 121,
    ImpNeto: 100,
    ImpIVA: 21,
    Iva: [
      {
        Id: 5,
        BaseImp: 100,
        Importe: 21
      }
    ]
  };

  const response = await fetch('http://localhost:3000/arca/factura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(factura)
  });
  
  const data = await response.json();
  console.log('Factura B creada:', data);
}

// ============================================
// EJEMPLO 4: Factura con múltiples alícuotas de IVA
// ============================================

async function crearFacturaMultipleIVA() {
  const factura = {
    ImpTotal: 242,      // Total: 100 + 21 (21%) + 100 + 21 (21%)
    ImpNeto: 200,       // 100 al 21% + 100 al 21%
    ImpIVA: 42,         // 21 + 21
    Iva: [
      {
        Id: 5,          // IVA 21%
        BaseImp: 100,
        Importe: 21
      },
      {
        Id: 5,          // IVA 21% (otro producto)
        BaseImp: 100,
        Importe: 21
      }
    ]
  };

  const response = await fetch('http://localhost:3000/arca/factura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(factura)
  });
  
  const data = await response.json();
  console.log('Factura con múltiple IVA:', data);
}

// ============================================
// EJEMPLO 5: Factura de Servicios
// ============================================

async function crearFacturaServicios() {
  const factura = {
    Concepto: 2,        // 2 = Servicios
    ImpTotal: 121,
    ImpNeto: 100,
    ImpIVA: 21,
    Iva: [
      {
        Id: 5,
        BaseImp: 100,
        Importe: 21
      }
    ]
  };

  const response = await fetch('http://localhost:3000/arca/factura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(factura)
  });
  
  const data = await response.json();
  console.log('Factura de servicios creada:', data);
}

// ============================================
// EJEMPLO 6: Obtener último número de comprobante
// ============================================

async function obtenerUltimoNumero() {
  // Para Factura C (tipo 11), punto de venta 1
  const response = await fetch('http://localhost:3000/arca/ultimo-comprobante?ptoVta=1&cbteTipo=11');
  const data = await response.json();
  
  console.log('Último número de comprobante:', data);
  // Respuesta esperada:
  // {
  //   success: true,
  //   lastVoucher: 123
  // }
}

// ============================================
// EJEMPLO 7: Listar tipos de comprobantes disponibles
// ============================================

async function listarTiposComprobantes() {
  const response = await fetch('http://localhost:3000/arca/tipos-comprobante');
  const data = await response.json();
  
  console.log('Tipos de comprobantes:', data);
  // Mostrará todos los tipos disponibles (Facturas A, B, C, Notas de crédito, etc.)
}

// ============================================
// EJEMPLO 8: Listar puntos de venta
// ============================================

async function listarPuntosVenta() {
  const response = await fetch('http://localhost:3000/arca/puntos-venta');
  const data = await response.json();
  
  console.log('Puntos de venta:', data);
  // Mostrará todos los puntos de venta habilitados
}

// ============================================
// EJEMPLO 9: Consultar una factura específica
// ============================================

async function consultarFactura(numero: number) {
  const response = await fetch(`http://localhost:3000/arca/comprobante/${numero}`);
  const data = await response.json();
  
  console.log('Información del comprobante:', data);
}

// ============================================
// CONSTANTES ÚTILES
// ============================================

// Tipos de comprobantes
export const TIPOS_COMPROBANTE = {
  FACTURA_A: 1,
  FACTURA_B: 6,
  FACTURA_C: 11,
  FACTURA_E: 19,
  NOTA_CREDITO_A: 3,
  NOTA_CREDITO_B: 8,
  NOTA_CREDITO_C: 13,
  NOTA_DEBITO_A: 2,
  NOTA_DEBITO_B: 7,
  NOTA_DEBITO_C: 12,
};

// Tipos de documento
export const TIPOS_DOCUMENTO = {
  CUIT: 80,
  CUIL: 86,
  DNI: 96,
  CONSUMIDOR_FINAL: 99,
};

// Tipos de IVA
export const TIPOS_IVA = {
  IVA_0: 3,
  IVA_10_5: 4,
  IVA_21: 5,
  IVA_27: 6,
};

// Conceptos
export const CONCEPTOS = {
  PRODUCTOS: 1,
  SERVICIOS: 2,
  PRODUCTOS_Y_SERVICIOS: 3,
};

// ============================================
// FLUJO COMPLETO DE TRABAJO
// ============================================

async function flujoCompleto() {
  console.log('1. Verificando conexión...');
  await verificarConexion();
  
  console.log('\n2. Obteniendo último número...');
  await obtenerUltimoNumero();
  
  console.log('\n3. Creando factura...');
  await crearFacturaC();
  
  console.log('\n4. Listando puntos de venta...');
  await listarPuntosVenta();
  
  console.log('\n¡Proceso completado!');
}

// Para ejecutar el flujo completo (solo como referencia):
// flujoCompleto();

export {
  verificarConexion,
  crearFacturaC,
  crearFacturaB,
  crearFacturaMultipleIVA,
  crearFacturaServicios,
  obtenerUltimoNumero,
  listarTiposComprobantes,
  listarPuntosVenta,
  consultarFactura,
  flujoCompleto,
};
