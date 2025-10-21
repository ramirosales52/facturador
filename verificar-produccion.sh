#!/bin/bash

echo "🔍 Verificando configuración para producción..."
echo ""

# 1. CUITs de prueba
echo "1. Verificando CUITs de prueba..."
if grep -rq "20409378472\|20111111112" src/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
    echo "   ❌ ADVERTENCIA: Se encontraron CUITs de prueba en el código"
else
    echo "   ✅ No se encontraron CUITs de prueba"
fi

# 2. Configuración de ambiente
echo ""
echo "2. Verificando configuración de ambiente..."
if grep -q "production: process.env.AFIP_PRODUCTION === 'true'" src/api/arca/arca.config.ts; then
    echo "   ✅ Configuración de ambiente correcta"
else
    echo "   ❌ ERROR: Configuración de ambiente incorrecta"
fi

# 3. CUIT desde env
echo ""
echo "3. Verificando CUIT desde variable de entorno..."
if grep -q "process.env.AFIP_CUIT" src/api/arca/arca.config.ts; then
    echo "   ✅ CUIT se lee desde variable de entorno"
else
    echo "   ❌ ERROR: CUIT no se lee desde variable de entorno"
fi

# 4. Archivos .env
echo ""
echo "4. Verificando archivo .env..."
if [ -f .env ]; then
    if grep -q "AFIP_CUIT=$" .env || grep -q 'AFIP_CUIT=""' .env; then
        echo "   ✅ .env está limpio (sin CUIT de prueba)"
    else
        echo "   ⚠️  ADVERTENCIA: .env contiene un CUIT configurado"
    fi
else
    echo "   ⚠️  ADVERTENCIA: No existe archivo .env"
fi

# 5. DTOs de producción
echo ""
echo "5. Verificando DTOs de producción..."
if [ -f src/api/arca/dto/create-cert-prod.dto.ts ] && [ -f src/api/arca/dto/auth-web-service-prod.dto.ts ]; then
    echo "   ✅ DTOs de producción creados"
else
    echo "   ❌ ERROR: Faltan DTOs de producción"
fi

# 6. Endpoints de producción
echo ""
echo "6. Verificando endpoints de producción..."
if grep -q "crear-certificado-prod" src/api/arca/arca.controller.ts && grep -q "autorizar-web-service-prod" src/api/arca/arca.controller.ts; then
    echo "   ✅ Endpoints de producción implementados"
else
    echo "   ❌ ERROR: Faltan endpoints de producción"
fi

# 7. Documentación
echo ""
echo "7. Verificando documentación..."
if [ -f GUIA_PRODUCCION.md ]; then
    echo "   ✅ Guía de producción creada"
else
    echo "   ⚠️  ADVERTENCIA: Falta guía de producción"
fi

echo ""
echo "============================================"
echo "✅ Verificación completa"
echo "============================================"
echo ""
echo "Próximos pasos:"
echo "1. Configurar CUIT real en .env"
echo "2. Configurar AFIP_SDK_ACCESS_TOKEN en .env"
echo "3. Generar certificado de producción"
echo "4. Autorizar web service de producción"
echo "5. Cambiar AFIP_PRODUCTION=true en .env"
echo ""
echo "Ver GUIA_PRODUCCION.md para instrucciones detalladas"
