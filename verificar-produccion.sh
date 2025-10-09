#!/bin/bash

# Script de verificación para producción
# Ejecutar antes de usar el sistema en producción

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║     🔍 VERIFICACIÓN DE CONFIGURACIÓN DE PRODUCCIÓN       ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
WARNINGS=0
ERRORS=0
OK=0

echo "📋 Verificando configuración..."
echo ""

# 1. Verificar archivo .env
echo -n "1. Archivo .env existe: "
if [ -f .env ]; then
    echo -e "${GREEN}✓ OK${NC}"
    ((OK++))
    
    # Verificar variables en .env
    echo -n "   - AFIP_CUIT configurado: "
    if grep -q "AFIP_CUIT=" .env && ! grep -q "AFIP_CUIT=$" .env; then
        echo -e "${GREEN}✓ OK${NC}"
        ((OK++))
    else
        echo -e "${RED}✗ FALTA${NC}"
        ((ERRORS++))
    fi
    
    echo -n "   - AFIP_PRODUCTION=true: "
    if grep -q "AFIP_PRODUCTION=true" .env; then
        echo -e "${GREEN}✓ OK${NC}"
        ((OK++))
    else
        echo -e "${YELLOW}⚠ WARNING${NC} (debería ser true para producción)"
        ((WARNINGS++))
    fi
    
    echo -n "   - AFIP_CERT_PATH configurado: "
    if grep -q "AFIP_CERT_PATH=" .env && ! grep -q "AFIP_CERT_PATH=$" .env; then
        echo -e "${GREEN}✓ OK${NC}"
        ((OK++))
    else
        echo -e "${RED}✗ FALTA${NC}"
        ((ERRORS++))
    fi
    
    echo -n "   - AFIP_KEY_PATH configurado: "
    if grep -q "AFIP_KEY_PATH=" .env && ! grep -q "AFIP_KEY_PATH=$" .env; then
        echo -e "${GREEN}✓ OK${NC}"
        ((OK++))
    else
        echo -e "${RED}✗ FALTA${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗ NO EXISTE${NC}"
    echo "   Ejecuta: cp .env.example .env"
    ((ERRORS++))
fi

echo ""

# 2. Verificar certificados
echo -n "2. Directorio certificates existe: "
if [ -d certificates ]; then
    echo -e "${GREEN}✓ OK${NC}"
    ((OK++))
    
    echo -n "   - certificate.crt existe: "
    if [ -f certificates/certificate.crt ]; then
        echo -e "${GREEN}✓ OK${NC}"
        ((OK++))
    else
        echo -e "${YELLOW}⚠ NO ENCONTRADO${NC} (puede estar en otra ubicación)"
        ((WARNINGS++))
    fi
    
    echo -n "   - private_key.key existe: "
    if [ -f certificates/private_key.key ]; then
        echo -e "${GREEN}✓ OK${NC}"
        ((OK++))
    else
        echo -e "${YELLOW}⚠ NO ENCONTRADO${NC} (puede estar en otra ubicación)"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠ NO EXISTE${NC} (certificados pueden estar en otra ubicación)"
    ((WARNINGS++))
fi

echo ""

# 3. Verificar configuración en código
echo -n "3. arca.config.ts production=true: "
if grep -q "production: true" src/api/arca/arca.config.ts; then
    echo -e "${GREEN}✓ OK${NC}"
    ((OK++))
else
    echo -e "${RED}✗ FALTA${NC}"
    echo "   El archivo debe tener production: true"
    ((ERRORS++))
fi

echo ""

# 4. Verificar que no hay datos mock
echo -n "4. Sin datos mock en arca.service.ts: "
if ! grep -q "contribuyentesMock" src/api/arca/arca.service.ts; then
    echo -e "${GREEN}✓ OK${NC}"
    ((OK++))
else
    echo -e "${RED}✗ TODAVÍA HAY DATOS MOCK${NC}"
    ((ERRORS++))
fi

echo ""

# 5. Verificar node_modules
echo -n "5. Dependencias instaladas (node_modules): "
if [ -d node_modules ]; then
    echo -e "${GREEN}✓ OK${NC}"
    ((OK++))
else
    echo -e "${RED}✗ NO INSTALADAS${NC}"
    echo "   Ejecuta: npm install"
    ((ERRORS++))
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 RESUMEN:"
echo -e "   ${GREEN}✓ OK:${NC} $OK"
echo -e "   ${YELLOW}⚠ Advertencias:${NC} $WARNINGS"
echo -e "   ${RED}✗ Errores:${NC} $ERRORS"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ¡Sistema listo para producción!${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "1. Ejecuta: npm run dev"
    echo "2. Click en 'Verificar Conexión'"
    echo "3. Crea tu primera factura"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Sistema casi listo (hay advertencias)${NC}"
    echo ""
    echo "Revisa las advertencias arriba y corrige si es necesario."
    exit 0
else
    echo -e "${RED}❌ Sistema NO listo para producción${NC}"
    echo ""
    echo "Debes corregir los errores antes de continuar."
    echo "Ver CONFIGURACION_RAPIDA.md para más detalles."
    exit 1
fi
