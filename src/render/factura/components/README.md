# Componentes de Facturación

Esta carpeta contiene los componentes modulares extraídos del componente principal `CrearFactura.tsx`.

## Estructura de Componentes

### ConexionStatus.tsx (51 líneas)
Componente para verificar y mostrar el estado de conexión con ARCA/AFIP.
- **Props**: `conexionStatus`, `loading`, `onVerificar`
- **Responsabilidad**: Interfaz para verificar la conectividad con el servidor

### FacturaForm.tsx (127 líneas)
Formulario principal para crear facturas.
- **Props**: `formData`, `loading`, `error`, `onInputChange`, `onSubmit`, `onCalcularIVA`, `onLimpiar`
- **Responsabilidad**: Captura de datos de la factura (CUIT, importes, IVA)

### FacturaResultado.tsx (53 líneas)
Componente contenedor que muestra el resultado de la creación de factura.
- **Props**: `resultado`, `qrUrl`, `pdfUrl`, `onGenerarPDF`
- **Responsabilidad**: Orquestar la visualización del resultado exitoso o error
- **Subcomponentes**: Usa `QRCode` y `PDFActions`

### QRCode.tsx (26 líneas)
Componente para mostrar el código QR de verificación AFIP.
- **Props**: `qrUrl`
- **Responsabilidad**: Renderizar el QR y enlace de verificación

### PDFActions.tsx (66 líneas)
Componente para las acciones relacionadas con el PDF.
- **Props**: `pdfUrl`, `onGenerar`
- **Responsabilidad**: Botón para generar PDF y acciones (copiar, abrir)

### InformacionCard.tsx (16 líneas)
Card informativa sobre tipos de factura y términos.
- **Props**: Ninguna (componente estático)
- **Responsabilidad**: Mostrar información útil al usuario

### facturaTemplate.ts (119 líneas)
Template HTML para la generación del PDF de factura.
- **Exports**: `generarHTMLFactura()`, `FacturaPDFData`
- **Responsabilidad**: Generar el HTML formateado para el PDF según estándares AFIP

### index.tsx (10 líneas)
Archivo barrel para exportar todos los componentes.
- **Exports**: Todos los componentes y tipos principales

## Flujo de Datos

```
CrearFactura (componente principal)
├── ConexionStatus (verificación ARCA/AFIP)
├── FacturaForm (ingreso de datos)
└── FacturaResultado (mostrar resultado)
    ├── QRCode (código QR)
    └── PDFActions (generar/descargar PDF)
        └── facturaTemplate (HTML del PDF)
```

## Ventajas de la Modularización

1. **Mantenibilidad**: Cada componente tiene una responsabilidad única y clara
2. **Reusabilidad**: Los componentes pueden ser reutilizados en otras partes de la app
3. **Testabilidad**: Es más fácil escribir tests unitarios para componentes pequeños
4. **Legibilidad**: El código es más fácil de entender y navegar
5. **Escalabilidad**: Facilita agregar nuevas funcionalidades sin afectar otros componentes

## Resumen de Líneas

- **Antes**: 413 líneas en un solo archivo
- **Después**: 190 líneas en el archivo principal + 468 líneas distribuidas en componentes
- **Promedio por archivo**: ~58 líneas por componente
