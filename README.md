# 🧾 Facturador Electrónico AFIP/ARCA

Sistema completo de facturación electrónica integrado con AFIP (ahora ARCA) para Argentina, construido con **Electron**, **NestJS**, **React**, **Shadcn UI** y **Tailwind CSS**.

## ✨ Características

- ✅ Integración completa con SDK oficial de AFIP
- ✅ Facturación electrónica (Facturas A, B, C)
- ✅ Interfaz moderna y responsive con Shadcn UI
- ✅ Cálculo automático de IVA y totales
- ✅ Verificación de estado del servidor AFIP
- ✅ Manejo de errores y validaciones
- ✅ Listo para producción
- ✅ Documentación completa en español

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 18+
- npm 9+
- CUIT registrado en AFIP
- Certificados de AFIP para producción (ver guía de configuración)

### Instalación

```bash
# Clonar o navegar al proyecto
cd facturador

# Instalar dependencias
npm install
```

### Configuración

1. **Configurar Variables de Entorno**
   ```bash
   # Copiar archivo de ejemplo
   cp .env.example .env
   
   # Editar .env con tus datos de producción
   AFIP_CUIT=TU_CUIT_AQUI
   AFIP_PRODUCTION=true
   AFIP_CERT_PATH=ruta/al/certificado.crt
   AFIP_KEY_PATH=ruta/a/clave_privada.key
   ```

2. **Generar Certificados de Producción**
   - Seguir guía en: https://www.afip.gob.ar/ws/documentacion/certificados.asp
   - Guardar certificados fuera del repositorio

3. **Habilitar Servicio en AFIP**
   - Ir a https://auth.afip.gob.ar/
   - "Administrador de Relaciones de Clave Fiscal"
   - Habilitar servicio **"wsfe"** en producción

### Ejecutar

```bash
npm run dev
```

La aplicación se abrirá automáticamente en tu navegador.

## 📚 Documentación

- **[INICIO-RAPIDO.md](INICIO-RAPIDO.md)** - Guía de configuración inicial (3 pasos)
- **[GUIA-COMPLETA.md](GUIA-COMPLETA.md)** - Documentación completa del sistema
- **[INTEGRACION-AFIP.md](INTEGRACION-AFIP.md)** - Detalles técnicos del backend
- **[FRONTEND-README.md](FRONTEND-README.md)** - Documentación del frontend
- **[src/api/arca/README.md](src/api/arca/README.md)** - API endpoints y ejemplos

## 🏗️ Arquitectura

### Backend (NestJS)
- **Módulo ARCA**: Integración con AFIP SDK
- **Endpoints REST**: API para crear y consultar facturas
- **DTOs**: Validación de datos
- **Configuración**: Centralizada y segura

### Frontend (React)
- **Hook useArca**: Gestión de llamadas a API
- **Formulario**: Interfaz intuitiva para facturación
- **Componentes Shadcn UI**: Button, Input, Card, Select, Label
- **Tailwind CSS**: Estilos modernos y responsive

## 📡 API Endpoints

```
GET    /arca/server-status          Verificar conexión AFIP
POST   /arca/factura                Crear factura electrónica
GET    /arca/ultimo-comprobante     Obtener último número
GET    /arca/tipos-comprobante      Listar tipos disponibles
GET    /arca/puntos-venta           Listar puntos de venta
GET    /arca/comprobante/:id        Consultar comprobante
```

## 💻 Ejemplo de Uso

### Crear Factura desde el Frontend

```typescript
import { useArca } from '../hooks/useArca';

const { loading, crearFactura } = useArca();

const resultado = await crearFactura({
  ImpTotal: 121,
  ImpNeto: 100,
  ImpIVA: 21,
  Iva: [{ Id: 5, BaseImp: 100, Importe: 21 }]
});

console.log(resultado.data.CAE); // Código de Autorización
```

### Crear Factura desde el Backend (API REST)

```bash
curl -X POST http://localhost:3000/arca/factura \
  -H "Content-Type: application/json" \
  -d '{
    "ImpTotal": 121,
    "ImpNeto": 100,
    "ImpIVA": 21,
    "Iva": [{"Id": 5, "BaseImp": 100, "Importe": 21}]
  }'
```

## 🛠️ Stack Tecnológico

- **Backend**: NestJS + @afipsdk/afip.js
- **Frontend**: React 19 + TypeScript
- **UI**: Shadcn UI + Tailwind CSS 4
- **Desktop**: Electron 38
- **HTTP Client**: Axios
- **Build Tool**: Vite 7

## 📁 Estructura del Proyecto

```
facturador/
├── src/
│   ├── api/arca/              # Backend - Integración AFIP
│   │   ├── arca.service.ts
│   │   ├── arca.controller.ts
│   │   ├── arca.config.ts
│   │   └── dto/
│   ├── render/                # Frontend - React
│   │   ├── factura/
│   │   │   └── CrearFactura.tsx
│   │   ├── hooks/
│   │   │   └── useArca.ts
│   │   └── components/ui/
│   └── main/                  # Electron Main
├── scripts/
│   └── generar-certificados.js
└── docs/                      # Documentación
```

## 🔒 Seguridad

- ✅ Certificados excluidos del repositorio (`.gitignore`)
- ✅ Variables de entorno para datos sensibles
- ✅ Configurado para producción
- ✅ Validación de datos en frontend y backend

## 🎯 Tipos de Comprobantes Soportados

| Tipo | Código | Descripción |
|------|--------|-------------|
| Factura A | 1 | Responsable inscripto |
| Factura B | 6 | Monotributista, IVA exento |
| Factura C | 11 | Consumidor final |
| Nota Crédito A | 3 | Anulación Factura A |
| Nota Crédito B | 8 | Anulación Factura B |
| Nota Crédito C | 13 | Anulación Factura C |

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es de uso libre para desarrollo y pruebas.

## 🆘 Soporte

Si encuentras algún problema:

1. Revisa la [Guía Completa](GUIA-COMPLETA.md)
2. Verifica la [documentación de AFIP SDK](https://docs.afipsdk.com/)
3. Consulta el [portal de AFIP](https://www.afip.gob.ar/ws/)

## ⚠️ Disclaimer

Este sistema está configurado para producción. Asegúrate de cumplir con todas las regulaciones de AFIP/ARCA. Para ambiente de homologación/pruebas, cambiar `AFIP_PRODUCTION=false` en las variables de entorno y usar certificados de homologación.

---

**Desarrollado con ❤️ para la comunidad Argentina**

🔗 Links útiles:
- [Documentación AFIP SDK](https://docs.afipsdk.com/)
- [Portal AFIP](https://www.afip.gob.ar/ws/)
- [Shadcn UI](https://ui.shadcn.com/)
