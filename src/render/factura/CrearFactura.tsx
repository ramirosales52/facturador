import type { FormEvent } from 'react'
import type {
  Articulo,
  FacturaResultadoData,
  FormData,
} from './components'
import type { DatosEmisor } from './components/ConfiguracionEmisor'
import type { FacturaPDFData } from './components/facturaTemplate'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@render/components/ui/tabs'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ALICUOTAS_IVA, CONCEPTOS, CONDICIONES_VENTA, DEFAULTS, TIPOS_COMPROBANTE } from '../constants/afip'
import { useArca } from '../hooks/useArca'
import { agruparIVAParaAFIP, agruparIVAPorAlicuota, calcularSubtotal, calcularTotalesFactura, getNombreCondicionIVA } from '../utils/calculos'
import {
  FacturaForm,
  FacturaResultado,
} from './components'
import { ConfiguracionEmisor } from './components/ConfiguracionEmisor'
import { generarHTMLFactura } from './components/facturaTemplate'

function CrearFactura() {
  const { loading, error, clearError, crearFactura, generarQR, generarPDF, consultarContribuyente } = useArca()

  const [formData, setFormData] = useState<FormData>({
    TipoFactura: DEFAULTS.TIPO_FACTURA,
    DocTipo: DEFAULTS.TIPO_DOCUMENTO,
    DocNro: '',
    Concepto: DEFAULTS.CONCEPTO,
    CondicionIVA: DEFAULTS.CONDICION_IVA,
    CondicionVenta: 'efectivo',
    RazonSocial: '',
    Domicilio: '',
    Articulos: [],
    ImpNeto: '0.00',
    ImpIVA: '0.00',
    ImpTotal: '0.00',
    IVAGlobal: '5', // 21% por defecto
  })

  const [datosEmisor, setDatosEmisor] = useState<DatosEmisor>({
    cuit: '', // Iniciar vacío - se llena al crear certificado ARCA
    razonSocial: '',
    domicilio: '',
    condicionIVA: DEFAULTS.CONDICION_IVA_EMISOR,
    iibb: '',
    inicioActividades: '',
    puntoVenta: DEFAULTS.PUNTO_VENTA,
  })

  const [resultado, setResultado] = useState<FacturaResultadoData | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null)
  const [loadingContribuyente, setLoadingContribuyente] = useState(false)
  const [loadingEmisor, setLoadingEmisor] = useState(false)
  const [mostrarDatosCliente, setMostrarDatosCliente] = useState(false)
  const [pdfSavePath, setPdfSavePath] = useState<string>('')

  // Inicializar AFIP y cargar configuración al inicio
  useEffect(() => {
    const inicializar = async () => {
      try {
        // 1. Cargar carpeta guardada de PDFs
        // @ts-ignore
        if (window.electron?.store?.get) {
          // @ts-ignore
          const savedPath = await window.electron.store.get('pdfSavePath')
          if (savedPath) {
            setPdfSavePath(savedPath)
          }
        }

        // 2. Inicializar AFIP SDK si hay certificado guardado
        const certificadoGuardado = localStorage.getItem('certificadoARCACreado')
        const cuitGuardado = localStorage.getItem('cuitARCA')

        if (certificadoGuardado === 'true' && cuitGuardado) {
          const backendPort = await window.electron.getBackendPort()
          console.log('Inicializando AFIP SDK con CUIT:', cuitGuardado)

          await axios.post(`http://localhost:${backendPort}/arca/configurar-cuit`, {
            cuit: cuitGuardado,
          })

          console.log('✅ AFIP SDK inicializado automáticamente')
        }
      }
      catch (error) {
        console.error('Error al inicializar:', error)
      }
    }
    inicializar()
  }, [])

  /**
   * Seleccionar carpeta para guardar PDFs
   */
  const handleSelectFolder = async (): Promise<void> => {
    try {
      // @ts-ignore
      if (window.electron?.dialog?.showOpenDialog) {
        // @ts-ignore
        const result = await window.electron.dialog.showOpenDialog({
          properties: ['openDirectory'],
          title: 'Seleccionar carpeta para guardar PDFs',
        })

        if (!result.canceled && result.filePaths.length > 0) {
          const selectedPath = result.filePaths[0]
          setPdfSavePath(selectedPath)

          // Guardar la preferencia
          // @ts-ignore
          if (window.electron?.store?.set) {
            // @ts-ignore
            await window.electron.store.set('pdfSavePath', selectedPath)
          }

          toast.success('Carpeta seleccionada correctamente', { id: 'seleccionar-carpeta' })
        }
      }
      else {
        toast.info('Función disponible solo en la aplicación empaquetada', { id: 'seleccionar-carpeta' })
      }
    }
    catch (error) {
      console.error('Error al seleccionar carpeta:', error)
      toast.error('Error al seleccionar carpeta', { id: 'seleccionar-carpeta' })
    }
  }

  const recalcularTotales = (articulos: Articulo[]): void => {
    const totales = calcularTotalesFactura(articulos)

    setFormData(prev => ({
      ...prev,
      ImpNeto: totales.neto.toFixed(2),
      ImpIVA: totales.iva.toFixed(2),
      ImpTotal: totales.total.toFixed(2),
    }))
  }

  const handleInputChange = (field: keyof FormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Si es Factura B y se cambió el IVA Global, actualizar todos los artículos
    if (field === 'IVAGlobal' && formData.TipoFactura === 'B') {
      const articulosActualizados = formData.Articulos.map(articulo => ({
        ...articulo,
        alicuotaIVA: value,
      }))
      setFormData(prev => ({ ...prev, Articulos: articulosActualizados, [field]: value }))
      recalcularTotales(articulosActualizados)
    }
  }

  const handleArticuloAdd = (): void => {
    const nuevoArticulo: Articulo = {
      codigo: '',
      descripcion: '',
      cantidad: DEFAULTS.CANTIDAD_DEFAULT,
      unidadMedida: DEFAULTS.UNIDAD_MEDIDA_DEFAULT,
      precioUnitario: undefined,
      // Para Factura B usar el IVA global seleccionado
      alicuotaIVA: formData.TipoFactura === 'B' && formData.IVAGlobal ? formData.IVAGlobal : DEFAULTS.ALICUOTA_IVA_DEFAULT,
    }
    const nuevosArticulos = [...formData.Articulos, nuevoArticulo]
    setFormData(prev => ({ ...prev, Articulos: nuevosArticulos }))
    recalcularTotales(nuevosArticulos)
  }

  const handleArticuloRemove = (index: number): void => {
    const nuevosArticulos = formData.Articulos.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, Articulos: nuevosArticulos }))
    recalcularTotales(nuevosArticulos)
  }

  const handleArticuloChange = (index: number, field: keyof Articulo, value: string | number): void => {
    const nuevosArticulos = [...formData.Articulos]
    nuevosArticulos[index] = { ...nuevosArticulos[index], [field]: value }
    setFormData(prev => ({ ...prev, Articulos: nuevosArticulos }))
    recalcularTotales(nuevosArticulos)
  }

  const limpiarFormulario = (): void => {
    setFormData({
      TipoFactura: DEFAULTS.TIPO_FACTURA,
      DocTipo: DEFAULTS.TIPO_DOCUMENTO,
      DocNro: '',
      Concepto: DEFAULTS.CONCEPTO,
      CondicionIVA: DEFAULTS.CONDICION_IVA,
      CondicionVenta: 'efectivo',
      Articulos: [],
      ImpNeto: '0.00',
      ImpIVA: '0.00',
      ImpTotal: '0.00',
    })
    setResultado(null)
    setQrUrl(null)
    setPdfUrl(null)
    setHtmlPreview(null)
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    clearError()
    setResultado(null)
    setQrUrl(null)
    setPdfUrl(null)
    setHtmlPreview(null)

    // Validar que haya datos del emisor
    // if (!datosEmisor.razonSocial || !datosEmisor.domicilio) {
    //   toast.error('Configure los datos del emisor primero', {
    //     id: 'validar-emisor',
    //     description: 'Vaya a la pestaña "Configuración" y complete los datos',
    //   })
    //   return
    // }

    // Usar utilidad para agrupar IVA
    const ivaArray = agruparIVAParaAFIP(formData.Articulos)

    const cbteTipo = formData.TipoFactura === 'A' ? TIPOS_COMPROBANTE.FACTURA_A : TIPOS_COMPROBANTE.FACTURA_B
    const docTipo = Number.parseInt(formData.DocTipo)
    const docNro = formData.DocTipo === '99' ? 0 : Number.parseInt(formData.DocNro)
    const concepto = Number.parseInt(formData.Concepto)

    const facturaData = {
      PtoVta: datosEmisor.puntoVenta,
      CbteTipo: cbteTipo,
      Concepto: concepto,
      DocTipo: docTipo,
      DocNro: docNro,
      ImpTotal: Number.parseFloat(formData.ImpTotal),
      ImpNeto: Number.parseFloat(formData.ImpNeto),
      ImpIVA: Number.parseFloat(formData.ImpIVA),
      Iva: ivaArray,
    }

    const response = await crearFactura(facturaData)
    setResultado(response)

    // Si la factura se creó exitosamente, generar QR automáticamente
    if (response.success && response.data) {
      const qrData = {
        ver: 1,
        fecha: response.data.FchProceso,
        cuit: Number.parseInt(datosEmisor.cuit),
        ptoVta: response.data.PtoVta,
        tipoCmp: response.data.CbteTipo,
        nroCmp: response.data.CbteDesde,
        importe: response.data.ImpTotal,
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: response.data.DocTipo,
        nroDocRec: response.data.DocNro,
        tipoCodAut: 'E',
        codAut: response.data.CAE,
      }

      const qrResponse = await generarQR(qrData)
      if (qrResponse.success && qrResponse.qrUrl) {
        setQrUrl(qrResponse.qrUrl)

        // Generar vista previa HTML
        const articulosPDF = formData.Articulos.map((articulo) => {
          const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)
          const subtotalSinIVA = calcularSubtotal(articulo)
          const ivaArticulo = subtotalSinIVA * ((alicuota?.porcentaje || 0) / 100)
          const subtotalConIVA = subtotalSinIVA + ivaArticulo

          return {
            codigo: articulo.codigo || '',
            descripcion: articulo.descripcion,
            cantidad: articulo.cantidad,
            unidadMedida: articulo.unidadMedida,
            precioUnitario: articulo.precioUnitario,
            alicuotaIVA: articulo.alicuotaIVA,
            porcentajeIVA: alicuota?.porcentaje || 0,
            subtotal: subtotalConIVA,
          }
        })

        const ivasAgrupados = agruparIVAPorAlicuota(formData.Articulos).map(iva => ({
          alicuota: iva.id,
          porcentaje: iva.porcentaje,
          baseImponible: iva.baseImponible,
          importeIVA: iva.importeIVA,
        }))

        const condicionIVANombre = getNombreCondicionIVA(formData.CondicionIVA, formData.TipoFactura)
        const conceptoNombre = CONCEPTOS.find(c => c.id === formData.Concepto)?.nombre || 'Productos'
        const condicionVentaNombre = CONDICIONES_VENTA.find(c => c.id === formData.CondicionVenta)?.nombre || 'Efectivo'

        // Calcular subtotal (ImpNeto) desde los artículos
        const totales = calcularTotalesFactura(formData.Articulos)

        const pdfData: FacturaPDFData = {
          ...response.data,
          ImpNeto: totales.neto,
          ImpIVA: totales.iva,
          TipoFactura: formData.TipoFactura,
          CondicionIVA: condicionIVANombre,
          RazonSocial: formData.RazonSocial,
          Domicilio: formData.Domicilio,
          Concepto: conceptoNombre,
          CondicionVenta: condicionVentaNombre,
          Articulos: articulosPDF,
          IVAsAgrupados: ivasAgrupados,
          DatosEmisor: {
            cuit: datosEmisor.cuit,
            razonSocial: datosEmisor.razonSocial,
            domicilio: datosEmisor.domicilio,
            condicionIVA: datosEmisor.condicionIVA === '1'
              ? 'Responsable Inscripto'
              : datosEmisor.condicionIVA === '6' ? 'Responsable Monotributo' : 'Exento',
            iibb: datosEmisor.iibb || 'Exento',
            inicioActividades: datosEmisor.inicioActividades,
          },
        }

        // Generar vista previa HTML
        // Para la vista previa en el navegador, cargamos los logos como base64
        let logoForPreview = ''
        let arcaLogoForPreview = ''
        try {
          const logoModule = await import('../assets/logo.png')
          const logoPath = logoModule.default
          const response = await fetch(logoPath)
          const blob = await response.blob()
          logoForPreview = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        }
        catch (error) {
          console.error('Error cargando logo para vista previa:', error)
        }

        try {
          const arcaLogoModule = await import('../assets/ARCA.png')
          const arcaLogoPath = arcaLogoModule.default
          const response = await fetch(arcaLogoPath)
          const blob = await response.blob()
          arcaLogoForPreview = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        }
        catch (error) {
          console.error('Error cargando logo ARCA para vista previa:', error)
        }

        // Generar imagen del QR para la vista previa
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrResponse.qrUrl)}`

        const htmlContent = generarHTMLFactura(pdfData, qrImageUrl, Number.parseInt(datosEmisor.cuit), logoForPreview, arcaLogoForPreview)
        setHtmlPreview(htmlContent)
      }
    }
  }

  const handleConsultarContribuyente = async (): Promise<void> => {
    if (!formData.DocNro) {
      toast.error('Ingrese un CUIT para buscar', { id: 'buscar-contribuyente' })
      return
    }

    clearError()

    // Dismissar TODOS los toasts anteriores para evitar solapamiento
    toast.dismiss()

    // Pequeño delay para que la animación de cierre termine
    await new Promise(resolve => setTimeout(resolve, 150))

    setLoadingContribuyente(true)

    // Crear un toast de loading con ID único para esta búsqueda
    const toastIdLoading = `consultar-contribuyente-${Date.now()}`
    toast.loading('Consultando datos en AFIP...', { id: toastIdLoading })

    try {
      const response = await consultarContribuyente(formData.DocNro)
      console.log(response)

      // Dismiss el toast de loading
      toast.dismiss(toastIdLoading)

      if (response.success && response.data) {
        if (response.data.razonSocial) {
          handleInputChange('RazonSocial', response.data.razonSocial)
        }
        if (response.data.domicilio) {
          handleInputChange('Domicilio', response.data.domicilio)
        }

        // Auto-mostrar la sección de datos del cliente
        setMostrarDatosCliente(true)

        // Mostrar toast de success
        toast.success('Datos obtenidos correctamente', {
          description: 'La información se cargó desde AFIP',
        })
      }
      else {
        // Mostrar toast de error
        toast.error('CUIT no encontrado', {
          description: response.error || 'No se encontraron datos en AFIP',
        })
      }
    }
    catch (err) {
      // Dismiss el toast de loading
      toast.dismiss(toastIdLoading)
      toast.error('Error al consultar contribuyente')
    }
    finally {
      setLoadingContribuyente(false)
      clearError()
    }
  }

  const handleBuscarEmisor = async (cuit: string) => {
    setLoadingEmisor(true)
    try {
      const response = await consultarContribuyente(cuit)
      setLoadingEmisor(false)
      return response
    }
    catch (err) {
      setLoadingEmisor(false)
      return { success: false, error: 'Error al consultar' }
    }
  }

  const handleGuardarEmisor = (datos: DatosEmisor) => {
    setDatosEmisor(datos)
    // Guardar en localStorage para persistencia
    localStorage.setItem('datosEmisor', JSON.stringify(datos))
  }

  // Cargar datos del emisor al iniciar
  useEffect(() => {
    const datosGuardados = localStorage.getItem('datosEmisor')
    if (datosGuardados) {
      try {
        setDatosEmisor(JSON.parse(datosGuardados))
      }
      catch (e) {
        console.error('Error al cargar datos del emisor')
      }
    }
  }, [])

  // Cargar CUIT desde línea de comandos al iniciar
  useEffect(() => {
    const cargarCuitDesdeComandoLinea = async () => {
      try {
        // Verificar si window.electron existe (solo en Electron)
        if (window.electron && window.electron.getCommandLineCuit) {
          const cuitFromCli = await window.electron.getCommandLineCuit()

          if (cuitFromCli) {
            console.log('CUIT recibido desde línea de comandos:', cuitFromCli)

            // Solo actualizar el formulario con el CUIT, sin búsqueda automática
            handleInputChange('DocNro', cuitFromCli)
          }
        }
      }
      catch (error) {
        console.error('Error al obtener CUIT desde línea de comandos:', error)
      }
    }

    cargarCuitDesdeComandoLinea()
  }, [])

  const handleDescargarPDF = async (): Promise<void> => {
    if (!resultado?.data)
      return

    const toastId = `pdf-generation-${Date.now()}`
    toast.loading('Generando PDF...', { id: toastId })

    // Preparar artículos para el PDF usando utilidades
    const articulosPDF = formData.Articulos.map((articulo) => {
      const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)
      const subtotalSinIVA = calcularSubtotal(articulo)
      const ivaArticulo = subtotalSinIVA * ((alicuota?.porcentaje || 0) / 100)
      const subtotalConIVA = subtotalSinIVA + ivaArticulo

      return {
        codigo: articulo.codigo || '',
        descripcion: articulo.descripcion,
        cantidad: articulo.cantidad,
        unidadMedida: articulo.unidadMedida,
        precioUnitario: articulo.precioUnitario,
        alicuotaIVA: articulo.alicuotaIVA,
        porcentajeIVA: alicuota?.porcentaje || 0,
        subtotal: subtotalConIVA,
      }
    })

    // Usar utilidad para agrupar IVAs
    const ivasAgrupados = agruparIVAPorAlicuota(formData.Articulos).map(iva => ({
      alicuota: iva.id,
      porcentaje: iva.porcentaje,
      baseImponible: iva.baseImponible,
      importeIVA: iva.importeIVA,
    }))

    // Obtener nombre de condición IVA usando utilidad
    const condicionIVANombre = getNombreCondicionIVA(formData.CondicionIVA, formData.TipoFactura)
    const conceptoNombre = CONCEPTOS.find(c => c.id === formData.Concepto)?.nombre || 'Productos'
    const condicionVentaNombre = CONDICIONES_VENTA.find(c => c.id === formData.CondicionVenta)?.nombre || 'Efectivo'

    // Calcular totales desde artículos
    const totales = calcularTotalesFactura(formData.Articulos)

    // Crear datos extendidos para el PDF
    const pdfData = {
      ...resultado.data,
      ImpNeto: totales.neto,
      ImpIVA: totales.iva,
      TipoFactura: formData.TipoFactura,
      CondicionIVA: condicionIVANombre,
      RazonSocial: formData.RazonSocial,
      Domicilio: formData.Domicilio,
      Concepto: conceptoNombre,
      CondicionVenta: condicionVentaNombre,
      Articulos: articulosPDF,
      IVAsAgrupados: ivasAgrupados,
      DatosEmisor: {
        cuit: datosEmisor.cuit,
        razonSocial: datosEmisor.razonSocial,
        domicilio: datosEmisor.domicilio,
        condicionIVA: datosEmisor.condicionIVA === '1'
          ? 'Responsable Inscripto'
          : datosEmisor.condicionIVA === '6' ? 'Responsable Monotributo' : 'Exento',
        iibb: datosEmisor.iibb || 'Exento',
        inicioActividades: datosEmisor.inicioActividades,
      },
      // Agregar carpeta de destino personalizada
      customPath: pdfSavePath || undefined,
    }

    const pdfResponse = await generarPDF(pdfData)

    if (pdfResponse.success && pdfResponse.filePath) {
      setPdfUrl(pdfResponse.filePath)
      toast.success(
        'PDF generado exitosamente',
        {
          id: toastId,
          description: pdfResponse.message || 'El archivo está guardado en tu escritorio',
          duration: 3000,
        },
      )
    }
    else {
      toast.error(
        `Error al generar PDF: ${pdfResponse.error}`,
        { id: toastId },
      )
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">Facturación Electrónica</h1>
        <p className="text-sm text-gray-600">Crear facturas A y B</p>
      </div>

      <Tabs defaultValue="facturar" className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="facturar">Crear Factura</TabsTrigger>
          <TabsTrigger value="configuracion">Configuración Emisor</TabsTrigger>
        </TabsList>

        <TabsContent value="facturar">
          <FacturaForm
            formData={formData}
            loading={loading}
            error={error}
            onInputChange={handleInputChange}
            onArticuloAdd={handleArticuloAdd}
            onArticuloRemove={handleArticuloRemove}
            onArticuloChange={handleArticuloChange}
            onSubmit={handleSubmit}
            onLimpiar={limpiarFormulario}
            onConsultarContribuyente={handleConsultarContribuyente}
            loadingContribuyente={loadingContribuyente}
            mostrarDatosCliente={mostrarDatosCliente}
            onToggleDatosCliente={() => setMostrarDatosCliente(!mostrarDatosCliente)}
          />

          {resultado && (
            <div className="mt-4">
              <FacturaResultado
                resultado={resultado}
                qrUrl={qrUrl}
                pdfUrl={pdfUrl}
                onGenerarPDF={handleDescargarPDF}
                htmlPreview={htmlPreview || undefined}
                pdfSavePath={pdfSavePath}
                onSelectFolder={handleSelectFolder}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="configuracion">
          <ConfiguracionEmisor
            onGuardar={handleGuardarEmisor}
            onBuscarCUIT={handleBuscarEmisor}
            datosIniciales={datosEmisor}
            loadingBusqueda={loadingEmisor}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CrearFactura
