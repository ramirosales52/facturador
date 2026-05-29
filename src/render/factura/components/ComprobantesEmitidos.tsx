import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@render/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@render/components/ui/dialog'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@render/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@render/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@render/components/ui/table'
import { Separator } from '@render/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@render/components/ui/tabs'
import { ArrowUpDown, ChevronDown, ChevronUp, Eye, EyeOff, FileText, Filter, FolderOpen, Loader2, Printer, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useArca } from '../../hooks/useArca'
import { agruparIVAPorAlicuota, formatearMoneda, prepararNotaCreditoParcial } from '@render/utils/calculos'
import { generarHTMLTicket } from './ticketTemplate'
import { generarHTMLFactura } from './facturaTemplate'

const TIPOS_DOCUMENTO = [
  { id: '80', nombre: 'CUIT' },
  { id: '96', nombre: 'DNI' },
  { id: '99', nombre: 'Consumidor Final' },
]

const ALICUOTAS_IVA = [
  { id: '3', nombre: '0%', porcentaje: 0 },
  { id: '4', nombre: '10.5%', porcentaje: 10.5 },
  { id: '5', nombre: '21%', porcentaje: 21 },
]

interface FacturaLocal {
  id: number
  cae: string
  caeVencimiento: string
  fechaProceso: string
  ptoVta: number
  cbteTipo: number
  cbteDesde: number
  cbteHasta: number
  docTipo: number
  docNro: number
  impTotal: number
  impNeto: number
  impIVA: number
  tipoFactura: 'A' | 'B'
  concepto: string
  condicionIVA: string
  condicionVenta: string
  razonSocial?: string
  domicilio?: string
  articulos: string // JSON
  ivas: string // JSON
  datosEmisor: string // JSON
  pdfPath?: string
  esTicket?: number // SQLite usa INTEGER para boolean (0 o 1)
  cbteAsocTipo?: number | null
  cbteAsocPtoVta?: number | null
  cbteAsocNro?: number | null
  createdAt: string
}

