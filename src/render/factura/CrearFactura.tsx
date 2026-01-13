import type { FormEvent } from 'react'
import type {
  Articulo,
  ArticuloTicket,
  FacturaResultadoData,
  FormData,
  TicketFormData,
  TicketResultadoData,
} from './components'
import type { DatosEmisor } from './components/ConfiguracionEmisor'
import type { FacturaPDFData } from './components/facturaTemplate'
import type { TicketPDFData } from './components/ticketTemplate'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@render/components/ui/tabs'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ALICUOTAS_IVA, CONCEPTOS, CONDICIONES_VENTA, DEFAULTS, TIPOS_COMPROBANTE } from '../constants/afip'
import { useArca } from '../hooks/useArca'
import { agruparIVAParaAFIP, agruparIVAPorAlicuota, calcularTotalesFactura, getNombreCondicionIVA } from '../utils/calculos'
import {
  FacturaForm,
  FacturaResultado,
  TicketForm,
  TicketResultado,
} from './components'
import { ComprobantesEmitidos } from './components/ComprobantesEmitidos'
import { ConfiguracionEmisor } from './components/ConfiguracionEmisor'
import { generarHTMLFactura } from './components/facturaTemplate'
import { generarHTMLTicket } from './components/ticketTemplate'

function CrearFactura() {
  const { loading, error, clearError, crearFactura, generarQR, generarPDF, generarPDFTicket, obtenerCUITDesdeDNI, consultarContribuyente, guardarFactura, actualizarPdfPath } = useArca()

  const [formData, setFormData] = useState<FormData>({
    TipoFactura: DEFAULTS.TIPO_FACTURA,
    DocTipo: DEFAULTS.TIPO_DOCUMENTO,
    DocNro: '',
    Concepto: DEFAULTS.CONCEPTO,
    CondicionIVA: DEFAULTS.CONDICION_IVA,
    CondicionVenta: 'efectivo',
    RazonSocial: '',
    Domicilio: '',
    Articulos: [{
      codigo: '',
      descripcion: 'Componente informático',
      cantidad: DEFAULTS.CANTIDAD_DEFAULT,
      unidadMedida: DEFAULTS.UNIDAD_MEDIDA_DEFAULT,
      precioUnitario: undefined,
      alicuotaIVA: DEFAULTS.ALICUOTA_IVA_DEFAULT,
    }],
    ImpNeto: '0.00',
    ImpIVA: '0.00',
    ImpTotal: '0.00',
    IVAGlobal: '4', // 10.5% por defecto
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
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [_mostrarDatosCliente, setMostrarDatosCliente] = useState(false)
  const [pdfSavePath, setPdfSavePath] = useState<string>('')

  // Estados para Tickets
  const [ticketFormData, setTicketFormData] = useState<TicketFormData>({
    CondicionVenta: 'efectivo',
    CondicionIVA: '5', // Consumidor Final
    IVA: '4', // 10.5%
    Articulo: {
      descripcion: 'Componente informático',
      cantidad: DEFAULTS.CANTIDAD_DEFAULT,
      unidadMedida: DEFAULTS.UNIDAD_MEDIDA_DEFAULT,
      precioUnitario: undefined,
      alicuotaIVA: '4',
    },
    ImpNeto: '0.00',
    ImpIVA: '0.00',
    ImpTotal: '0.00',
  })
  const [ticketResultado, setTicketResultado] = useState<TicketResultadoData | null>(null)
  const [ticketHtmlPreview, setTicketHtmlPreview] = useState<string | null>(null)
  const [loadingTicketPDF, setLoadingTicketPDF] = useState(false)
  const [ticketPdfUrl, setTicketPdfUrl] = useState<string | null>(null)

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
        const tokenGuardado = localStorage.getItem('tokenARCA')

        if (certificadoGuardado === 'true' && cuitGuardado) {
          const backendPort = await window.electron.getBackendPort()
          console.log('Inicializando AFIP SDK con CUIT:', cuitGuardado)

          // Configurar token si existe
          if (tokenGuardado) {
            await axios.post(`http://localhost:${backendPort}/arca/configurar-token`, {
              token: tokenGuardado,
            })
            console.log('✅ Token AFIP configurado')
          }

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
        console.log('Función disponible solo en la aplicación empaquetada')
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

    // Si se cambia a Factura A, forzar DocTipo a CUIT (80)
    if (field === 'TipoFactura' && value === 'A') {
      setFormData(prev => ({ ...prev, [field]: value, DocTipo: '80' }))
    }

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

  const limpiarFormulario = (mantenerResultado = false): void => {
    setFormData({
      TipoFactura: DEFAULTS.TIPO_FACTURA,
      DocTipo: DEFAULTS.TIPO_DOCUMENTO,
      DocNro: '',
      Concepto: DEFAULTS.CONCEPTO,
      CondicionIVA: DEFAULTS.CONDICION_IVA,
      CondicionVenta: 'efectivo',
      RazonSocial: '',
      Domicilio: '',
      Articulos: [{
        codigo: '',
        descripcion: 'Componente informático',
        cantidad: DEFAULTS.CANTIDAD_DEFAULT,
        unidadMedida: DEFAULTS.UNIDAD_MEDIDA_DEFAULT,
        precioUnitario: undefined,
        alicuotaIVA: DEFAULTS.ALICUOTA_IVA_DEFAULT,
      }],
      ImpNeto: '0.00',
      ImpIVA: '0.00',
      ImpTotal: '0.00',
      FchServDesde: undefined,
      FchServHasta: undefined,
      FchVtoPago: undefined,
    })
    if (!mantenerResultado) {
      setResultado(null)
      setQrUrl(null)
      setPdfUrl(null)
      setHtmlPreview(null)
    }
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    clearError()

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

    // Convertir fechas de formato YYYY-MM-DD a AAAAMMDD para AFIP
    const convertirFecha = (fecha: string): string => {
      return fecha.replace(/-/g, '')
    }

    const facturaData: any = {
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

    // Agregar campos de fecha si el concepto es 2 (Servicios) o 3 (Productos y Servicios)
    if (concepto === 2 || concepto === 3) {
      if (formData.FchServDesde) {
        facturaData.FchServDesde = convertirFecha(formData.FchServDesde)
      }
      if (formData.FchServHasta) {
        facturaData.FchServHasta = convertirFecha(formData.FchServHasta)
      }
      if (formData.FchVtoPago) {
        facturaData.FchVtoPago = convertirFecha(formData.FchVtoPago)
      }
    }

    const response = await crearFactura(facturaData)
    // Agregar datos adicionales al resultado, incluyendo una copia de formData
    setResultado({
      ...response,
      tipoFactura: formData.TipoFactura,
      razonSocial: formData.RazonSocial,
      formData: { ...formData }, // Guardar copia de los datos del formulario
    })

    // Si la factura se creó exitosamente, guardarla en la base de datos local
    if (response.success && response.data) {
      try {
        const condicionIVANombre = getNombreCondicionIVA(formData.CondicionIVA, formData.TipoFactura)
        const conceptoNombre = CONCEPTOS.find(c => c.id === formData.Concepto)?.nombre || 'Productos'
        const condicionVentaNombre = CONDICIONES_VENTA.find(c => c.id === formData.CondicionVenta)?.nombre || 'Efectivo'

        // Calcular IVAs agrupados para guardar
        const ivasAgrupados = agruparIVAPorAlicuota(formData.Articulos)

        const facturaGuardada = {
          cae: response.data.CAE,
          caeVencimiento: response.data.CAEFchVto,
          fechaProceso: response.data.FchProceso,
          ptoVta: response.data.PtoVta,
          cbteTipo: response.data.CbteTipo,
          cbteDesde: response.data.CbteDesde,
          cbteHasta: response.data.CbteHasta,
          docTipo: response.data.DocTipo,
          docNro: response.data.DocNro,
          impTotal: response.data.ImpTotal,
          impNeto: Number.parseFloat(formData.ImpNeto),
          impIVA: Number.parseFloat(formData.ImpIVA),
          tipoFactura: formData.TipoFactura,
          concepto: conceptoNombre,
          condicionIVA: condicionIVANombre,
          condicionVenta: condicionVentaNombre,
          razonSocial: formData.RazonSocial || '',
          domicilio: formData.Domicilio || '',
          articulos: JSON.stringify(formData.Articulos),
          ivas: JSON.stringify(ivasAgrupados),
          datosEmisor: JSON.stringify({
            cuit: datosEmisor.cuit,
            razonSocial: datosEmisor.razonSocial,
            domicilio: datosEmisor.domicilio,
            condicionIVA: datosEmisor.condicionIVA === '1'
              ? 'Responsable Inscripto'
              : datosEmisor.condicionIVA === '6' ? 'Responsable Monotributo' : 'Exento',
            iibb: datosEmisor.iibb || 'Exento',
            inicioActividades: datosEmisor.inicioActividades,
          }),
        }

        const saveResult = await guardarFactura(facturaGuardada)
        if (saveResult.success && saveResult.id) {
          console.log('✅ Factura guardada en la base de datos local con ID:', saveResult.id)
          // Guardar el ID de la factura en el estado para usar al guardar el PDF
          setResultado(prev => prev ? { ...prev, facturaLocalId: saveResult.id } : prev)
        }
      } catch (error) {
        console.error('Error al guardar factura en BD local:', error)
        // No bloqueamos el flujo si falla el guardado local
      }
    }

    // Si la factura se creó exitosamente, generar QR automáticamente
    if (response.success && response.data) {
      toast.success('Factura generada correctamente')
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
          // El precioUnitario ahora ya incluye IVA, el subtotal es cantidad * precio
          const subtotalConIVA = articulo.cantidad * articulo.precioUnitario

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

    // Limpiar formulario solo si la factura se creó exitosamente, pero mantener el resultado
    if (response.success) {
      limpiarFormulario(true)
    }
  }

  const handleConsultarContribuyente = async (): Promise<void> => {
    if (!formData.DocNro) {
      toast.error('Ingrese un CUIT o DNI para buscar', { id: 'buscar-contribuyente' })
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
      let cuitABuscar = formData.DocNro

      // Si es DNI (tipo 96), primero obtener el CUIT
      if (formData.DocTipo === '96') {

        const responseCUIT = await obtenerCUITDesdeDNI(formData.DocNro)

        if (!responseCUIT.success || !responseCUIT.data?.cuit) {
          toast.dismiss(toastIdLoading)
          toast.error('DNI no encontrado', {
            description: responseCUIT.error || 'No se encontró CUIT asociado al DNI',
          })
          setLoadingContribuyente(false)
          return
        }

        cuitABuscar = responseCUIT.data.cuit.toString()
        console.log(`✅ CUIT obtenido desde DNI ${formData.DocNro}: ${cuitABuscar}`)
      }

      // Ahora consultar los datos con el CUIT
      const response = await consultarContribuyente(cuitABuscar)
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
    if (!resultado?.data || !resultado?.formData)
      return

    setLoadingPDF(true)
    const toastId = `pdf-generation-${Date.now()}`
    toast.loading('Generando PDF...', { id: toastId })

    // Usar los datos guardados en el resultado en lugar de formData actual
    const datosFactura = resultado.formData

    // Preparar artículos para el PDF usando utilidades
    const articulosPDF = datosFactura.Articulos.map((articulo) => {
      const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)
      // El precioUnitario ahora ya incluye IVA, el subtotal es cantidad * precio
      const subtotalConIVA = articulo.cantidad * (articulo.precioUnitario || 0)

      return {
        codigo: articulo.codigo || '',
        descripcion: articulo.descripcion,
        cantidad: articulo.cantidad,
        unidadMedida: articulo.unidadMedida,
        precioUnitario: articulo.precioUnitario || 0,
        alicuotaIVA: articulo.alicuotaIVA,
        porcentajeIVA: alicuota?.porcentaje || 0,
        subtotal: subtotalConIVA,
      }
    })

    // Usar utilidad para agrupar IVAs
    const ivasAgrupados = agruparIVAPorAlicuota(datosFactura.Articulos).map(iva => ({
      alicuota: iva.id,
      porcentaje: iva.porcentaje,
      baseImponible: iva.baseImponible,
      importeIVA: iva.importeIVA,
    }))

    // Obtener nombre de condición IVA usando utilidad
    const condicionIVANombre = getNombreCondicionIVA(datosFactura.CondicionIVA, datosFactura.TipoFactura)
    const conceptoNombre = CONCEPTOS.find(c => c.id === datosFactura.Concepto)?.nombre || 'Productos'
    const condicionVentaNombre = CONDICIONES_VENTA.find(c => c.id === datosFactura.CondicionVenta)?.nombre || 'Efectivo'

    // Calcular totales desde artículos
    const totales = calcularTotalesFactura(datosFactura.Articulos)

    // Crear datos extendidos para el PDF
    const pdfData = {
      ...resultado.data,
      ImpNeto: totales.neto,
      ImpIVA: totales.iva,
      TipoFactura: datosFactura.TipoFactura,
      CondicionIVA: condicionIVANombre,
      RazonSocial: datosFactura.RazonSocial,
      Domicilio: datosFactura.Domicilio,
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

      // Si existe el ID de la factura guardada localmente, actualizar el pdfPath
      if (resultado?.facturaLocalId) {
        try {
          await actualizarPdfPath(resultado.facturaLocalId, pdfResponse.filePath)
          console.log('✅ PDF path actualizado en la base de datos local')
        } catch (error) {
          console.error('Error al actualizar PDF path en BD local:', error)
          // No bloqueamos el flujo si falla la actualización
        }
      }

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
    setLoadingPDF(false)
  }

  // ====== Funciones para Tickets ======
  
  const recalcularTotalesTicket = (articulo: ArticuloTicket): void => {
    const cantidad = articulo.cantidad || 0
    const precioUnitario = articulo.precioUnitario || 0
    const totalConIVA = cantidad * precioUnitario
    
    // Buscar la alícuota de IVA
    const alicuota = ALICUOTAS_IVA.find(a => a.id === ticketFormData.IVA)
    const porcentajeIVA = alicuota?.porcentaje || 0
    
    // Calcular el neto (sin IVA)
    const impNeto = totalConIVA / (1 + porcentajeIVA / 100)
    const impIVA = totalConIVA - impNeto

    setTicketFormData(prev => ({
      ...prev,
      ImpNeto: impNeto.toFixed(2),
      ImpIVA: impIVA.toFixed(2),
      ImpTotal: totalConIVA.toFixed(2),
    }))
  }

  const handleTicketInputChange = (field: keyof TicketFormData, value: string): void => {
    setTicketFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // Si se cambia el IVA, actualizar alícuota del artículo y recalcular
      if (field === 'IVA') {
        newData.Articulo = { ...newData.Articulo, alicuotaIVA: value }
      }
      
      return newData
    })

    // Recalcular totales si cambió el IVA
    if (field === 'IVA') {
      setTimeout(() => recalcularTotalesTicket(ticketFormData.Articulo), 0)
    }
  }

  const handleTicketArticuloChange = (field: keyof ArticuloTicket, value: string | number): void => {
    const nuevoArticulo = { ...ticketFormData.Articulo, [field]: value }
    setTicketFormData(prev => ({ ...prev, Articulo: nuevoArticulo }))
    recalcularTotalesTicket(nuevoArticulo)
  }

  const limpiarFormularioTicket = (mantenerResultado = false): void => {
    setTicketFormData({
      CondicionVenta: 'efectivo',
      CondicionIVA: '5',
      IVA: '4',
      Articulo: {
        descripcion: 'Componente informático',
        cantidad: DEFAULTS.CANTIDAD_DEFAULT,
        unidadMedida: DEFAULTS.UNIDAD_MEDIDA_DEFAULT,
        precioUnitario: undefined,
        alicuotaIVA: '4',
      },
      ImpNeto: '0.00',
      ImpIVA: '0.00',
      ImpTotal: '0.00',
    })
    if (!mantenerResultado) {
      setTicketResultado(null)
      setTicketHtmlPreview(null)
    }
  }

  const handleSubmitTicket = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    clearError()

    // Preparar IVA array - siempre un solo elemento para ticket
    const alicuota = ALICUOTAS_IVA.find(a => a.id === ticketFormData.IVA)
    const porcentajeIVA = alicuota?.porcentaje || 0
    const impNeto = Number.parseFloat(ticketFormData.ImpNeto)
    const impIVA = Number.parseFloat(ticketFormData.ImpIVA)

    const ivaArray = [{
      Id: Number.parseInt(ticketFormData.IVA),
      BaseImp: impNeto,
      Importe: impIVA,
    }]

    const ticketData = {
      PtoVta: datosEmisor.puntoVenta,
      CbteTipo: TIPOS_COMPROBANTE.FACTURA_B, // Ticket siempre es Factura B
      Concepto: 1, // Siempre Productos
      DocTipo: 99, // Consumidor Final
      DocNro: 0, // Sin documento
      ImpTotal: Number.parseFloat(ticketFormData.ImpTotal),
      ImpNeto: impNeto,
      ImpIVA: impIVA,
      Iva: ivaArray,
    }

    const response = await crearFactura(ticketData)
    
    // Guardar una copia de los datos del formulario antes de limpiarlo
    const ticketDataCopy = { ...ticketFormData }
    
    setTicketResultado({
      ...response,
      formData: ticketDataCopy,
    })

    // Si el ticket se creó exitosamente, limpiar formulario inmediatamente
    if (response.success && response.data) {
      toast.success('Ticket generado correctamente')
      limpiarFormularioTicket(true)
      
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
        // Generar imagen del QR para el ticket
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrResponse.qrUrl)}`
        
        // Convertir QR URL a base64
        const qrImageResponse = await fetch(qrImageUrl)
        const blob = await qrImageResponse.blob()
        const qrBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })

        const condicionIVANombre = getNombreCondicionIVA(ticketDataCopy.CondicionIVA, 'B')
        const condicionVentaNombre = CONDICIONES_VENTA.find(c => c.id === ticketDataCopy.CondicionVenta)?.nombre || 'Efectivo'

        const ticketPDFData: TicketPDFData = {
          ...response.data,
          ImpNeto: impNeto,
          ImpIVA: impIVA,
          CondicionIVA: condicionIVANombre,
          CondicionVenta: condicionVentaNombre,
          Articulo: {
            descripcion: ticketDataCopy.Articulo.descripcion,
            cantidad: ticketDataCopy.Articulo.cantidad || 0,
            porcentajeIVA: porcentajeIVA,
            precioUnitario: ticketDataCopy.Articulo.precioUnitario || 0,
            subtotal: (ticketDataCopy.Articulo.cantidad || 0) * (ticketDataCopy.Articulo.precioUnitario || 0),
          },
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

        const htmlContent = generarHTMLTicket(ticketPDFData, qrBase64)
        setTicketHtmlPreview(htmlContent)
      }

      // Guardar el ticket en la base de datos local
      try {
        const condicionIVANombre = getNombreCondicionIVA(ticketDataCopy.CondicionIVA, 'B')
        const condicionVentaNombre = CONDICIONES_VENTA.find(c => c.id === ticketDataCopy.CondicionVenta)?.nombre || 'Efectivo'

        // Agrupar IVAs para guardar
        const ivasAgrupados = [{
          id: ticketDataCopy.IVA,
          porcentaje: porcentajeIVA,
          baseImponible: impNeto,
          importeIVA: impIVA,
        }]

        const ticketGuardado = {
          cae: response.data.CAE,
          caeVencimiento: response.data.CAEFchVto,
          fechaProceso: response.data.FchProceso,
          ptoVta: response.data.PtoVta,
          cbteTipo: response.data.CbteTipo,
          cbteDesde: response.data.CbteDesde,
          cbteHasta: response.data.CbteHasta,
          docTipo: response.data.DocTipo,
          docNro: response.data.DocNro,
          impTotal: response.data.ImpTotal,
          impNeto: impNeto,
          impIVA: impIVA,
          tipoFactura: 'B' as 'B',
          concepto: 'Productos',
          condicionIVA: condicionIVANombre,
          condicionVenta: condicionVentaNombre,
          razonSocial: 'Consumidor Final',
          domicilio: '',
          articulos: JSON.stringify([ticketDataCopy.Articulo]),
          ivas: JSON.stringify(ivasAgrupados),
          datosEmisor: JSON.stringify({
            cuit: datosEmisor.cuit,
            razonSocial: datosEmisor.razonSocial,
            domicilio: datosEmisor.domicilio,
            condicionIVA: datosEmisor.condicionIVA === '1'
              ? 'Responsable Inscripto'
              : datosEmisor.condicionIVA === '6' ? 'Responsable Monotributo' : 'Exento',
            iibb: datosEmisor.iibb || 'Exento',
            inicioActividades: datosEmisor.inicioActividades,
          }),
          esTicket: true, // Flag para identificar tickets
        }

        const saveResult = await guardarFactura(ticketGuardado)
        if (saveResult.success && saveResult.id) {
          console.log('✅ Ticket guardado en la base de datos local con ID:', saveResult.id)
          // Guardar el ID del ticket en el estado
          setTicketResultado(prev => prev ? { ...prev, facturaLocalId: saveResult.id } : prev)
        }
      } catch (error) {
        console.error('Error al guardar ticket en BD local:', error)
        // No bloqueamos el flujo si falla el guardado local
      }
    }
  }

  const handleDescargarPDFTicket = async (): Promise<void> => {
    if (!ticketResultado?.data || !ticketResultado?.formData)
      return

    setLoadingTicketPDF(true)
    const toastId = `pdf-ticket-${Date.now()}`
    toast.loading('Generando PDF del Ticket...', { id: toastId })

    // Usar los datos guardados en el resultado
    const datosTicket = ticketResultado.formData

    // Buscar la alícuota de IVA
    const alicuota = ALICUOTAS_IVA.find(a => a.id === datosTicket.IVA)
    const porcentajeIVA = alicuota?.porcentaje || 0

    // Obtener nombre de condición IVA
    const condicionIVANombre = getNombreCondicionIVA(datosTicket.CondicionIVA, 'B')
    const condicionVentaNombre = CONDICIONES_VENTA.find(c => c.id === datosTicket.CondicionVenta)?.nombre || 'Efectivo'

    // Crear datos para el PDF del ticket
    const ticketPdfData: TicketPDFData = {
      CAE: ticketResultado.data.CAE,
      CAEFchVto: ticketResultado.data.CAEFchVto,
      CbteDesde: ticketResultado.data.CbteDesde,
      PtoVta: ticketResultado.data.PtoVta || datosEmisor.puntoVenta,
      FchProceso: ticketResultado.data.FchProceso || new Date().toISOString().split('T')[0].replace(/-/g, ''),
      ImpTotal: ticketResultado.data.ImpTotal || 0,
      ImpNeto: Number.parseFloat(datosTicket.ImpNeto),
      ImpIVA: Number.parseFloat(datosTicket.ImpIVA),
      CondicionIVA: condicionIVANombre,
      CondicionVenta: condicionVentaNombre,
      Articulo: {
        descripcion: datosTicket.Articulo.descripcion,
        cantidad: datosTicket.Articulo.cantidad || 0,
        porcentajeIVA: porcentajeIVA,
        precioUnitario: datosTicket.Articulo.precioUnitario || 0,
        subtotal: (datosTicket.Articulo.cantidad || 0) * (datosTicket.Articulo.precioUnitario || 0),
      },
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

    const pdfResponse = await generarPDFTicket(ticketPdfData)

    if (pdfResponse.success && pdfResponse.filePath) {
      setTicketPdfUrl(pdfResponse.filePath)

      // Si existe el ID del ticket guardado localmente, actualizar el pdfPath
      if (ticketResultado?.facturaLocalId) {
        try {
          await actualizarPdfPath(ticketResultado.facturaLocalId, pdfResponse.filePath)
          console.log('✅ PDF path del ticket actualizado en la base de datos local')
        } catch (error) {
          console.error('Error al actualizar PDF path en BD local:', error)
        }
      }

      toast.success(
        'PDF del Ticket generado exitosamente',
        {
          id: toastId,
          description: pdfResponse.message || 'El archivo está guardado',
          duration: 3000,
        },
      )
    } else {
      toast.error(
        `Error al generar PDF: ${pdfResponse.error}`,
        { id: toastId },
      )
    }
    setLoadingTicketPDF(false)
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">Facturación Electrónica</h1>
        <p className="text-sm text-gray-600">Crear facturas A y B</p>
      </div>

      <Tabs defaultValue="facturar" className="mt-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="facturar">Crear Factura</TabsTrigger>
          <TabsTrigger value="ticket">Crear Ticket</TabsTrigger>
          <TabsTrigger value="comprobantes">Comprobantes Emitidos</TabsTrigger>
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
            onLimpiar={() => limpiarFormulario(false)}
            onConsultarContribuyente={handleConsultarContribuyente}
            loadingContribuyente={loadingContribuyente}
            onConfirmDialog={() => {
              // Ocultar el resultado anterior cuando se confirma crear una nueva factura
              setResultado(null)
              setQrUrl(null)
              setPdfUrl(null)
              setHtmlPreview(null)
            }}
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
                loadingPDF={loadingPDF}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="ticket">
          <TicketForm
            formData={ticketFormData}
            loading={loading}
            error={error}
            onInputChange={handleTicketInputChange}
            onArticuloChange={handleTicketArticuloChange}
            onSubmit={handleSubmitTicket}
            onLimpiar={() => limpiarFormularioTicket(false)}
            onConfirmDialog={() => {
              setTicketResultado(null)
              setTicketHtmlPreview(null)
            }}
          />

          {ticketResultado && (
            <div className="mt-4">
              <TicketResultado
                resultado={ticketResultado}
                htmlPreview={ticketHtmlPreview || undefined}
                onGenerarPDF={handleDescargarPDFTicket}
                loadingPDF={loadingTicketPDF}
                pdfUrl={ticketPdfUrl}
                pdfSavePath={pdfSavePath}
                onSelectFolder={handleSelectFolder}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="comprobantes">
          <ComprobantesEmitidos />
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
