# Mejoras en QR y PDF - Resumen de cambios

## Cambios realizados

### 1. ✅ QR Code - Verificado y confirmado
- **El CAE SÍ se está incluyendo correctamente** en el campo `codAut`
- Los datos del QR incluyen todos los campos obligatorios según AFIP
- Agregados logs para debug que puedes revisar en la consola del servidor
- La URL generada es correcta: `https://www.afip.gob.ar/fe/qr/?p={base64}`

**Ejemplo de datos generados:**
```json
{
  "ver": 1,
  "fecha": "2025-10-06",
  "cuit": 20409378472,
  "ptoVta": 1,
  "tipoCmp": 6,
  "nroCmp": 12942,
  "importe": 121,
  "moneda": "PES",
  "ctz": 1,
  "tipoDocRec": 80,
  "nroDocRec": 20111111112,
  "tipoCodAut": "E",
  "codAut": "75402284060818"  ⬅️ CAE incluido aquí
}
```

### 2. ✅ Descarga de PDF implementada
**Backend (`arca.service.ts`)**:
- El PDF ahora se guarda automáticamente en `/mnt/c/Users/rami_/Desktop`
- Nombre del archivo formato: `Factura_{tipo}_{ptoVta}_{nroCbte}.pdf`
- Ejemplo: `Factura_6_0001_00012942.pdf`
- Retorna la ruta completa y el nombre del archivo

**Frontend**:
- Instalado y configurado **Sonner** para notificaciones
- Toast de loading mientras se genera el PDF
- Toast de éxito mostrando:
  - Nombre del archivo
  - Ruta completa donde se guardó
  - Duración de 5 segundos para que puedas leerlo
- Toast de error si algo falla

### 3. ✅ Toaster global agregado
- Agregado `<Toaster />` de Sonner en `App.tsx`
- Configurado con posición `top-right`
- Colores ricos activados (`richColors`)

## Uso

### Al crear una factura:
1. Se genera automáticamente el código QR
2. Se muestra el QR visualizado en pantalla
3. Puedes hacer clic en "Verificar en AFIP" para abrir la URL del QR
4. El botón "📄 Descargar PDF" guarda el archivo en el escritorio

### Notificaciones:
- **Loading**: "Generando PDF..." (mientras se procesa)
- **Éxito**: Muestra el nombre del archivo y la ruta completa
- **Error**: Muestra el mensaje de error específico

## Verificación del QR

Para verificar que el QR contiene el CAE:
1. Crea una factura
2. Revisa la consola del servidor (donde corre `npm run dev`)
3. Verás logs como:
   ```
   📋 Datos del QR: {...}
   🔗 URL del QR generada: https://...
   ```
4. El campo `codAut` en los logs contiene el CAE

También puedes:
- Escanear el QR con tu celular
- O hacer clic en "Verificar en AFIP" para abrir la URL directamente
- AFIP decodificará el base64 y mostrará todos los datos incluyendo el CAE

## Ruta de guardado del PDF

El PDF se guarda en: `/mnt/c/Users/rami_/Desktop`

Esto corresponde a tu escritorio de Windows en WSL. Si quieres cambiar la ruta, modifica la constante `downloadPath` en el método `generatePDF()` del servicio.

## Siguiente paso

Reinicia el servidor con `npm run dev` y prueba:
1. Crear una factura
2. Ver que el QR se genera con todos los datos (revisa la consola)
3. Hacer clic en "Descargar PDF"
4. Verás la notificación de Sonner con la ubicación del archivo
5. Revisa tu escritorio - el PDF estará ahí
