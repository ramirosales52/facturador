#!/usr/bin/env node

/**
 * Script de ejemplo para configurar certificados de desarrollo de AFIP/ARCA
 *
 * USO:
 * 1. Asegúrate de que el servidor esté corriendo: npm run dev
 * 2. Ejecuta este script: node scripts/setup-dev-certificates.js
 */

const readline = require('node:readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const API_BASE_URL = 'http://localhost:3000'

function pregunta(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

async function crearCertificado() {
  console.log('\n=== PASO 1: Crear Certificado de Desarrollo ===\n')

  const cuit = await pregunta('Ingrese su CUIT (sin guiones, ej: 20123456789): ')
  const username = await pregunta('Ingrese su username de ARCA (normalmente el mismo CUIT): ')
  const password = await pregunta('Ingrese su contraseña de ARCA: ')
  const alias = await pregunta('Ingrese un alias para el certificado (ej: afipsdkcert): ') || 'afipsdkcert'

  console.log('\n⏳ Creando certificado...\n')

  try {
    const response = await fetch(`${API_BASE_URL}/arca/crear-certificado-dev`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cuit: username,
        username,
        password,
        alias,
      }),
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Certificado creado exitosamente!\n')
      console.log('📁 Certificados guardados en:')
      console.log(`   - ${result.certPath}`)
      console.log(`   - ${result.keyPath}\n`)

      return { cuit, username, password, alias, success: true }
    }
    else {
      console.error('❌ Error al crear certificado:', result.error)
      return { success: false }
    }
  }
  catch (error) {
    console.error('❌ Error de conexión:', error.message)
    console.log('\n💡 Asegúrate de que el servidor esté corriendo: npm run dev\n')
    return { success: false }
  }
}

async function autorizarWebService(datos) {
  console.log('\n=== PASO 2: Autorizar Web Service ===\n')

  const service = await pregunta('Ingrese el ID del web service a autorizar (ej: wsfe): ') || 'wsfe'

  console.log('\n⏳ Autorizando web service...\n')

  try {
    const response = await fetch(`${API_BASE_URL}/arca/autorizar-web-service-dev`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cuit: datos.cuit,
        username: datos.username,
        password: datos.password,
        alias: datos.alias,
        service,
      }),
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Web service autorizado exitosamente!\n')
      return true
    }
    else {
      console.error('❌ Error al autorizar web service:', result.error)
      return false
    }
  }
  catch (error) {
    console.error('❌ Error de conexión:', error.message)
    return false
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║   Configuración de Certificados de Desarrollo AFIP/ARCA  ║')
  console.log('╚══════════════════════════════════════════════════════════╝\n')

  console.log('Este script te ayudará a configurar los certificados de desarrollo.')
  console.log('Necesitas tener habilitado el "Administrador de certificados de testing"')
  console.log('en tu cuenta de ARCA.\n')

  const continuar = await pregunta('¿Deseas continuar? (s/n): ')
  if (continuar.toLowerCase() !== 's') {
    console.log('Operación cancelada.')
    rl.close()
    return
  }

  // Paso 1: Crear certificado
  const certResult = await crearCertificado()

  if (!certResult.success) {
    console.log('\n❌ No se pudo crear el certificado. Por favor, verifica los datos e intenta de nuevo.\n')
    rl.close()
    return
  }

  // Paso 2: Autorizar web service
  const authSuccess = await autorizarWebService(certResult)

  if (!authSuccess) {
    console.log('\n⚠️  El certificado fue creado pero no se pudo autorizar el web service.')
    console.log('Puedes intentar autorizarlo manualmente más tarde.\n')
  }

  // Paso 3: Instrucciones finales
  console.log('\n=== PASO 3: Configurar la Aplicación ===\n')
  console.log('Para usar estos certificados, actualiza tu configuración:')
  console.log('\n1. Edita src/api/arca/arca.config.ts y cambia el CUIT:')
  console.log(`   CUIT: ${certResult.cuit},\n`)
  console.log('O configura la variable de entorno:')
  console.log(`   export AFIP_CUIT=${certResult.cuit}\n`)
  console.log('2. Reinicia la aplicación\n')
  console.log('3. ¡Listo! Ya puedes usar los servicios de AFIP con tu propio CUIT\n')

  rl.close()
}

// Ejecutar
main().catch((error) => {
  console.error('Error inesperado:', error)
  rl.close()
  process.exit(1)
})