export function ComprobantesEmitidos() {
  const { obtenerFacturas, crearFactura, guardarFactura, generarPDF, generarPDFTicket, actualizarPdfPath, generarQR } = useArca()

  const [loading, setLoading] = useState(false)
  const [facturas, setFacturas] = useState<FacturaLocal[]>([])
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [regenerandoPDF, setRegenerandoPDF] = useState<number | null>(null)
  const [generandoNotaCredito, setGenerandoNotaCredito] = useState<number | null>(null)
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<FacturaLocal | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false)
  const [ticketHtml, setTicketHtml] = useState<string>('')
  const [facturaHtml, setFacturaHtml] = useState<string>('')
  const [notaCreditoDialogOpen, setNotaCreditoDialogOpen] = useState(false)
  const [notaCreditoMontoTipo, setNotaCreditoMontoTipo] = useState<'total' | 'parcial'>('total')
  const [notaCreditoMonto, setNotaCreditoMonto] = useState('')
  const [historicoNotaCredito, setHistoricoNotaCredito] = useState<FacturaLocal[]>([])
  const [historicoNotaCreditoLoading, setHistoricoNotaCreditoLoading] = useState(false)
  

  // Estado de ordenamiento
  type SortField = 'tipoFactura' | 'fechaProceso' | 'impTotal' | null
  type SortDirection = 'asc' | 'desc'
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [tabActivo, setTabActivo] = useState('todos')
  const [tipoDoc, setTipoDoc] = useState('')
  const [nroDoc, setNroDoc] = useState('')
  const [cliente, setCliente] = useState('')

  // Cargar facturas al montar el componente
  useEffect(() => {
    cargarFacturas()
  }, [])

  const cargarFacturas = async (filtros?: any) => {
    setLoading(true)
    setError(null)

    try {
      const response = await obtenerFacturas(filtros)

      if (response.success && response.data) {
        setFacturas(response.data)
        setError(null)
      } else {
        setError(response.error || 'Error al cargar facturas')
      }
    } catch (error: any) {
      console.error('Error al cargar facturas:', error)
      setError(error.message || 'Error inesperado al cargar facturas')
    } finally {
      setLoading(false)
    }
  }

  const handleBuscar = async () => {
    setError(null)

    const filtros: any = {}

    if (fechaDesde) {
      filtros.fechaDesde = fechaDesde
    }
    if (fechaHasta) {
      filtros.fechaHasta = fechaHasta
    }
    if (tipoDoc) {
      filtros.docTipo = parseInt(tipoDoc)
    }
    if (nroDoc) {
      filtros.docNro = parseInt(nroDoc)
    }

    await cargarFacturas(filtros)
  }

  const handleLimpiarFiltros = () => {
    setFechaDesde('')
    setFechaHasta('')
    setTabActivo('todos')
    setTipoDoc('')
    setNroDoc('')
    setCliente('')
    setSortField(null)
    setSortDirection('asc')
    cargarFacturas()
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Si ya está ordenado por este campo, cambiar dirección
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Nuevo campo, ordenar ascendente
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortedFacturas = () => {
    // Primero filtrar por tipo de comprobante según el tab activo
    let facturasFiltered = facturas

    if (tabActivo === 'ticket') {
      // Solo mostrar tickets (esTicket === 1)
      facturasFiltered = facturas.filter(f => f.esTicket === 1)
    } else if (tabActivo === 'consumidor-final') {
      // Solo mostrar facturas B a consumidor final que NO sean tickets
      facturasFiltered = facturas.filter(f => f.cbteTipo === 6 && f.docTipo === 99 && f.esTicket !== 1)
    } else if (tabActivo === 'factura-a') {
      facturasFiltered = facturas.filter(f => f.cbteTipo === 1 && f.esTicket !== 1)
    } else if (tabActivo === 'factura-b') {
      facturasFiltered = facturas.filter(f => f.cbteTipo === 6 && f.docTipo !== 99 && f.esTicket !== 1)
    } else if (tabActivo === 'nc') {
      facturasFiltered = facturas.filter(f => (f.cbteTipo === 3 || f.cbteTipo === 8) && f.esTicket !== 1)
    }
    // Si tabActivo === 'todos', no filtramos

    // Filtrar por cliente si hay texto de búsqueda
    if (cliente.trim()) {
      const clienteLower = cliente.toLowerCase().trim()
      facturasFiltered = facturasFiltered.filter(f =>
        f.razonSocial?.toLowerCase().includes(clienteLower)
      )
    }

    // Si no hay campo de ordenamiento, devolver las facturas filtradas
    if (!sortField) return facturasFiltered

    // Ordenar las facturas filtradas
    return [...facturasFiltered].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case 'tipoFactura':
          aValue = a.tipoFactura
          bValue = b.tipoFactura
          break
        case 'fechaProceso':
          aValue = new Date(a.fechaProceso).getTime()
          bValue = new Date(b.fechaProceso).getTime()
          break
        case 'impTotal':
          aValue = a.impTotal
          bValue = b.impTotal
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  // Contadores por tipo de comprobante (considerando filtro de cliente)
  const getContadores = () => {
    // Aplicar filtro de cliente primero si existe
    let facturasBase = facturas
    if (cliente.trim()) {
      const clienteLower = cliente.toLowerCase().trim()
      facturasBase = facturas.filter(f =>
        f.razonSocial?.toLowerCase().includes(clienteLower)
      )
    }

    const todos = facturasBase.length
    const facturaA = facturasBase.filter(f => f.cbteTipo === 1 && f.esTicket !== 1).length
    const facturaB = facturasBase.filter(f => f.cbteTipo === 6 && f.docTipo !== 99 && f.esTicket !== 1).length
    const nc = facturasBase.filter(f => (f.cbteTipo === 3 || f.cbteTipo === 8) && f.esTicket !== 1).length
    const consumidorFinal = facturasBase.filter(f => f.cbteTipo === 6 && f.docTipo === 99 && f.esTicket !== 1).length
    const tickets = facturasBase.filter(f => f.esTicket === 1).length
    return { todos, facturaA, facturaB, nc, consumidorFinal, tickets }
  }

  const contadores = getContadores()

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="ml-2 h-4 w-4" />
      : <ChevronDown className="ml-2 h-4 w-4" />
  }

  const getTipoComprobanteLabel = (factura: FacturaLocal): string => {
    if (factura.esTicket === 1) return 'Ticket'
    if (factura.cbteTipo === 3) return 'NC A'
    if (factura.cbteTipo === 8) return 'NC B'
    if (factura.cbteTipo === 6 && factura.docTipo === 99) return 'C. Final'
    if (factura.cbteTipo === 1) return 'Factura A'
    if (factura.cbteTipo === 6) return 'Factura B'
    return `Comprobante ${factura.cbteTipo}`
  }

  const getTipoComprobanteDetalle = (factura: FacturaLocal): string => {
    if (factura.esTicket === 1) return 'Ticket'
    if (factura.cbteTipo === 3) return 'Nota de Crédito A'
    if (factura.cbteTipo === 8) return 'Nota de Crédito B'
    if (factura.cbteTipo === 6 && factura.docTipo === 99) return 'Consumidor Final'
    if (factura.cbteTipo === 1) return 'Factura A'
    if (factura.cbteTipo === 6) return 'Factura B'
    return `Comprobante ${factura.cbteTipo}`
  }

  const handleRegenerarPDF = async (factura: FacturaLocal) => {
    // Primero seleccionar carpeta
    // @ts-ignore - Electron API
    if (!window.electron?.dialog?.showOpenDialog) {
      console.log('Función disponible solo en la aplicación empaquetada')
      return
    }

    try {
      // @ts-ignore
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Seleccionar carpeta para guardar el PDF',
      })

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        // Usuario canceló
        return
      }

      const selectedPath = result.filePaths[0]

      setRegenerandoPDF(factura.id)
      const toastId = `pdf-${factura.id}-${Date.now()}`
      toast.loading('Regenerando PDF...', { id: toastId })

      // Parsear los datos guardados
      const articulos = JSON.parse(factura.articulos)
      const ivas = JSON.parse(factura.ivas)
      const datosEmisor = JSON.parse(factura.datosEmisor)

      // Agregar porcentajeIVA a los artículos para el PDF
      const ALICUOTAS_IVA = [
        { id: '3', nombre: '0%', porcentaje: 0 },
        { id: '4', nombre: '10.5%', porcentaje: 10.5 },
        { id: '5', nombre: '21%', porcentaje: 21 },
      ]

      let response: any

      // Si es un ticket, usar el endpoint específico de tickets
      if (factura.esTicket === 1) {
        // El ticket solo tiene un artículo
        const articulo = articulos[0]
        const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)
        const porcentajeIVA = alicuota?.porcentaje || 0

        const ticketPdfData = {
          CAE: factura.cae,
          CAEFchVto: factura.caeVencimiento,
          CbteDesde: factura.cbteDesde,
          PtoVta: factura.ptoVta,
          FchProceso: factura.fechaProceso,
          ImpTotal: factura.impTotal,
          ImpNeto: factura.impNeto,
          ImpIVA: factura.impIVA,
          CondicionIVA: factura.condicionIVA,
          CondicionVenta: factura.condicionVenta,
          Articulo: {
            descripcion: articulo.descripcion,
            cantidad: articulo.cantidad,
            porcentajeIVA: porcentajeIVA,
            precioUnitario: articulo.precioUnitario,
            subtotal: articulo.cantidad * articulo.precioUnitario,
          },
          DatosEmisor: datosEmisor,
          customPath: selectedPath,
        }

        response = await generarPDFTicket(ticketPdfData)
      } else {
        // Factura normal
        const articulosConPorcentaje = articulos.map((articulo: any) => {
          const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)
          return {
            ...articulo,
            porcentajeIVA: alicuota?.porcentaje || 0,
          }
        })

        // Preparar datos para el PDF con la carpeta seleccionada
        const pdfData = {
          PtoVta: factura.ptoVta,
          CbteTipo: factura.cbteTipo,
          CbteDesde: factura.cbteDesde,
          DocTipo: factura.docTipo,
          DocNro: factura.docNro,
          ImpTotal: factura.impTotal,
          ImpNeto: factura.impNeto,
          ImpIVA: factura.impIVA,
          CAE: factura.cae,
          CAEFchVto: factura.caeVencimiento,
          FchProceso: factura.fechaProceso,
          TipoFactura: factura.tipoFactura,
          RazonSocial: factura.razonSocial,
          Domicilio: factura.domicilio,
          Concepto: factura.concepto,
          CondicionVenta: factura.condicionVenta,
          CondicionIVA: factura.condicionIVA,
          Articulos: articulosConPorcentaje,
          IVAsAgrupados: ivas,
          DatosEmisor: datosEmisor,
          customPath: selectedPath,
        }

        response = await generarPDF(pdfData)
      }

      if (response.success && response.filePath) {
        // Actualizar el pdfPath en la base de datos
        await actualizarPdfPath(factura.id, response.filePath)

        // Recargar facturas para actualizar la tabla
        await cargarFacturas()

        // Actualizar la factura seleccionada si es la misma que se regeneró
        if (facturaSeleccionada?.id === factura.id) {
          setFacturaSeleccionada({
            ...facturaSeleccionada,
            pdfPath: response.filePath,
          })
        }

        toast.dismiss(toastId)
        toast.success('PDF regenerado exitosamente', {
          description: response.message || 'El archivo está guardado',
        })
      } else {
        toast.dismiss(toastId)
        toast.error(`Error al regenerar PDF: ${response.error}`)
      }
    } catch (error: any) {
      toast.error('Error al regenerar PDF')
    } finally {
      setRegenerandoPDF(null)
    }
  }

  const handleGenerarNotaCredito = async (factura: FacturaLocal, montoAcreditar?: number) => {
    if (factura.esTicket === 1) {
      toast.error('No se puede generar nota de crédito desde un ticket')
      return
    }

    const esFacturaA = factura.cbteTipo === 1
    const esFacturaB = factura.cbteTipo === 6

    if (!esFacturaA && !esFacturaB) {
      toast.error('Solo se puede generar nota de crédito desde Factura A o B')
      return
    }

    setGenerandoNotaCredito(factura.id)
    const toastId = `nc-${factura.id}-${Date.now()}`
    toast.loading('Generando nota de crédito...', { id: toastId })

    try {
      const articulos = JSON.parse(factura.articulos)
      let ivasAgrupados = agruparIVAPorAlicuota(articulos)
      let impTotal = factura.impTotal
      let impNeto = factura.impNeto
      let impIVA = factura.impIVA
      let articulosNC = articulos

      if (montoAcreditar !== undefined && montoAcreditar < factura.impTotal) {
        const parcial = prepararNotaCreditoParcial(articulos, montoAcreditar)
        articulosNC = parcial.articulos
        ivasAgrupados = parcial.ivasAgrupados
        impNeto = parcial.impNeto
        impIVA = parcial.impIVA
        impTotal = parcial.impTotal
      }

      const tipoNotaCredito = factura.cbteTipo === 1 ? 3 : 8
      const tipoAsociado = factura.cbteTipo === 1 ? 1 : 6
      const condicionIVAReceptorId = factura.cbteTipo === 1 ? 1 : 5
      const tipoFactura = factura.cbteTipo === 1 ? 'A' as const : 'B' as const
      const concepto = factura.concepto === 'Servicios' ? 2 : factura.concepto === 'Productos y Servicios' ? 3 : 1
      const fechaServicio = factura.fechaProceso.replace(/-/g, '')
      const documentoEsConsumidorFinal = factura.cbteTipo === 6 || factura.docTipo === 99
      const docTipo = factura.cbteTipo === 6 ? 99 : factura.docTipo
      const docNro = documentoEsConsumidorFinal ? 0 : factura.docNro

      const notaCreditoData = {
        PtoVta: factura.ptoVta,
        CbteTipo: tipoNotaCredito,
        Concepto: concepto,
        DocTipo: docTipo,
        DocNro: docNro,
        CondicionIVAReceptorId: condicionIVAReceptorId,
        CbtesAsoc: [{ Tipo: tipoAsociado, PtoVta: factura.ptoVta, Nro: factura.cbteDesde }],
        ImpTotal: impTotal,
        ImpNeto: impNeto,
        ImpIVA: impIVA,
        ImpTotConc: 0,
        ImpOpEx: 0,
        ImpTrib: 0,
        MonId: 'PES',
        MonCotiz: 1,
        ...(concepto === 2 || concepto === 3
          ? {
              FchServDesde: fechaServicio,
              FchServHasta: fechaServicio,
              FchVtoPago: fechaServicio,
            }
          : {}),
        Iva: ivasAgrupados.map(iva => ({
          Id: Number.parseInt(iva.id),
          BaseImp: iva.baseImponible,
          Importe: iva.importeIVA,
        })),
      }

      const response = await crearFactura(notaCreditoData)

      if (!response.success || !response.data) {
        throw new Error(response.error || 'No se pudo generar la nota de crédito')
      }

      const notaCreditoGuardada = {
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
        tipoFactura,
        concepto: factura.concepto,
        condicionIVA: factura.condicionIVA,
        condicionVenta: factura.condicionVenta,
        razonSocial: factura.razonSocial || '',
        domicilio: factura.domicilio || '',
        articulos: JSON.stringify(articulosNC),
        ivas: JSON.stringify(ivasAgrupados),
        datosEmisor: factura.datosEmisor,
        cbteAsocTipo: tipoAsociado,
        cbteAsocPtoVta: factura.ptoVta,
        cbteAsocNro: factura.cbteDesde,
      }

      const saveResult = await guardarFactura(notaCreditoGuardada)

      if (!saveResult.success || !saveResult.id) {
        throw new Error(saveResult.error || 'No se pudo guardar la nota de crédito')
      }

      await cargarFacturas()

      toast.dismiss(toastId)
      toast.success(`Nota de crédito ${tipoFactura} generada exitosamente`, {
        description: `Comprobante ${String(response.data.PtoVta).padStart(5, '0')}-${String(response.data.CbteDesde).padStart(8, '0')}`,
      })
    } catch (error: any) {
      toast.dismiss(toastId)
      toast.error(`Error al generar nota de crédito: ${error.message || 'Error inesperado'}`)
    } finally {
      setGenerandoNotaCredito(null)
    }
  }

  const handleConfirmNotaCredito = async () => {
    if (!facturaSeleccionada) return

    const monto = notaCreditoMontoTipo === 'parcial'
      ? Number.parseFloat(notaCreditoMonto)
      : undefined

    if (notaCreditoMontoTipo === 'parcial' && (!monto || monto <= 0)) {
      toast.error('Ingrese un monto a acreditar válido')
      return
    }

    if (notaCreditoMontoTipo === 'parcial' && monto && monto > facturaSeleccionada.impTotal) {
      toast.error('El monto no puede superar el total de la factura')
      return
    }

    setNotaCreditoDialogOpen(false)
    await handleGenerarNotaCredito(facturaSeleccionada, monto)
    await cargarHistoricoNC(facturaSeleccionada)
  }

  const handleAbrirCarpeta = async (pdfPath: string) => {
    try {
      // @ts-ignore - Electron API
      if (window.electron?.shell?.openPath) {
        // @ts-ignore
        const result = await window.electron.shell.openPath(pdfPath)
        // El handler retorna 'ok' si tuvo éxito, o un mensaje de error si falló
        if (result === 'El archivo fue borrado o movido') {
          toast.error('El archivo fue borrado o movido')
        } else if (result !== 'ok') {
          toast.error('No se pudo abrir la carpeta')
        }
      } else {
        console.log('Función disponible solo en la aplicación empaquetada')
      }
    } catch (error) {
      console.error('Error al abrir carpeta:', error)
      toast.error('Error al abrir la carpeta')
    }
  }

  const handleImprimir = async (pdfPath: string) => {
    try {
      // @ts-ignore - Electron API
      if (window.electron?.print?.pdf) {
        // @ts-ignore
        const result = await window.electron.print.pdf(pdfPath)

        if (!result.success) {
          if (result.error === 'El archivo fue borrado o movido') {
            toast.error('El archivo fue borrado o movido')
          } else {
            toast.error('No se pudo abrir el PDF para imprimir')
          }
        }
      } else {
        console.log('Función disponible solo en la aplicación empaquetada')
      }
    } catch (error) {
      console.error('Error al imprimir:', error)
      toast.error('Error al imprimir el PDF')
    }
  }

  const formatearFecha = (fecha: string): string => {
    // Convertir de YYYY-MM-DD a DD/MM/YYYY
    const [year, month, day] = fecha.split('-')
    return `${day}/${month}/${year}`
  }

  const cargarHistoricoNC = async (factura: FacturaLocal) => {
    if (factura.esTicket === 1 || (factura.cbteTipo !== 1 && factura.cbteTipo !== 6)) {
      setHistoricoNotaCredito([])
      return
    }

    setHistoricoNotaCreditoLoading(true)
    try {
      const response = await obtenerFacturas({
        cbteAsocTipo: factura.cbteTipo,
        cbteAsocPtoVta: factura.ptoVta,
        cbteAsocNro: factura.cbteDesde,
      })
      if (response.success && response.data) {
        setHistoricoNotaCredito(response.data)
      } else {
        setHistoricoNotaCredito([])
      }
    } catch {
      setHistoricoNotaCredito([])
    } finally {
      setHistoricoNotaCreditoLoading(false)
    }
  }

  const handleRowClick = async (factura: FacturaLocal) => {
    setFacturaSeleccionada(factura)
    setSheetOpen(true)
    setMostrarVistaPrevia(false)
    setTicketHtml('')
    setFacturaHtml('')
    setNotaCreditoDialogOpen(false)
    setNotaCreditoMontoTipo('total')
    setNotaCreditoMonto('')

    await cargarHistoricoNC(factura)

    // Si es un ticket, generar el HTML de la vista previa
    if (factura.esTicket === 1) {
      await generarHTMLTicketPreview(factura)
    } else {
      // Si es una factura normal, generar el HTML de la vista previa
      await generarHTMLFacturaPreview(factura)
    }
  }

  const generarHTMLTicketPreview = async (factura: FacturaLocal) => {
    try {
      const articulos = JSON.parse(factura.articulos)
      const datosEmisor = JSON.parse(factura.datosEmisor)

      // El ticket solo tiene un artículo
      const articulo = articulos[0]

      // Obtener alícuota de IVA
      const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)
      const porcentajeIVA = alicuota?.porcentaje || 0

      const ticketData = {
        CAE: factura.cae,
        CAEFchVto: factura.caeVencimiento,
        CbteDesde: factura.cbteDesde,
        PtoVta: factura.ptoVta,
        FchProceso: factura.fechaProceso,
        ImpTotal: factura.impTotal,
        ImpNeto: factura.impNeto,
        ImpIVA: factura.impIVA,
        CondicionIVA: factura.condicionIVA,
        CondicionVenta: factura.condicionVenta,
        Articulo: {
          descripcion: articulo.descripcion,
          cantidad: articulo.cantidad || 0,
          porcentajeIVA: porcentajeIVA,
          precioUnitario: articulo.precioUnitario || 0,
          subtotal: (articulo.cantidad || 0) * (articulo.precioUnitario || 0),
        },
        DatosEmisor: datosEmisor,
      }

      // Generar QR base64
      const qrData = {
        ver: 1,
        fecha: factura.fechaProceso,
        cuit: Number.parseInt(datosEmisor.cuit),
        ptoVta: factura.ptoVta,
        tipoCmp: factura.cbteTipo,
        nroCmp: factura.cbteDesde,
        importe: factura.impTotal,
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: factura.docTipo,
        nroDocRec: factura.docNro,
        tipoCodAut: 'E',
        codAut: factura.cae,
      }

      const qrResponse = await generarQR(qrData)

      if (qrResponse.success && qrResponse.qrUrl) {
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrResponse.qrUrl)}`
        const qrImageResponse = await fetch(qrImageUrl)
        const blob = await qrImageResponse.blob()
        const qrBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })

        const html = generarHTMLTicket(ticketData, qrBase64)
        setTicketHtml(html)
      }
    } catch (error) {
      console.error('Error al generar vista previa del ticket:', error)
    }
  }

  const generarHTMLFacturaPreview = async (factura: FacturaLocal) => {
    try {
      const articulos = JSON.parse(factura.articulos)
      const ivas = JSON.parse(factura.ivas)
      const datosEmisor = JSON.parse(factura.datosEmisor)

      // Agregar porcentajeIVA a los artículos
      const articulosConPorcentaje = articulos.map((articulo: any) => {
        const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)
        return {
          ...articulo,
          porcentajeIVA: alicuota?.porcentaje || 0,
        }
      })

      // Preparar datos para el HTML
      const pdfData = {
        PtoVta: factura.ptoVta,
        CbteTipo: factura.cbteTipo,
        CbteDesde: factura.cbteDesde,
        DocTipo: factura.docTipo,
        DocNro: factura.docNro,
        ImpTotal: factura.impTotal,
        ImpNeto: factura.impNeto,
        ImpIVA: factura.impIVA,
        CAE: factura.cae,
        CAEFchVto: factura.caeVencimiento,
        FchProceso: factura.fechaProceso,
        TipoFactura: factura.tipoFactura,
        RazonSocial: factura.razonSocial,
        Domicilio: factura.domicilio,
        Concepto: factura.concepto,
        CondicionVenta: factura.condicionVenta,
        CondicionIVA: factura.condicionIVA,
        Articulos: articulosConPorcentaje,
        IVAsAgrupados: ivas,
        DatosEmisor: datosEmisor,
      }

      // Cargar logos como base64 para la vista previa
      let logoForPreview = ''
      let arcaLogoForPreview = ''
      
      try {
        const logoModule = await import('../../assets/logo.png')
        const logoPath = logoModule.default
        const response = await fetch(logoPath)
        const blob = await response.blob()
        logoForPreview = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (error) {
        console.error('Error cargando logo para vista previa:', error)
      }

      try {
        const arcaLogoModule = await import('../../assets/ARCA.png')
        const arcaLogoPath = arcaLogoModule.default
        const response = await fetch(arcaLogoPath)
        const blob = await response.blob()
        arcaLogoForPreview = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (error) {
        console.error('Error cargando logo ARCA para vista previa:', error)
      }

      // Generar QR
      const qrData = {
        ver: 1,
        fecha: factura.fechaProceso,
        cuit: Number.parseInt(datosEmisor.cuit),
        ptoVta: factura.ptoVta,
        tipoCmp: factura.cbteTipo,
        nroCmp: factura.cbteDesde,
        importe: factura.impTotal,
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: factura.docTipo,
        nroDocRec: factura.docNro,
        tipoCodAut: 'E',
        codAut: factura.cae,
      }

      const qrResponse = await generarQR(qrData)

      if (qrResponse.success && qrResponse.qrUrl) {
        // Usar servicio externo para generar imagen QR
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrResponse.qrUrl)}`
        const html = generarHTMLFactura(pdfData, qrImageUrl, Number.parseInt(datosEmisor.cuit), logoForPreview, arcaLogoForPreview)
        setFacturaHtml(html)
      }
    } catch (error) {
      console.error('Error al generar vista previa de la factura:', error)
    }
  }

  const getTipoDocumentoNombre = (tipoDoc: number): string => {
    const tipo = TIPOS_DOCUMENTO.find(t => t.id === String(tipoDoc))
    return tipo?.nombre || 'Desconocido'
  }

  const getAlicuotaIVANombre = (alicuotaId: string): string => {
    const alicuota = ALICUOTAS_IVA.find(a => a.id === alicuotaId)
    return alicuota?.nombre || '-'
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Comprobantes Emitidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros básicos siempre visibles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaDesde">Fecha Desde</Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaHasta">Fecha Hasta</Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>

          {/* Botón para mostrar/ocultar filtros avanzados */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="w-full"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {mostrarFiltros ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4" />
            )}
          </Button>

          {/* Filtros avanzados colapsables */}
          {mostrarFiltros && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Juan Pérez o Empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nroDoc">Número de Documento</Label>
                <Input
                  id="nroDoc"
                  value={nroDoc}
                  onChange={(e) => setNroDoc(e.target.value)}
                  placeholder="20123456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipoDoc">Tipo de Documento</Label>
                <Select value={tipoDoc} onValueChange={setTipoDoc}>
                  <SelectTrigger id="tipoDoc">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Botones de búsqueda */}
          <div className="flex gap-2">
            <Button
              onClick={handleBuscar}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </>
              )}
            </Button>
            <Button
              onClick={handleLimpiarFiltros}
              variant="outline"
              disabled={loading}
            >
              Limpiar
            </Button>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs de tipo de comprobante */}
      <Tabs value={tabActivo} onValueChange={setTabActivo} className="w-full">
        <TabsList className="w-full grid grid-cols-6">
          <TabsTrigger value="todos" className="flex items-center gap-2">
            Todos
            <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-md font-medium">
              {contadores.todos}
            </span>
          </TabsTrigger>
          <TabsTrigger value="factura-a" className="flex items-center gap-2">
            Factura A
            <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-md font-medium">
              {contadores.facturaA}
            </span>
          </TabsTrigger>
          <TabsTrigger value="factura-b" className="flex items-center gap-2">
            Factura B
            <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-md font-medium">
              {contadores.facturaB}
            </span>
          </TabsTrigger>
          <TabsTrigger value="nc" className="flex items-center gap-2">
            N. Credito
            <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-md font-medium">
              {contadores.nc}
            </span>
          </TabsTrigger>
          <TabsTrigger value="consumidor-final" className="flex items-center gap-2">
            C. Final
            <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-md font-medium">
              {contadores.consumidorFinal}
            </span>
          </TabsTrigger>
          <TabsTrigger value="ticket" className="flex items-center gap-2">
            Ticket
            <span className="bg-gray-200 text-gray-700 text-xs px-1.5 py-0.5 rounded-md font-medium">
              {contadores.tickets}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tabla de resultados */}
      {facturas.length > 0 && (
        <Card>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-gray-100"
                      onClick={() => handleSort('tipoFactura')}
                    >
                      <div className="flex items-center">
                        Factura
                        <SortIcon field="tipoFactura" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-gray-100"
                      onClick={() => handleSort('fechaProceso')}
                    >
                      <div className="flex items-center">
                        Fecha
                        <SortIcon field="fechaProceso" />
                      </div>
                    </TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead
                      className="text-right cursor-pointer select-none hover:bg-gray-100"
                      onClick={() => handleSort('impTotal')}
                    >
                      <div className="flex items-center justify-end">
                        Total
                        <SortIcon field="impTotal" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedFacturas().map((factura) => (
                      <TableRow
                        key={factura.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRowClick(factura)}
                      >
                      <TableCell>
                        {getTipoComprobanteLabel(factura)}
                      </TableCell>
                      <TableCell>{formatearFecha(factura.fechaProceso)}</TableCell>
                      <TableCell>
                        {String(factura.ptoVta).padStart(5, '0')}-{String(factura.cbteDesde).padStart(8, '0')}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {factura.razonSocial || '-'}
                      </TableCell>
                      <TableCell>{factura.docNro || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatearMoneda(factura.impTotal)}
                      </TableCell>
                      <TableCell className="font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegenerarPDF(factura)}
                            disabled={regenerandoPDF === factura.id}
                            title="Regenerar PDF"
                          >
                            {regenerandoPDF === factura.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleImprimir(factura.pdfPath!)}
                            disabled={!factura.pdfPath}
                            title={factura.pdfPath ? "Imprimir" : "PDF no generado"}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAbrirCarpeta(factura.pdfPath!)}
                            disabled={!factura.pdfPath}
                            title={factura.pdfPath ? "Abrir carpeta" : "PDF no generado"}
                          >
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje cuando no hay resultados */}
      {!loading && facturas.length === 0 && !error && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No hay facturas guardadas</p>
              <p className="text-sm mt-1">Las facturas que genere aparecerán aquí</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sheet con detalles de la factura */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {facturaSeleccionada && (
            <>
                <SheetHeader>
                  <SheetTitle>
                    {facturaSeleccionada.esTicket === 1
                      ? `Ticket ${String(facturaSeleccionada.ptoVta).padStart(5, '0')}-${String(facturaSeleccionada.cbteDesde).padStart(8, '0')}`
                      : `${getTipoComprobanteDetalle(facturaSeleccionada)} ${String(facturaSeleccionada.ptoVta).padStart(5, '0')}-${String(facturaSeleccionada.cbteDesde).padStart(8, '0')}`
                    }
                  </SheetTitle>
                <SheetDescription>
                  Detalles de la factura emitida
                </SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-4 space-y-6">
                {/* Información General */}
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">Fecha de Emisión</Label>
                      <p className="text-sm font-medium">{formatearFecha(facturaSeleccionada.fechaProceso)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Tipo de Comprobante</Label>
                      <p className="text-sm font-medium">
                        {getTipoComprobanteDetalle(facturaSeleccionada)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">CAE</Label>
                      <p className="text-sm font-medium font-mono">{facturaSeleccionada.cae}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Vencimiento CAE</Label>
                      <p className="text-sm font-medium">{formatearFecha(facturaSeleccionada.caeVencimiento)}</p>
                    </div>
                  </div>
                </div>

                {facturaSeleccionada.esTicket !== 1 && facturaSeleccionada.cbteTipo !== 3 && facturaSeleccionada.cbteTipo !== 8 && (
                  <div>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        setNotaCreditoDialogOpen(true)
                      }}
                      disabled={generandoNotaCredito === facturaSeleccionada.id}
                      variant="secondary"
                      className="w-full"
                    >
                      {generandoNotaCredito === facturaSeleccionada.id
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <FileText className="mr-2 h-4 w-4" />
                      }
                      Generar Nota de Crédito {facturaSeleccionada.tipoFactura}
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Información del Cliente */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Cliente</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {facturaSeleccionada.razonSocial && (
                      <div>
                        <Label className="text-xs text-gray-500">Razón Social</Label>
                        <p className="text-sm font-medium">{facturaSeleccionada.razonSocial}</p>
                      </div>
                    )}
                    {facturaSeleccionada.domicilio && (
                      <div>
                        <Label className="text-xs text-gray-500">Domicilio</Label>
                        <p className="text-sm font-medium">{facturaSeleccionada.domicilio}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Tipo de Documento</Label>
                        <p className="text-sm font-medium">{getTipoDocumentoNombre(facturaSeleccionada.docTipo)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Número de Documento</Label>
                        <p className="text-sm font-medium">{facturaSeleccionada.docNro || '-'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Condición IVA</Label>
                        <p className="text-sm font-medium">{facturaSeleccionada.condicionIVA}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Condición de Venta</Label>
                        <p className="text-sm font-medium">{facturaSeleccionada.condicionVenta}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Artículos */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Artículos</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Precio Unit.</TableHead>
                          {facturaSeleccionada.tipoFactura === 'A' && (
                            <TableHead className="text-right">IVA</TableHead>
                          )}
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {JSON.parse(facturaSeleccionada.articulos).map((articulo: any, index: number) => {
                          const cantidad = Number(articulo.cantidad) || 0
                          const precioUnitario = Number(articulo.precioUnitario) || 0
                          const subtotal = articulo.subtotal ? Number(articulo.subtotal) : (cantidad * precioUnitario)

                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{articulo.descripcion}</TableCell>
                              <TableCell className="text-center">{cantidad}</TableCell>
                              <TableCell className="text-center">{formatearMoneda(precioUnitario)}</TableCell>
                              {facturaSeleccionada.tipoFactura === 'A' && (
                                <TableCell className="text-right">{getAlicuotaIVANombre(articulo.alicuotaIVA)}</TableCell>
                              )}
                              <TableCell className="text-right">{formatearMoneda(subtotal)}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <Separator />

                {/* Totales */}
                <div>
                  <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Subtotal (Neto)</span>
                      <span className="text-sm font-medium">{formatearMoneda(facturaSeleccionada.impNeto)}</span>
                    </div>

                    {/* Mostrar IVAs desglosados por alícuota */}
                    {facturaSeleccionada.ivas && JSON.parse(facturaSeleccionada.ivas).length > 0 ? (
                      JSON.parse(facturaSeleccionada.ivas).map((iva: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-sm text-gray-600">IVA {iva.porcentaje}%</span>
                          <span className="text-sm font-medium">{formatearMoneda(Number(iva.importeIVA || 0))}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">IVA</span>
                        <span className="text-sm font-medium">{formatearMoneda(facturaSeleccionada.impIVA)}</span>
                      </div>
                    )}

                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-base font-semibold">Total</span>
                      <span className="text-base font-bold">{formatearMoneda(facturaSeleccionada.impTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Histórico de Notas de Crédito */}
                {facturaSeleccionada.esTicket !== 1 && facturaSeleccionada.cbteTipo !== 3 && facturaSeleccionada.cbteTipo !== 8 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Notas de Crédito Asociadas</h3>
                      {historicoNotaCreditoLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                      ) : historicoNotaCredito.length === 0 ? (
                        <p className="text-sm text-gray-500">No se emitieron notas de crédito para esta factura</p>
                      ) : (
                        <div className="space-y-2">
                          {historicoNotaCredito.map((nc) => (
                            <div key={nc.id} className="border rounded-lg p-3 flex justify-between items-center">
                              <div>
                                <p className="text-sm font-medium">
                                  NC {nc.tipoFactura} {String(nc.ptoVta).padStart(5, '0')}-{String(nc.cbteDesde).padStart(8, '0')}
                                </p>
                                <p className="text-xs text-gray-500">{formatearFecha(nc.fechaProceso)}</p>
                              </div>
                              <span className="text-sm font-semibold">{formatearMoneda(nc.impTotal)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                {/* Vista previa (para tickets y facturas) */}
                <div>
                  <Button
                    onClick={() => setMostrarVistaPrevia(!mostrarVistaPrevia)}
                    variant="outline"
                    className="w-full"
                  >
                    {mostrarVistaPrevia ? (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        Ocultar Vista Previa
                      </>
                    ) : (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        Mostrar Vista Previa
                      </>
                    )}
                  </Button>
                </div>

                {/* Vista previa del ticket */}
                {mostrarVistaPrevia && facturaSeleccionada.esTicket === 1 && ticketHtml && (
                  <div className="bg-gray-100 p-2 flex justify-center overflow-hidden">
                    <div className="border bg-white shadow-lg" style={{ width: '80mm' }}>
                      <iframe
                        srcDoc={ticketHtml}
                        style={{
                          width: '80mm',
                          height: '550px',
                          border: 'none',
                          display: 'block',
                        }}
                        title="Vista previa del ticket"
                        scrolling="no"
                      />
                    </div>
                  </div>
                )}

                {/* Vista previa de la factura */}
                {mostrarVistaPrevia && facturaSeleccionada.esTicket !== 1 && facturaHtml && (
                  <div className="bg-gray-100 p-2 flex justify-center overflow-hidden">
                    <div 
                      className="origin-top"
                      style={{ 
                        transform: 'scale(0.72)',
                        width: '210mm',
                        height: '297mm',
                        marginBottom: '-300px',
                      }}
                    >
                      <div className="border bg-white shadow-lg">
                        <iframe
                          srcDoc={facturaHtml}
                          style={{
                            width: '210mm',
                            height: '297mm',
                            border: 'none',
                            display: 'block',
                          }}
                          title="Vista previa de la factura"
                          scrolling="no"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Acciones - Mismo flujo para tickets y facturas */}
                <div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRegenerarPDF(facturaSeleccionada)
                      }}
                      disabled={regenerandoPDF === facturaSeleccionada.id}
                      variant="outline"
                      className="w-full"
                    >
                      {regenerandoPDF === facturaSeleccionada.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Regenerando PDF...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Regenerar PDF
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleImprimir(facturaSeleccionada.pdfPath!)
                      }}
                      disabled={!facturaSeleccionada.pdfPath}
                      variant="outline"
                      className="w-full"
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Imprimir
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAbrirCarpeta(facturaSeleccionada.pdfPath!)
                      }}
                      disabled={!facturaSeleccionada.pdfPath}
                      variant="default"
                      className="w-full"
                    >
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Abrir Carpeta
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={notaCreditoDialogOpen} onOpenChange={setNotaCreditoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Nota de Crédito</DialogTitle>
          </DialogHeader>
          <Separator />

          {facturaSeleccionada && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                <p className="text-sm">
                  Factura <b>{facturaSeleccionada.tipoFactura}</b> — <b>{String(facturaSeleccionada.ptoVta).padStart(5, '0')}-{String(facturaSeleccionada.cbteDesde).padStart(8, '0')}</b>
                </p>
                <p className="text-sm text-gray-600">{facturaSeleccionada.razonSocial}</p>
                <p className="text-sm font-semibold">Total original: {formatearMoneda(facturaSeleccionada.impTotal)}</p>
              </div>

              {/* Histórico de NCs en el dialog */}
              {historicoNotaCredito.length > 0 && (
                <div>
                  <Label className="text-xs text-amber-600 font-semibold">
                    Se emitieron {historicoNotaCredito.length} nota(s) de crédito previa(s):
                  </Label>
                  <div className="mt-1 space-y-1">
                    {historicoNotaCredito.map((nc) => (
                      <div key={nc.id} className="flex justify-between text-sm bg-amber-50 rounded px-2 py-1">
                        <span className="font-mono text-xs">
                          NC {nc.tipoFactura} {String(nc.ptoVta).padStart(5, '0')}-{String(nc.cbteDesde).padStart(8, '0')}
                        </span>
                        <span className="font-medium text-xs">{formatearMoneda(nc.impTotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Monto a acreditar</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="montoTipo"
                      checked={notaCreditoMontoTipo === 'total'}
                      onChange={() => setNotaCreditoMontoTipo('total')}
                    />
                    <span className="text-sm">Total ({formatearMoneda(facturaSeleccionada.impTotal)})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="montoTipo"
                      checked={notaCreditoMontoTipo === 'parcial'}
                      onChange={() => setNotaCreditoMontoTipo('parcial')}
                    />
                    <span className="text-sm">Parcial</span>
                  </label>
                </div>
                {notaCreditoMontoTipo === 'parcial' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={facturaSeleccionada.impTotal}
                      placeholder="0.00"
                      value={notaCreditoMonto}
                      onChange={(e) => setNotaCreditoMonto(e.target.value)}
                    />
                    <span className="text-xs text-gray-400">Máx: {formatearMoneda(facturaSeleccionada.impTotal)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNotaCreditoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmNotaCredito}>
              Generar Nota de Crédito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
