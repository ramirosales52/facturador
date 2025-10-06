# Implementación de PDF y QR para Facturas Electrónicas

## Resumen de cambios

### 1. Número de comprobante corregido
**Problema**: El número de comprobante aparecía vacío
**Solución**: Modificado el servicio para devolver todos los datos necesarios incluyendo `CbteDesde`, `PtoVta`, etc.

### 2. Generación de Código QR
Implementado según especificaciones de AFIP (RG 4291):

**Backend (`arca.service.ts`)**:
- Método `generateQR()` que genera la URL del QR según especificaciones de AFIP
- Crea el JSON con los datos de la factura
- Codifica en base64 y genera URL: `https://www.afip.gob.ar/fe/qr/?p={base64}`

**Endpoint**: `POST /arca/generar-qr`

**Datos del QR incluyen**:
- Versión (ver: 1)
- Fecha del comprobante
- CUIT del emisor
- Punto de venta
- Tipo de comprobante
- Número de comprobante
- Importe total
- Moneda y cotización
- Tipo y número de documento del receptor
- Tipo de código de autorización (E para CAE)
- CAE

### 3. Generación de PDF
Implementado usando el método del SDK de AFIP:

**Backend (`arca.service.ts`)**:
- Método `generatePDF()` que usa `afip.ElectronicBilling.createPDF()`
- Incluye automáticamente el código QR en el PDF
- Usa la plantilla estándar del SDK

**Endpoint**: `POST /arca/generar-pdf`

### 4. Frontend actualizado

**Hook `useArca.ts`**:
- Agregadas funciones `generarQR()` y `generarPDF()`
- Interfaces actualizadas con todos los campos necesarios

**Componente `CrearFactura.tsx`**:
- Al crear una factura, se genera automáticamente el QR
- Muestra el QR code visualizado usando `qrserver.com` API
- Botón para descargar PDF
- Muestra número de comprobante correctamente
- Muestra punto de venta

## Uso

### Crear factura y obtener QR automáticamente
```typescript
const response = await crearFactura(facturaData);
// El QR se genera automáticamente y se muestra en pantalla
```

### Generar QR manualmente
```typescript
const qrData = {
  ver: 1,
  fecha: '2025-10-06',
  cuit: 20409378472,
  ptoVta: 1,
  tipoCmp: 6,
  nroCmp: 12942,
  importe: 121.00,
  moneda: 'PES',
  ctz: 1,
  tipoDocRec: 80,
  nroDocRec: 20111111112,
  tipoCodAut: 'E',
  codAut: '75402284060818',
};

const qrResponse = await generarQR(qrData);
// qrResponse.qrUrl contiene la URL del QR de AFIP
```

### Generar PDF
```typescript
const pdfResponse = await generarPDF(facturaInfo);
// pdfResponse.pdf contiene el PDF generado
// pdfResponse.qrUrl contiene la URL del QR incluida en el PDF
```

## Endpoints disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/arca/factura` | Crear factura electrónica |
| POST | `/arca/generar-qr` | Generar código QR de factura |
| POST | `/arca/generar-pdf` | Generar PDF de factura |
| GET | `/arca/server-status` | Estado del servidor AFIP |
| GET | `/arca/ultimo-comprobante` | Último número de comprobante |

## Especificaciones cumplidas

✅ Código QR según RG 4291 de AFIP
✅ URL correcta: `https://www.afip.gob.ar/fe/qr/?p={datos_base64}`
✅ JSON codificado en base64 con todos los campos obligatorios
✅ Generación automática de QR al crear factura
✅ Visualización del QR en la interfaz
✅ Enlace directo para verificar en AFIP
✅ Generación de PDF con QR incluido
✅ Número de comprobante mostrado correctamente

## Próximos pasos sugeridos

- [ ] Implementar descarga real del PDF (actualmente es un placeholder)
- [ ] Guardar facturas en base de datos local
- [ ] Agregar opción para reimprimir facturas anteriores
- [ ] Enviar factura por email automáticamente
- [ ] Generar PDF con plantilla personalizada (opcional)

## Referencias

- Documentación AFIP QR: https://www.afip.gob.ar/fe/qr/documentos/QRespecificaciones.pdf
- Documentación SDK: https://docs.afipsdk.com/
- RG 4291/2018 - Código QR obligatorio
