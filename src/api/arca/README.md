# Integración AFIP/ARCA - Facturación Electrónica

## 📋 Descripción

Este módulo implementa la integración con el SDK de AFIP (ahora ARCA) para facturación electrónica utilizando el web service de Factura Electrónica.

## 🚀 Configuración Inicial (Ambiente de Pruebas)

### 1. Obtener Certificados de Prueba

Para usar el ambiente de homologación (testing) de AFIP, necesitas generar certificados:

#### Opción A: Generar certificados manualmente

1. **Generar clave privada:**

```bash
openssl genrsa -out private_key.key 2048
```

2. **Generar CSR (Certificate Signing Request):**

```bash
openssl req -new -key private_key.key -subj "/C=AR/O=TU_EMPRESA/CN=TU_EMPRESA/serialNumber=CUIT 20409378472" -out certificate.csr
```

3. **Acceder al portal de AFIP:**
   - Ir a https://www.afip.gob.ar/ws/
   - Seleccionar "Administrador de Relaciones de Clave Fiscal"
   - Agregar nuevo certificado (usar el archivo .csr generado)
   - Descargar el certificado (.crt)

#### Opción B: Usar el SDK para generar certificados

El SDK de AFIP puede generar los certificados automáticamente:

```typescript
import Afip from '@afipsdk/afip.js'

const afip = new Afip({ CUIT: 20409378472 })

// Esto generará los archivos en la carpeta del proyecto
afip.CreateCert()
```

### 2. Configurar las Credenciales

Editar el archivo `src/api/arca/arca.config.ts`:

```typescript
export const ArcaConfig = {
  CUIT: 20409378472, // Reemplazar con tu CUIT
  production: false, // false = testing
  cert: 'ruta/a/certificate.crt',
  key: 'ruta/a/private_key.key',
}
```

**IMPORTANTE:** Por seguridad, NO commitear los certificados al repositorio. Usar variables de entorno:

```bash
export AFIP_CERT_PATH=/ruta/segura/certificate.crt
export AFIP_KEY_PATH=/ruta/segura/private_key.key
```

### 3. Habilitar el Servicio en AFIP

Para ambiente de pruebas:

1. Acceder con CUIT de prueba a https://auth.afip.gob.ar/
2. Ir a "Administrador de Relaciones de Clave Fiscal"
3. Habilitar el servicio "wsfe" (Web Service Factura Electrónica)

## 📡 API Endpoints

### 1. Verificar Estado del Servidor

```
GET /arca/server-status
```

Verifica la conexión con los servidores de AFIP/ARCA.

**Respuesta:**

```json
{
  "success": true,
  "serverStatus": {
    "AppServer": "OK",
    "DbServer": "OK",
    "AuthServer": "OK"
  }
}
```

### 2. Crear Factura Electrónica

```
POST /arca/factura
```

**Body:**

```json
{
  "ImpTotal": 121,
  "ImpNeto": 100,
  "ImpIVA": 21,
  "Iva": [
    {
      "Id": 5,
      "BaseImp": 100,
      "Importe": 21
    }
  ]
}
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "CAE": "12345678901234",
    "CAEFchVto": "20240115",
    "CbteDesde": 1,
    "CbteHasta": 1
  }
}
```

### 3. Obtener Último Número de Comprobante

```
GET /arca/ultimo-comprobante?ptoVta=1&cbteTipo=11
```

**Parámetros:**

- `ptoVta`: Punto de venta (default: 1)
- `cbteTipo`: Tipo de comprobante (11 = Factura C)

### 4. Obtener Tipos de Comprobantes

```
GET /arca/tipos-comprobante
```

### 5. Obtener Puntos de Venta

```
GET /arca/puntos-venta
```

### 6. Obtener Información de un Comprobante

```
GET /arca/comprobante/:id
```

## 🔧 Tipos de Comprobantes

| Código | Descripción       |
| ------ | ----------------- |
| 1      | Factura A         |
| 6      | Factura B         |
| 11     | Factura C         |
| 19     | Factura E         |
| 2      | Nota de Débito A  |
| 3      | Nota de Crédito A |

## 💡 Ejemplo de Uso Completo

```typescript
// 1. Verificar conexión
const status = await fetch('http://localhost:3000/arca/server-status')
console.log(await status.json())

// 2. Obtener último número de comprobante
const last = await fetch('http://localhost:3000/arca/ultimo-comprobante')
console.log(await last.json())

// 3. Crear factura
const factura = await fetch('http://localhost:3000/arca/factura', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ImpTotal: 121,
    ImpNeto: 100,
    ImpIVA: 21,
    Iva: [{ Id: 5, BaseImp: 100, Importe: 21 }]
  })
})
console.log(await factura.json())
```

## 🎯 Próximos Pasos

1. **Configurar certificados** según las instrucciones anteriores
2. **Probar la conexión** con el endpoint `/arca/server-status`
3. **Crear facturas de prueba** en el ambiente de homologación
4. **Validar con AFIP** que las facturas se crean correctamente
5. **Pasar a producción** cambiando `production: true` en la configuración

## 📚 Documentación Adicional

- [Documentación oficial del SDK](https://docs.afipsdk.com)
- [Web Service Factura Electrónica](https://docs.afipsdk.com/siguientes-pasos/web-services/factura-electronica)
- [Portal de AFIP](https://www.afip.gob.ar/ws/)

## ⚠️ Notas Importantes

- **NUNCA** commitear certificados o claves privadas al repositorio
- Usar variables de entorno para datos sensibles
- Probar siempre en ambiente de homologación primero
- Validar los datos antes de enviarlos a producción
- El CUIT de prueba proporcionado es solo un ejemplo

## 🐛 Solución de Problemas

### Error: "Invalid certificate"

- Verificar que los archivos de certificado existan en las rutas especificadas
- Verificar que el certificado esté habilitado en AFIP

### Error: "Service not enabled"

- Habilitar el servicio "wsfe" en el Administrador de Relaciones de AFIP

### Error: "Invalid CUIT"

- Verificar que el CUIT esté correctamente configurado
- Para pruebas, usar un CUIT de homologación válido
