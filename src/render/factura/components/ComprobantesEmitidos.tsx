import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@render/components/ui/card'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@render/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@render/components/ui/table'
import { ArrowUpDown, ChevronDown, ChevronUp, FileText, Filter, FolderOpen, Loader2, Printer, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useArca } from '../../hooks/useArca'

const TIPOS_COMPROBANTE = [
  { id: '1', nombre: 'Factura A' },
  { id: '6', nombre: 'Factura B' },
]

const TIPOS_DOCUMENTO = [
  { id: '80', nombre: 'CUIT' },
  { id: '96', nombre: 'DNI' },
  { id: '99', nombre: 'Consumidor Final' },
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
  createdAt: string
}

export function ComprobantesEmitidos() {
  const { obtenerFacturas, generarPDF, actualizarPdfPath } = useArca()

  const [loading, setLoading] = useState(false)
  const [facturas, setFacturas] = useState<FacturaLocal[]>([])
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [regenerandoPDF, setRegenerandoPDF] = useState<number | null>(null)

  // Estado de ordenamiento
  type SortField = 'tipoFactura' | 'fechaProceso' | 'impTotal' | null
  type SortDirection = 'asc' | 'desc'
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [tipoComprobante, setTipoComprobante] = useState('')
  const [tipoDoc, setTipoDoc] = useState('')
  const [nroDoc, setNroDoc] = useState('')

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
    if (tipoComprobante) {
      filtros.cbteTipo = parseInt(tipoComprobante)
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
    setTipoComprobante('')
    setTipoDoc('')
    setNroDoc('')
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
    if (!sortField) return facturas

    return [...facturas].sort((a, b) => {
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="ml-2 h-4 w-4" />
      : <ChevronDown className="ml-2 h-4 w-4" />
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
        customPath: selectedPath, // Pasar la carpeta seleccionada
      }

      const response = await generarPDF(pdfData)

      if (response.success && response.filePath) {
        // Actualizar el pdfPath en la base de datos
        await actualizarPdfPath(factura.id, response.filePath)

        // Recargar facturas para actualizar la tabla
        await cargarFacturas()

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
            <div className="flex gap-4 py-4 border-t">
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

              <div className="space-y-2">
                <Label htmlFor="tipoComprobante">Tipo de Comprobante</Label>
                <Select value={tipoComprobante} onValueChange={setTipoComprobante}>
                  <SelectTrigger id="tipoComprobante">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_COMPROBANTE.map((tipo) => (
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

      {/* Tabla de resultados */}
      {facturas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados ({facturas.length})</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <TableRow key={factura.id}>
                      <TableCell>{factura.docTipo === 99 ? 'C. Final' : factura.tipoFactura}</TableCell>
                      <TableCell>{formatearFecha(factura.fechaProceso)}</TableCell>
                      <TableCell>
                        {String(factura.ptoVta).padStart(5, '0')}-{String(factura.cbteDesde).padStart(8, '0')}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {factura.razonSocial || '-'}
                      </TableCell>
                      <TableCell>{factura.docNro || '-'}</TableCell>
                      <TableCell className="text-center font-semibold">
                        ${factura.impTotal.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
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
    </div>
  )
}
