import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import Afip from '@afipsdk/afip.js'
import { Injectable } from '@nestjs/common'
import { ArcaConfig } from './arca.config'
import { CreateArcaDto } from './dto/create-arca.dto'

@Injectable()
export class ArcaService {
  private afip: Afip
  private cuitActual?: number

  constructor() {
    console.log('ℹ️  CUIT no configurado. Se debe configurar desde la interfaz de usuario.')
  }

  configurarCUIT(cuit: number) {
    this.cuitActual = cuit
    const { certContent, keyContent } = this.loadCertificates(cuit)

    const config: any = {
      CUIT: cuit,
      production: ArcaConfig.production,
      cert: certContent,
      key: keyContent,
    }

    if (ArcaConfig.production) {
      config.access_token = this.getAccessToken()
    }

    this.afip = new Afip(config)
    console.log(`✅ AFIP SDK configurado con CUIT: ${cuit}`)
  }

  getCUITActual(): number | undefined {
    return this.cuitActual
  }

  private getAccessToken(): string {
    const token = process.env.AFIP_SDK_ACCESS_TOKEN
    if (!token) {
      throw new Error('AFIP_SDK_ACCESS_TOKEN es obligatorio en producción')
    }
    return token
  }

  private getCertsDir(): string {
    return join(homedir(), 'afip-certs')
  }

  private getCertPaths(cuit: number): { certPath: string; keyPath: string } {
    const certsDir = this.getCertsDir()
    const suffix = ArcaConfig.production ? 'prod' : 'dev'
    return {
      certPath: join(certsDir, `${cuit}_${suffix}.crt`),
      keyPath: join(certsDir, `${cuit}_${suffix}.key`),
    }
  }

  private loadCertificates(cuit: number): { certContent: string; keyContent: string } {
    const { certPath, keyPath } = this.getCertPaths(cuit)

    if (!existsSync(certPath) || !existsSync(keyPath)) {
      throw new Error(`No se encontraron certificados para CUIT ${cuit}`)
    }

    return {
      certContent: readFileSync(certPath, 'utf8'),
      keyContent: readFileSync(keyPath, 'utf8'),
    }
  }

  private ensureAfipConfigured(): void {
    if (!this.afip) {
      throw new Error('AFIP SDK no está configurado. Configure el CUIT primero.')
    }
  }

  private handleError(error: any, defaultMessage: string): { success: false; error: string } {
    console.error(`${defaultMessage}:`, error)

    let errorMessage = defaultMessage
    if (error.data?.data?.message) {
      errorMessage = error.data.data.message
    } else if (error.data?.data_errors?.params) {
      errorMessage = `Error de validación: ${JSON.stringify(error.data.data_errors.params)}`
    } else if (error.message) {
      errorMessage = error.message
    }

    return { success: false, error: errorMessage }
  }

  /**
   * Consultar datos de un contribuyente por CUIT
   * NOTA: Esta funcionalidad requiere servicios de padrón que pueden no estar disponibles
   * para todos los CUITs. Si falla, el usuario debe ingresar los datos manualmente.
   */
  async consultarContribuyente(cuit: number) {
    try {
      if (!this.afip) {
        throw new Error('AFIP SDK no está configurado. Configure el CUIT primero.')
      }

      const ws = this.afip.WebService('ws_sr_padron_a13')
      const token = await ws.getTokenAuthorization()

      // Realizar la consulta a AFIP
      const response = await ws.executeRequest('getPersona', {
        token: token.token,
        sign: token.sign,
        cuitRepresentada: this.cuitActual,
        idPersona: cuit
      })

      // Validar que haya datos
      const persona = response?.personaReturn?.persona
      if (!persona) {
        return {
          success: false,
          error: 'No se encontraron datos para el CUIT especificado',
        }
      }

      // Obtener domicilio
      const domicilio = persona.domicilio?.[0] ?? {}

      // Construir datos para el front
      const datosContribuyente = {
        cuit: persona.idPersona,
        razonSocial: `${persona.nombre ?? ''} ${persona.apellido ?? ''}`.trim(),
        domicilio: `${domicilio.direccion ?? domicilio.calle ?? ''}, ${domicilio.localidad ?? ''}, ${domicilio.descripcionProvincia ?? ''}, CP: ${domicilio.codigoPostal ?? ''}`.replace(/^, |, $/g, ''),
        tipoPersona: persona.tipoPersona,
        tipoDocumento: persona.tipoDocumento,
        numeroDocumento: persona.numeroDocumento,
        estadoClave: persona.estadoClave
      }

      return {
        success: true,
        data: datosContribuyente
      }

    } catch (error: any) {
      console.error('Error al consultar contribuyente:', error)
      return {
        success: false,
        error: error.message ?? 'Error al consultar CUIT'
      }
    }
  }

