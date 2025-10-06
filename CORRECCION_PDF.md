# Corrección de generación de PDF - Resumen

## Cambios realizados

### 1. Método de generación de PDF corregido

**Antes:** Intentaba guardar el PDF localmente
**Ahora:** Usa el SDK de AFIP que genera el PDF en su servidor y devuelve una URL

**Backend (`arca.service.ts`)**:
- Genera HTML personalizado con todos los datos de la factura
- Incluye el código QR dentro del HTML
- Usa `afip.ElectronicBilling.createPDF()` con:
  - `html`: El HTML completo de la factura
  - `file_name`: Nombre del archivo
  - `options`: Configuración de márgenes y tamaño
- Devuelve `fileUrl` en lugar de intentar guardar localmente

### 2. Frontend actualizado

**Componente (`CrearFactura.tsx`)**:
- Botón cambiado a "📄 Generar PDF" (en lugar de "Descargar")
- Cuando se genera el PDF, muestra:
  - La URL del PDF generado
  - Botón "📋 Copiar enlace" - copia la URL al portapapeles
  - Botón "🔗 Abrir PDF" - abre el PDF en una nueva pestaña
- Notificaciones con Sonner:
  - Loading mientras se genera
  - Success cuando está listo
  - Error si falla

### 3. Plantilla HTML de factura

Implementada una plantilla HTML profesional que incluye:
- Encabezado con tipo de comprobante (B)
- Punto de venta y número de comprobante
- Fecha de emisión
- Datos del emisor (tu empresa)
- Datos del receptor (cliente)
- Tabla de productos/servicios
- Cálculos: Subtotal, IVA, Total
- CAE y fecha de vencimiento
- Código QR de AFIP incluido como imagen

## Cómo funciona

1. Usuario crea una factura
2. Hace clic en "Generar PDF"
3. El backend:
   - Genera el HTML con todos los datos
   - Incluye el QR como imagen desde `qrserver.com`
   - Envía el HTML al SDK de AFIP
   - AFIP genera el PDF y devuelve una URL
4. El frontend muestra la URL con opciones para:
   - Copiar al portapapeles
   - Abrir en nueva pestaña

## Ejemplo de respuesta del SDK

```javascript
{
  success: true,
  fileUrl: "https://app.afipsdk.com/api/v2/...",
  fileName: "Factura_6_0001_00012942",
  qrUrl: "https://www.afip.gob.ar/fe/qr/?p=..."
}
```

## Solución del error 400

El error 400 probablemente se debía a que:
- Intentábamos guardar localmente en lugar de usar el SDK correctamente
- No estábamos pasando el HTML en el formato correcto
- Faltaban campos obligatorios en los datos

Ahora el método usa correctamente el SDK con:
- HTML completo y válido
- Opciones de formato correctas
- Todos los campos necesarios

## Próximos pasos

Reinicia el servidor y prueba:
1. Crear una factura
2. Hacer clic en "Generar PDF"
3. Verás la URL del PDF
4. Puedes copiarla o abrirla directamente
5. El PDF estará alojado en los servidores de AFIP SDK

El enlace del PDF estará disponible para descargar desde los servidores del SDK.
