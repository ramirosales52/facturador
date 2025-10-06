#!/usr/bin/env node

/**
 * Script para generar certificados de prueba de AFIP/ARCA
 * 
 * Uso: node scripts/generar-certificados.js
 */

import Afip from '@afipsdk/afip.js';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CUIT_PRUEBA = 20409378472; // Reemplazar con tu CUIT de prueba

async function generarCertificados() {
  console.log('🔐 Generando certificados de prueba para AFIP/ARCA...\n');
  
  try {
    // Crear carpeta de certificados si no existe
    const certDir = join(process.cwd(), 'certificates');
    if (!existsSync(certDir)) {
      mkdirSync(certDir, { recursive: true });
      console.log('✅ Carpeta "certificates" creada\n');
    }

    // Configurar AFIP SDK
    const afip = new Afip({ 
      CUIT: CUIT_PRUEBA,
      production: false // Ambiente de prueba
    });

    console.log(`📝 Generando certificado para CUIT: ${CUIT_PRUEBA}`);
    console.log('⏳ Este proceso puede tardar unos segundos...\n');

    // Generar certificado
    await afip.CreateCert();

    console.log('✅ ¡Certificados generados exitosamente!\n');
    console.log('📂 Los certificados se encuentran en:');
    console.log(`   - ${join(certDir, 'cert')}`);
    console.log(`   - ${join(certDir, 'key')}\n`);

    console.log('📋 Próximos pasos:');
    console.log('   1. Verifica que los archivos se hayan creado correctamente');
    console.log('   2. Actualiza la configuración en src/api/arca/arca.config.ts');
    console.log('   3. Asegúrate de NO commitear estos archivos al repositorio');
    console.log('   4. Habilita el servicio "wsfe" en el portal de AFIP\n');

    console.log('🔗 Enlaces útiles:');
    console.log('   - Portal AFIP: https://www.afip.gob.ar/ws/');
    console.log('   - Documentación: https://docs.afipsdk.com/\n');

  } catch (error) {
    console.error('❌ Error al generar certificados:', error.message);
    console.error('\n💡 Posibles soluciones:');
    console.error('   - Verifica que el CUIT sea válido');
    console.error('   - Asegúrate de tener conexión a internet');
    console.error('   - Verifica que openssl esté instalado en tu sistema\n');
    process.exit(1);
  }
}

// Ejecutar
generarCertificados();
