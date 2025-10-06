# 🚀 Inicio Rápido - AFIP/ARCA Facturación Electrónica

## ✅ Ya está todo integrado, solo faltan 3 pasos:

### 1️⃣ Configurar tu CUIT
```typescript
// Archivo: src/api/arca/arca.config.ts
export const ArcaConfig = {
  CUIT: 20409378472, // ← CAMBIAR por tu CUIT de prueba
  production: false,
  cert: 'certificates/certificate.crt',
  key: 'certificates/private_key.key',
};
```

### 2️⃣ Generar certificados (la forma más simple)
```bash
# Opción automática con el SDK (recomendado para pruebas):
node scripts/generar-certificados.js

# Los certificados se crearán en: certificates/
```

### 3️⃣ Habilitar servicio en AFIP
1. Ir a: https://auth.afip.gob.ar/
2. "Administrador de Relaciones de Clave Fiscal"
3. Habilitar servicio **"wsfe"**

---

## 🧪 Probar que funciona

```bash
# Iniciar la aplicación
npm run dev
```

En otra terminal o navegador:
```bash
# 1. Verificar conexión
curl http://localhost:3000/arca/server-status

# 2. Crear una factura de prueba
curl -X POST http://localhost:3000/arca/factura \
  -H "Content-Type: application/json" \
  -d '{
    "ImpTotal": 121,
    "ImpNeto": 100,
    "ImpIVA": 21,
    "Iva": [{"Id": 5, "BaseImp": 100, "Importe": 21}]
  }'
```

---

## 📋 Endpoints disponibles

- `GET  /arca/server-status` - Verificar conexión
- `POST /arca/factura` - Crear factura
- `GET  /arca/ultimo-comprobante` - Último número
- `GET  /arca/tipos-comprobante` - Tipos disponibles
- `GET  /arca/puntos-venta` - Puntos de venta
- `GET  /arca/comprobante/:id` - Consultar factura

---

## 📚 Más información

- **Documentación completa**: `src/api/arca/README.md`
- **Ejemplos de código**: `src/api/arca/ejemplos-uso.ts`
- **Resumen completo**: `INTEGRACION-AFIP.md`

---

## 💡 Tipos de facturas comunes

```typescript
// Factura C (consumidor final) - LA MÁS SIMPLE
{
  ImpTotal: 121,
  ImpNeto: 100,
  ImpIVA: 21,
  Iva: [{ Id: 5, BaseImp: 100, Importe: 21 }]
}

// Factura B (responsable inscripto)
{
  CbteTipo: 6,
  DocTipo: 80,
  DocNro: 20123456789,
  ImpTotal: 121,
  ImpNeto: 100,
  ImpIVA: 21,
  Iva: [{ Id: 5, BaseImp: 100, Importe: 21 }]
}
```

---

**🎉 ¡Listo para facturar electrónicamente!**