  /**
   * Determinar condición IVA según impuestos inscriptos
   */
  private determinarCondicionIVA(data: any): number {
    // Buscar si tiene IVA inscripto (idImpuesto: 30)
    const tieneIVA = data.impuestos?.some((imp: any) => imp.idImpuesto === 30)

    if (tieneIVA) {
      return 1 // Responsable Inscripto
    }
    else if (data.categoriaMonotributo) {
      return 6 // Responsable Monotributo
    }
    else {
      return 5 // Consumidor Final / Exento
    }
  }

  /**
   * Helper para manejar errores de forma consistente
   */
  private handleError(error: unknown): { success: false, error: string } {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return {
      success: false,
      error: errorMessage,
    }
  }

  /**
   * Crear una nueva factura electrónica
   */
  async create(createArcaDto: CreateArcaDto) {
    try {
      // Obtener el último número de comprobante
      const ptoVta = createArcaDto.PtoVta || 1
      const cbteTipo = createArcaDto.CbteTipo || 11
      const lastVoucher = await this.afip.ElectronicBilling.getLastVoucher(ptoVta, cbteTipo)

      // Usar DocTipo y Concepto del DTO si vienen, si no usar por defecto
      const docTipo = createArcaDto.DocTipo || 80
      const concepto = createArcaDto.Concepto || 1
      let condicionIVAReceptorId = createArcaDto.CondicionIVAReceptorId

      if (!condicionIVAReceptorId) {
        // Lógica automática según tipo de comprobante y documento
        if (cbteTipo === 1 || cbteTipo === 2 || cbteTipo === 3) {
          // Factura A, Nota Débito A, Nota Crédito A
          condicionIVAReceptorId = 1 // Responsable Inscripto
        }
        else if (cbteTipo === 6 || cbteTipo === 7 || cbteTipo === 8) {
          // Factura B, Nota Débito B, Nota Crédito B
          // Para Factura B con CUIT, usar Consumidor Final (5)
          // AFIP requiere que Factura B siempre use Consumidor Final
          condicionIVAReceptorId = 5
        }
        else if (cbteTipo === 11 || cbteTipo === 12 || cbteTipo === 13) {
          // Factura C, Nota Débito C, Nota Crédito C
          condicionIVAReceptorId = 5 // Consumidor Final
        }
        else {
          // Por defecto
          condicionIVAReceptorId = 5
        }
      }

      // Datos de la factura con valores por defecto
      const data = {
        CantReg: 1, // Cantidad de comprobantes a registrar
        PtoVta: ptoVta, // Punto de venta
        CbteTipo: cbteTipo, // Tipo de comprobante
        Concepto: concepto, // Concepto (1 = Productos, 2 = Servicios, 3 = Ambos)
        DocTipo: docTipo, // Tipo de documento del comprador
        DocNro: createArcaDto.DocNro || 0, // Número de documento
        CondicionIVAReceptorId: condicionIVAReceptorId, // Condición IVA del receptor
        CbteDesde: lastVoucher + 1, // Número de comprobante desde
        CbteHasta: lastVoucher + 1, // Número de comprobante hasta
        CbteFch: Number.parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, '')), // Fecha formato YYYYMMDD
        ImpTotal: createArcaDto.ImpTotal, // Importe total
        ImpTotConc: createArcaDto.ImpTotConc || 0, // Importe neto no gravado
        ImpNeto: createArcaDto.ImpNeto, // Importe neto gravado
        ImpOpEx: createArcaDto.ImpOpEx || 0, // Importe exento
        ImpIVA: createArcaDto.ImpIVA, // Importe de IVA
        ImpTrib: createArcaDto.ImpTrib || 0, // Importe de tributos
        MonId: createArcaDto.MonId || 'PES', // Moneda (PES = Pesos)
        MonCotiz: createArcaDto.MonCotiz || 1, // Cotización de la moneda
        Iva: createArcaDto.Iva || [
          {
            Id: 5, // ID del tipo de IVA (5 = 21%)
            BaseImp: createArcaDto.ImpNeto, // Base imponible
            Importe: createArcaDto.ImpIVA, // Importe de IVA
          },
        ],
      }

      const result = await this.afip.ElectronicBilling.createVoucher(data)

      // Devolver información completa del comprobante
      return {
        success: true,
        data: {
          CAE: result.CAE,
          CAEFchVto: result.CAEFchVto,
          CbteDesde: data.CbteDesde,
          CbteHasta: data.CbteHasta,
          PtoVta: data.PtoVta,
          CbteTipo: data.CbteTipo,
          DocTipo: data.DocTipo,
          DocNro: data.DocNro,
          ImpTotal: data.ImpTotal,
          FchProceso: result.FchProceso || new Date().toISOString().split('T')[0],
          fullResponse: result, // Respuesta completa por si se necesita
        },
      }
    }
    catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Generar código QR según especificaciones de AFIP
   */
  async generateQR(facturaData: {
    ver: number
    fecha: string // YYYY-MM-DD
    cuit: number
    ptoVta: number
    tipoCmp: number
    nroCmp: number
    importe: number
    moneda: string
    ctz: number
    tipoDocRec: number
    nroDocRec: number
    tipoCodAut: string // 'E' para CAE
    codAut: string | number // CAE (se convierte a número si es string)
  }) {
    try {
      // Generar URL según especificaciones de AFIP
      // https://www.afip.gob.ar/fe/qr/?p=parametros

      // IMPORTANTE: El CAE debe ser número según especificación de AFIP
      const codAutNumerico = typeof facturaData.codAut === 'string'
        ? Number.parseInt(facturaData.codAut, 10)
        : facturaData.codAut

      const qrData = {
        ver: facturaData.ver || 1,
        fecha: facturaData.fecha,
        cuit: facturaData.cuit,
        ptoVta: facturaData.ptoVta,
        tipoCmp: facturaData.tipoCmp,
        nroCmp: facturaData.nroCmp,
        importe: facturaData.importe,
        moneda: facturaData.moneda || 'PES',
        ctz: facturaData.ctz || 1,
        tipoDocRec: facturaData.tipoDocRec,
        nroDocRec: facturaData.nroDocRec,
        tipoCodAut: facturaData.tipoCodAut || 'E',
        codAut: codAutNumerico, // CAE como número
      }

      // Crear string de datos base64
      const jsonStr = JSON.stringify(qrData)
      const base64Data = Buffer.from(jsonStr).toString('base64')

      // URL del QR de AFIP
      const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${base64Data}`

      return {
        success: true,
        qrUrl,
        qrData,
      }
    }
    catch (error) {
      return this.handleError(error)
    }
  }

  /**
   * Convierte una imagen a base64
   */
  private async imageToBase64(imagePath: string): Promise<string | null> {
    try {
      const fs = await import('node:fs/promises')
      const buffer = await fs.readFile(imagePath)
      const base64 = buffer.toString('base64')

      // Detectar el tipo de imagen por extensión
      let mimeType = 'image/png'
      if (imagePath.toLowerCase().endsWith('.jpg') || imagePath.toLowerCase().endsWith('.jpeg')) {
        mimeType = 'image/jpeg'
      }

      return `data:${mimeType};base64,${base64}`
    }
    catch (error) {
      console.error(`Error al convertir imagen a base64: ${imagePath}`, error)
      return null
    }
  }

  /**
   * Descarga una imagen de una URL y la convierte a base64
   */
  private async urlToBase64(url: string): Promise<string | null> {
    try {
      const https = await import('node:https')
      const http = await import('node:http')

      return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http

        protocol.get(url, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download image: ${response.statusCode}`))
            return
          }

          const chunks: Buffer[] = []
          response.on('data', chunk => chunks.push(chunk))
          response.on('end', () => {
            const buffer = Buffer.concat(chunks)
            const base64 = buffer.toString('base64')
            const mimeType = response.headers['content-type'] || 'image/png'
            resolve(`data:${mimeType};base64,${base64}`)
          })
        }).on('error', reject)
      })
    }
    catch (error) {
      console.error('Error al descargar imagen:', error)
      return null
    }
  }

  /**
   * Crear certificado de desarrollo para ARCA
   * Utiliza las automatizaciones del SDK de AFIP
   */
  async crearCertificadoDev(data: { cuit: string, username: string, password: string }) {
    try {
      console.log('Iniciando creación de certificado con datos:', {
        cuit: data.username, // El CUIT debe ser el del username
        username: data.username,
        hasPassword: !!data.password,
      })

      // Configurar Afip con el access_token desde variable de entorno
      const accessToken = process.env.AFIP_SDK_ACCESS_TOKEN
      if (!accessToken) {
        throw new Error('AFIP_SDK_ACCESS_TOKEN no configurado en variables de entorno')
      }

      const afipInstance = new Afip({
        access_token: accessToken,
      })

      // Datos para la automatización - IMPORTANTE: cuit debe ser el mismo que username
      const automationData = {
        cuit: data.username, // Usar el username como CUIT
        username: data.username,
        password: data.password,
        alias: 'afipsdkcert',
      }

      console.log('Ejecutando automatización create-cert-dev con datos:', automationData)

      // Ejecutar la automatización create-cert-dev
      // @ts-ignore - El método CreateAutomation existe en el SDK pero no está en los tipos
      const result = await afipInstance.CreateAutomation('create-cert-dev', automationData, true)

      console.log('Resultado de la automatización:', {
        id: result.id,
        status: result.status,
        hasCert: !!result.data?.cert,
        hasKey: !!result.data?.key,
      })

      // Verificar que la automatización se completó exitosamente
      if (result.status !== 'complete') {
        throw new Error(`La automatización no se completó correctamente. Estado: ${result.status}`)
      }

      if (!result.data?.cert || !result.data?.key) {
        throw new Error('La automatización no devolvió certificado o clave')
      }

      // Guardar el certificado y la clave
      const certsDir = join(homedir(), 'afip-certs')

      // Crear el directorio si no existe
      if (!existsSync(certsDir)) {
        mkdirSync(certsDir, { recursive: true })
      }

      const fs = await import('node:fs/promises')
      // Guardar con el CUIT del username
      const certPath = join(certsDir, `${data.username}_dev.crt`)
      const keyPath = join(certsDir, `${data.username}_dev.key`)

      await fs.writeFile(certPath, result.data.cert)
      await fs.writeFile(keyPath, result.data.key)

      console.log('Certificados guardados exitosamente en:', certPath)

      // AUTORIZAR AUTOMÁTICAMENTE LOS SERVICIOS NECESARIOS
      console.log('Autorizando servicios necesarios...')

      const serviciosNecesarios = [
        {
          service: 'wsfe',
          name: 'Web Service Factura Electrónica',
          required: true
        },
        {
          service: 'ws_sr_padron_a13',
          name: 'Consulta de Padrón A13',
          required: true
        },
      ]

      const serviciosAutorizados = []
      const serviciosConError = []

      for (const servicio of serviciosNecesarios) {
        try {
          console.log(`Autorizando servicio: ${servicio.service}`)

          const authData = {
            cuit: data.username,
            username: data.username,
            password: data.password,
            alias: 'afipsdkcert',
            service: servicio.service,
          }

          // @ts-ignore - El método CreateAutomation existe en el SDK pero no está en los tipos
          const authResult = await afipInstance.CreateAutomation('auth-web-service-dev', authData, true)

          if (authResult.status === 'complete') {
            console.log(`✅ Servicio ${servicio.service} autorizado exitosamente`)
            serviciosAutorizados.push(servicio.service)
          }
          else {
            console.log(`⚠️  Servicio ${servicio.service} no se pudo autorizar: ${authResult.status}`)
            if (!servicio.required) {
              console.log(`   (Servicio opcional - la aplicación funcionará sin él)`)
            }
            serviciosConError.push(servicio.service)
          }
        }
        catch (error: any) {
          console.error(`❌ Error al autorizar ${servicio.service}:`, error.message)
          if (!servicio.required) {
            console.log(`   (Servicio opcional - la aplicación funcionará sin él)`)
          }
          serviciosConError.push(servicio.service)
        }
      }

      // Configurar el CUIT en el servicio
      this.configurarCUIT(Number.parseInt(data.username))

      // Construir mensaje apropiado
      let message = 'Certificado creado exitosamente'
      if (serviciosAutorizados.includes('wsfe')) {
        message += ' y listo para facturar'
      }

      return {
        success: true,
        message,
        certPath,
        keyPath,
        certDir: certsDir,
        serviciosAutorizados,
        serviciosConError: serviciosConError.length > 0 ? serviciosConError : undefined,
      }
    }
    catch (error: any) {
      console.error('Error en crearCertificadoDev:', error)

      // Intentar extraer más información del error del SDK
      if (error.data?.data_errors) {
        console.error('Errores de validación del SDK:', JSON.stringify(error.data.data_errors, null, 2))
      }

      // Construir mensaje de error más descriptivo
      let errorMessage = 'Error al crear certificado'

      // Priorizar mensaje del servidor AFIP si está disponible
      if (error.data?.data?.message) {
        errorMessage = error.data.data.message
      }
      else if (error.data?.data_errors?.params) {
        const paramErrors = error.data.data_errors.params
        errorMessage = `Error de validación: ${JSON.stringify(paramErrors)}`
      }
      else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Generar PDF de la factura usando Puppeteer (sin límite de 100 PDFs/mes)
   */
  async generatePDF(facturaInfo: {
    PtoVta: number
    CbteTipo: number
    CbteDesde: number
    DocTipo: number
    DocNro: number
    ImpTotal: number
    ImpNeto?: number
    ImpIVA?: number
    CAE: string
    CAEFchVto: string
    FchProceso?: string
    customPath?: string
  }) {
    try {
      // Generar QR para incluir en el PDF
      const fecha = facturaInfo.FchProceso || new Date().toISOString().split('T')[0]

      const qrResult = await this.generateQR({
        ver: 1,
        fecha,
        cuit: this.cuitActual || 0, // Usar CUIT actual o 0 si no está configurado
        ptoVta: facturaInfo.PtoVta,
        tipoCmp: facturaInfo.CbteTipo,
        nroCmp: facturaInfo.CbteDesde,
        importe: facturaInfo.ImpTotal,
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: facturaInfo.DocTipo,
        nroDocRec: facturaInfo.DocNro,
        tipoCodAut: 'E',
        codAut: facturaInfo.CAE,
      })

      // Verificar que se generó el QR correctamente
      if (!qrResult.success || !qrResult.qrUrl) {
        const errorMsg = 'error' in qrResult ? qrResult.error : 'Error desconocido al generar QR'
        throw new Error(`Error al generar QR: ${errorMsg}`)
      }

      // Generar URL del QR code como imagen y convertirla a base64
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrResult.qrUrl || '')}`
      const qrImageBase64 = await this.urlToBase64(qrImageUrl)

      if (!qrImageBase64) {
        throw new Error('Error al descargar y convertir el código QR')
      }

      // Ruta absoluta de los logos y convertirlos a base64
      // En desarrollo: dist/main -> src/render/assets
      // En producción (empaquetado): buscar en resources/assets
      const projectRoot = join(__dirname, '../..')

      // Intentar diferentes rutas según el entorno
      let logoPathRaw: string
      let arcaLogoPathRaw: string

      // En app empaquetada (process.resourcesPath existe cuando está empaquetado)
      const isPackaged = process.resourcesPath !== undefined

      if (isPackaged) {
        // En app empaquetada, assets están en app.asar/assets o app.asar.unpacked/assets
        const assetsPath = join(process.resourcesPath, 'app.asar', 'assets')
        logoPathRaw = join(assetsPath, 'logo.png')
        arcaLogoPathRaw = join(assetsPath, 'ARCA.png')

        console.log('App empaquetada, buscando en:', assetsPath)
      }
      else {
        // En desarrollo
        logoPathRaw = join(projectRoot, 'src/render/assets/logo.png')
        arcaLogoPathRaw = join(projectRoot, 'src/render/assets/ARCA.png')

        console.log('App en desarrollo, buscando en:', projectRoot)
      }

      console.log('Logo path:', logoPathRaw)
      console.log('ARCA logo path:', arcaLogoPathRaw)
      console.log('Logo exists:', existsSync(logoPathRaw))
      console.log('ARCA exists:', existsSync(arcaLogoPathRaw))

      const logoBase64 = await this.imageToBase64(logoPathRaw)
      const arcaLogoBase64 = await this.imageToBase64(arcaLogoPathRaw)

      // Importar y usar la función de generación de HTML desde facturaTemplate
      const { generarHTMLFactura } = await import('@render/factura/components/facturaTemplate')
      const html = generarHTMLFactura(
        facturaInfo,
        qrImageBase64,
        this.cuitActual || 0, // Usar CUIT actual
        logoBase64 || undefined,
        arcaLogoBase64 || undefined,
      )

      // Nombre del archivo
      const fileName = `Factura_${facturaInfo.CbteTipo}_${String(facturaInfo.PtoVta).padStart(4, '0')}_${String(facturaInfo.CbteDesde).padStart(8, '0')}.pdf`

      // Directorio de destino
      // Si hay customPath usar ese, sino usar Desktop
      let outputDir: string
      if (facturaInfo.customPath && existsSync(facturaInfo.customPath)) {
        outputDir = facturaInfo.customPath
      }
      else {
        // En Windows: C:\Users\[usuario]\Desktop
        // En Linux/Mac: /home/[usuario]/Desktop
        const desktopPath = join(homedir(), 'Desktop')
        outputDir = desktopPath
      }

      // Crear el directorio si no existe
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
      }

      // Ruta completa del archivo PDF
      const pdfPath = join(outputDir, fileName)

      // Generar PDF usando Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      const page = await browser.newPage()

      // Configurar el contenido HTML
      await page.setContent(html, { waitUntil: 'networkidle0' })

      // Generar el PDF con las opciones configuradas
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        margin: {
          top: '0.4in',
          right: '0.4in',
          bottom: '0.4in',
          left: '0.4in',
        },
        printBackground: true,
      })

      await browser.close()

      return {
        success: true,
        filePath: pdfPath,
        fileName,
        qrUrl: qrResult.qrUrl || undefined,
        message: `PDF generado exitosamente en ${pdfPath}`,
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      console.error('Error al generar PDF:', error)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Autorizar web service de desarrollo
   * Utiliza las automatizaciones del SDK de AFIP para autorizar un web service
   */
  async autorizarWebServiceDev(data: {
    cuit: string
    username: string
    password: string
    alias: string
    service: string
  }) {
    try {
      console.log('Iniciando autorización de web service con datos:', {
        cuit: data.cuit,
        username: data.username,
        alias: data.alias,
        service: data.service,
        hasPassword: !!data.password,
      })

      // Configurar Afip con el access_token desde variable de entorno
      const accessToken = process.env.AFIP_SDK_ACCESS_TOKEN
      if (!accessToken) {
        throw new Error('AFIP_SDK_ACCESS_TOKEN no configurado en variables de entorno')
      }

      const afipInstance = new Afip({
        access_token: accessToken,
      })

      // Datos para la automatización
      const automationData = {
        cuit: data.cuit,
        username: data.username,
        password: data.password,
        alias: data.alias,
        service: data.service,
      }

      console.log('Ejecutando automatización auth-web-service-dev con datos:', automationData)

      // Ejecutar la automatización auth-web-service-dev
      // @ts-ignore - El método CreateAutomation existe en el SDK pero no está en los tipos
      const result = await afipInstance.CreateAutomation('auth-web-service-dev', automationData, true)

      console.log('Resultado de la automatización:', {
        id: result.id,
        status: result.status,
        data: result.data,
      })

      // Verificar que la automatización se completó exitosamente
      if (result.status !== 'complete') {
        throw new Error(`La automatización no se completó correctamente. Estado: ${result.status}`)
      }

      if (result.data?.status !== 'created') {
        throw new Error('La autorización no se completó correctamente')
      }

      return {
        success: true,
        message: 'Web service autorizado exitosamente',
        data: result.data,
      }
    }
    catch (error: any) {
      console.error('Error en autorizarWebServiceDev:', error)

      // Intentar extraer más información del error del SDK
      if (error.data?.data_errors) {
        console.error('Errores de validación del SDK:', JSON.stringify(error.data.data_errors, null, 2))
      }

      // Construir mensaje de error más descriptivo
      let errorMessage = 'Error al autorizar web service'

      if (error.data?.data_errors?.params) {
        const paramErrors = error.data.data_errors.params
        errorMessage = `Error de validación: ${JSON.stringify(paramErrors)}`
      }
      else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Crear certificado de producción para ARCA
   * Utiliza las automatizaciones del SDK de AFIP
   */
  async crearCertificadoProd(data: { cuit: string, username: string, password: string, alias: string }) {
    try {
      console.log('Iniciando creación de certificado de PRODUCCIÓN con datos:', {
        cuit: data.username,
        username: data.username,
        alias: data.alias,
        hasPassword: !!data.password,
      })

      // Configurar Afip con el access_token desde variable de entorno
      const accessToken = process.env.AFIP_SDK_ACCESS_TOKEN
      if (!accessToken) {
        throw new Error('AFIP_SDK_ACCESS_TOKEN no configurado en variables de entorno')
      }

      const afipInstance = new Afip({
        access_token: accessToken,
      })

      // Datos para la automatización
      const automationData = {
        cuit: data.username,
        username: data.username,
        password: data.password,
        alias: data.alias,
      }

      console.log('Ejecutando automatización create-cert-prod con datos:', automationData)

      // Ejecutar la automatización create-cert-prod
      // @ts-ignore - El método CreateAutomation existe en el SDK pero no está en los tipos
      const result = await afipInstance.CreateAutomation('create-cert-prod', automationData, true)

      console.log('Resultado de la automatización:', {
        id: result.id,
        status: result.status,
        hasCert: !!result.data?.cert,
        hasKey: !!result.data?.key,
      })

      // Verificar que la automatización se completó exitosamente
      if (result.status !== 'complete') {
        throw new Error(`La automatización no se completó correctamente. Estado: ${result.status}`)
      }

      if (!result.data?.cert || !result.data?.key) {
        throw new Error('La automatización no devolvió certificado o clave')
      }

      // Guardar el certificado y la clave
      const certsDir = join(homedir(), 'afip-certs')

      // Crear el directorio si no existe
      if (!existsSync(certsDir)) {
        mkdirSync(certsDir, { recursive: true })
      }

      const fs = await import('node:fs/promises')
      // Guardar con el CUIT del username y marcado como producción
      const certPath = join(certsDir, `${data.username}_prod.crt`)
      const keyPath = join(certsDir, `${data.username}_prod.key`)

      await fs.writeFile(certPath, result.data.cert)
      await fs.writeFile(keyPath, result.data.key)

      console.log('Certificados de PRODUCCIÓN guardados exitosamente en:', certPath)

      // AUTORIZAR AUTOMÁTICAMENTE LOS SERVICIOS NECESARIOS
      console.log('Autorizando servicios necesarios en PRODUCCIÓN...')

      const serviciosNecesarios = [
        {
          service: 'wsfe',
          name: 'Web Service Factura Electrónica',
          required: true
        },
        {
          service: 'ws_sr_padron_a13',
          name: 'Consulta de Padrón A13',
          required: true
        },
      ]

      const serviciosAutorizados = []
      const serviciosConError = []

      for (const servicio of serviciosNecesarios) {
        try {
          console.log(`Autorizando servicio de producción: ${servicio.service}`)

          const authData = {
            cuit: data.username,
            username: data.username,
            password: data.password,
            alias: data.alias,
            service: servicio.service,
          }

          // @ts-ignore - El método CreateAutomation existe en el SDK pero no está en los tipos
          const authResult = await afipInstance.CreateAutomation('auth-web-service-prod', authData, true)

          if (authResult.status === 'complete') {
            console.log(`✅ Servicio de producción ${servicio.service} autorizado exitosamente`)
            serviciosAutorizados.push(servicio.service)
          }
          else {
            console.log(`⚠️  Servicio ${servicio.service} no se pudo autorizar: ${authResult.status}`)
            if (!servicio.required) {
              console.log(`   (Servicio opcional - la aplicación funcionará sin él)`)
            }
            serviciosConError.push(servicio.service)
          }
        }
        catch (error: any) {
          console.error(`❌ Error al autorizar ${servicio.service}:`, error.message)
          if (!servicio.required) {
            console.log(`   (Servicio opcional - la aplicación funcionará sin él)`)
          }
          serviciosConError.push(servicio.service)
        }
      }

      // Configurar el CUIT en el servicio
      this.configurarCUIT(Number.parseInt(data.username))

      // Construir mensaje apropiado
      let message = 'Certificado de producción creado exitosamente'
      if (serviciosAutorizados.includes('wsfe')) {
        message += ' y listo para facturar'
      }

      return {
        success: true,
        message,
        certPath,
        keyPath,
        certDir: certsDir,
        serviciosAutorizados,
        serviciosConError: serviciosConError.length > 0 ? serviciosConError : undefined,
      }
    }
    catch (error: any) {
      console.error('Error en crearCertificadoProd:', error)

      // Intentar extraer más información del error del SDK
      if (error.data?.data_errors) {
        console.error('Errores de validación del SDK:', JSON.stringify(error.data.data_errors, null, 2))
      }

      // Construir mensaje de error más descriptivo
      let errorMessage = 'Error al crear certificado de producción'

      // Priorizar mensaje del servidor AFIP si está disponible
      if (error.data?.data?.message) {
        errorMessage = error.data.data.message
      }
      else if (error.data?.data_errors?.params) {
        const paramErrors = error.data.data_errors.params
        errorMessage = `Error de validación: ${JSON.stringify(paramErrors)}`
      }
      else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Autorizar web service de producción
   * Utiliza las automatizaciones del SDK de AFIP para autorizar un web service
   */
  async autorizarWebServiceProd(data: {
    cuit: string
    username: string
    password: string
    alias: string
    service: string
  }) {
    try {
      console.log('Iniciando autorización de web service de PRODUCCIÓN con datos:', {
        cuit: data.cuit,
        username: data.username,
        alias: data.alias,
        service: data.service,
        hasPassword: !!data.password,
      })

      // Configurar Afip con el access_token desde variable de entorno
      const accessToken = process.env.AFIP_SDK_ACCESS_TOKEN
      if (!accessToken) {
        throw new Error('AFIP_SDK_ACCESS_TOKEN no configurado en variables de entorno')
      }

      const afipInstance = new Afip({
        access_token: accessToken,
      })

      // Datos para la automatización
      const automationData = {
        cuit: data.cuit,
        username: data.username,
        password: data.password,
        alias: data.alias,
        service: data.service,
      }

      console.log('Ejecutando automatización auth-web-service-prod con datos:', automationData)

      // Ejecutar la automatización auth-web-service-prod
      // @ts-ignore - El método CreateAutomation existe en el SDK pero no está en los tipos
      const result = await afipInstance.CreateAutomation('auth-web-service-prod', automationData, true)

      console.log('Resultado de la automatización:', {
        id: result.id,
        status: result.status,
        data: result.data,
      })

      // Verificar que la automatización se completó exitosamente
      if (result.status !== 'complete') {
        throw new Error(`La automatización no se completó correctamente. Estado: ${result.status}`)
      }

      if (result.data?.status !== 'created') {
        throw new Error('La autorización no se completó correctamente')
      }

      return {
        success: true,
        message: 'Web service de producción autorizado exitosamente',
        data: result.data,
      }
    }
    catch (error: any) {
      console.error('Error en autorizarWebServiceProd:', error)

      // Intentar extraer más información del error del SDK
      if (error.data?.data_errors) {
        console.error('Errores de validación del SDK:', JSON.stringify(error.data.data_errors, null, 2))
      }

      // Construir mensaje de error más descriptivo
      let errorMessage = 'Error al autorizar web service de producción'

      if (error.data?.data_errors?.params) {
        const paramErrors = error.data.data_errors.params
        errorMessage = `Error de validación: ${JSON.stringify(paramErrors)}`
      }
      else if (error.message) {
        errorMessage = error.message
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Obtener la configuración de ARCA
   */
  getConfig() {
    return {
      cuit: this.cuitActual, // Devolver CUIT actual (o undefined si no está configurado)
      production: ArcaConfig.production,
    }
  }
}
