import type { ChangeEvent, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FileText, Save, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@render/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@render/components/ui/card'
import { Input } from '@render/components/ui/input'
import { Label } from '@render/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@render/components/ui/select'
import { Separator } from '@render/components/ui/separator'
import { ALICUOTAS_IVA, TIPOS_DOCUMENTO, UNIDADES_MEDIDA } from '@render/constants/afip'
import { formatearMoneda } from '@render/utils/calculos'
import { useArca } from '../hooks/useArca'
import { PDFActions } from './components/PDFActions'
import { PDFPreview } from './components/PDFPreview'
import { generarHTMLRemito, type RemitoPDFData } from './components/remitoTemplate'
import type { DatosEmisor } from './components/ConfiguracionEmisor'
import logo from '../assets/logo.png'
import arcaLogo from '../assets/ARCA.png'

type ItemRemito = {
  codigo?: string
  descripcion: string
  cantidad: number
  unidadMedida: string
  precioUnitario: number
  alicuotaIVA: string
}

type CaiRemito = {
  id: number
  cai: string
  puntoVenta: number
  numeroDesde: number
  numeroHasta: number
  proximoNumero: number
  fechaVencimiento: string
  activo: number
}

type RemitoResultado = {
  success: boolean
  error?: string
  data?: {
    id: number
    numero: number
    cliente: string
    docTipo: number
    docNro: number
    razonSocial: string
    domicilio: string
    cai: string
    caiVencimiento: string
    estado: 'emitido' | 'anulado'
    proximoNumero: number
  }
  formData?: {
    docTipo: number
    docNro: number
    razonSocial: string
    domicilio: string
    items: ItemRemito[]
  }
}

type IvaAgrupado = {
  alicuota: string
  porcentaje: number
  baseImponible: number
  importeIVA: number
}

export default function CrearRemito() {
  const arca = useArca()
  const { guardarCaiRemito, actualizarCaiRemito, listarCaiRemitos, getAlertasCaiRemitos, emitirRemito, generarPDFRemito, obtenerCUITDesdeDNI, consultarContribuyente } = arca
  const [cais, setCais] = useState<CaiRemito[]>([])
  const [alertas, setAlertas] = useState<Array<{ tipo: string; cai: string; mensaje: string }>>([])
  const [resultado, setResultado] = useState<RemitoResultado | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [modoCai, setModoCai] = useState<'view' | 'edit'>('edit')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null)
  const [caiForm, setCaiForm] = useState({ cai: '', puntoVenta: 1, numeroDesde: 1, numeroHasta: 1, fechaVencimiento: '', activo: true })
  const [datosEmisor, setDatosEmisor] = useState<DatosEmisor>({
    cuit: '',
    razonSocial: '',
    domicilio: '',
    condicionIVA: '1',
    iibb: '',
    inicioActividades: '',
    puntoVenta: 1,
  })
  const [remitoForm, setRemitoForm] = useState({
    docTipo: '80',
    docNro: '',
    razonSocial: '',
    domicilio: '',
    items: [{ codigo: '', descripcion: '', cantidad: 1, unidadMedida: 'unidad', precioUnitario: 0, alicuotaIVA: '5' } as ItemRemito],
  })
  const [loadingContribuyente, setLoadingContribuyente] = useState(false)
  const [pdfSavePath, setPdfSavePath] = useState<string>('')
  const [logoBase64, setLogoBase64] = useState<string>('')
  const [arcaLogoBase64, setArcaLogoBase64] = useState<string>('')

  const caiVigente = useMemo(() => {
    return cais.find(c => c.activo === 1 && new Date(c.fechaVencimiento).getTime() >= Date.now() && c.proximoNumero <= c.numeroHasta)
  }, [cais])

  const caiGuardado = useMemo(() => {
    return [...cais].sort((a, b) => b.id - a.id)[0] ?? null
  }, [cais])

  const cargar = async () => {
    const [caisRes, alertasRes] = await Promise.all([listarCaiRemitos(), getAlertasCaiRemitos()])
    if (caisRes.success && caisRes.data) {
      setCais(caisRes.data)
      const latest = [...caisRes.data].sort((a, b) => b.id - a.id)[0]
      if (latest) {
        setCaiForm({
          cai: latest.cai,
          puntoVenta: latest.puntoVenta,
          numeroDesde: latest.numeroDesde,
          numeroHasta: latest.numeroHasta,
          fechaVencimiento: latest.fechaVencimiento,
          activo: latest.activo === 1,
        })
        setModoCai('view')
      }
    }
    if (alertasRes.success && alertasRes.data) setAlertas(alertasRes.data)
  }

  useEffect(() => { void cargar() }, [])

  useEffect(() => {
    const cargarPath = async () => {
      try {
        // @ts-ignore
        if (window.electron?.store?.get) {
          // @ts-ignore
          const savedPath = await window.electron.store.get('pdfSavePath')
          if (savedPath) setPdfSavePath(savedPath)
        }
      }
      catch (error) {
        console.error('Error al cargar carpeta de PDFs:', error)
      }
    }

    void cargarPath()
  }, [])

  useEffect(() => {
    const cargarImagen = async (src: string, setter: (value: string) => void) => {
      try {
        const response = await fetch(src)
        const blob = await response.blob()
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
        setter(base64)
      }
      catch {
        setter('')
      }
    }

    void cargarImagen(logo, setLogoBase64)
    void cargarImagen(arcaLogo, setArcaLogoBase64)
  }, [])

  useEffect(() => {
    const guardado = localStorage.getItem('datosEmisor')
    if (!guardado)
      return

    try {
      setDatosEmisor(JSON.parse(guardado))
    }
    catch {
      // ignore
    }
  }, [])

  const emitirBloqueado = !caiVigente

  const handleInputChange = (field: keyof typeof remitoForm, value: string) => {
    setRemitoForm(prev => ({ ...prev, [field]: value }))
  }

  const handleArticuloChange = (index: number, field: keyof ItemRemito, value: string | number | null) => {
    setRemitoForm(prev => ({
      ...prev,
      items: prev.items.map((it, i) => {
        if (i !== index)
          return it

        return {
          ...it,
          [field]: value === null ? '' : value,
        } as ItemRemito
      }),
    }))
  }

  const agruparIVA = (items: ItemRemito[]): IvaAgrupado[] => {
    const grupos = new Map<string, IvaAgrupado>()

    for (const item of items) {
      const porcentaje = ALICUOTAS_IVA.find(a => a.id === item.alicuotaIVA)?.porcentaje || 0
      const baseImponible = item.cantidad * (item.precioUnitario || 0)
      const importeIVA = baseImponible * (porcentaje / 100)

      const actual = grupos.get(item.alicuotaIVA) || {
        alicuota: item.alicuotaIVA,
        porcentaje,
        baseImponible: 0,
        importeIVA: 0,
      }

      actual.baseImponible += baseImponible
      actual.importeIVA += importeIVA
      grupos.set(item.alicuotaIVA, actual)
    }

    return [...grupos.values()]
  }

  const handleConsultarContribuyente = async (): Promise<void> => {
    if (!remitoForm.docNro) {
      toast.error('Ingrese un CUIT o DNI para buscar', { id: 'buscar-contribuyente-remito' })
      return
    }

    setLoadingContribuyente(true)
    try {
      let cuitABuscar = remitoForm.docNro

      if (remitoForm.docTipo === '96') {
        const responseCUIT = await obtenerCUITDesdeDNI(remitoForm.docNro)
        if (!responseCUIT.success || !responseCUIT.data?.cuit) {
          toast.error('DNI no encontrado', { description: responseCUIT.error || 'No se encontró CUIT asociado al DNI' })
          setLoadingContribuyente(false)
          return
        }

        cuitABuscar = responseCUIT.data.cuit.toString()
      }

      const response = await consultarContribuyente(cuitABuscar)
      if (response.success && response.data) {
        handleInputChange('razonSocial', response.data.razonSocial)
        handleInputChange('domicilio', response.data.domicilio)
        toast.success('Datos obtenidos correctamente', { description: 'La información se cargó desde AFIP' })
      }
      else {
        toast.error('CUIT no encontrado', { description: response.error || 'No se encontraron datos en AFIP' })
      }
    }
    finally {
      setLoadingContribuyente(false)
    }
  }

  const guardarCaiActual = async () => {
    const payload = {
      ...caiForm,
      fechaVencimiento: caiForm.fechaVencimiento,
    }

    const result = caiGuardado && modoCai === 'edit' && typeof actualizarCaiRemito === 'function'
      ? await actualizarCaiRemito(caiGuardado.id, payload)
      : await guardarCaiRemito(payload)

    if (result.success) {
      toast.success('CAI guardado')
      setModoCai('view')
      await cargar()
    } else {
      toast.error(result.error || 'Error al guardar CAI')
    }
  }

  const handleEmitir = async (e: FormEvent) => {
    e.preventDefault()
    if (emitirBloqueado) return
    setLoading(true)
    setPdfUrl(null)
    setHtmlPreview(null)
    const puntoVenta = caiVigente?.puntoVenta ?? caiForm.puntoVenta
    const articulosPDF = remitoForm.items.map((articulo, index) => {
      const subtotal = articulo.cantidad * (articulo.precioUnitario || 0)
      const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)

      return {
        codigo: articulo.codigo || String(index + 1).padStart(3, '0'),
        descripcion: articulo.descripcion,
        cantidad: articulo.cantidad,
        unidadMedida: articulo.unidadMedida,
        precioUnitario: articulo.precioUnitario || 0,
        alicuotaIVA: articulo.alicuotaIVA,
        porcentajeIVA: alicuota?.porcentaje || 0,
        subtotal,
      }
    })
    const ivasAgrupados = agruparIVA(remitoForm.items)
    const totales = remitoForm.items.reduce((acc, item) => {
      const porcentaje = ALICUOTAS_IVA.find(a => a.id === item.alicuotaIVA)?.porcentaje || 0
      const base = item.cantidad * (item.precioUnitario || 0)
      return {
        neto: acc.neto + base,
        iva: acc.iva + (base * (porcentaje / 100)),
        total: acc.total + (base * (1 + porcentaje / 100)),
      }
    }, { neto: 0, iva: 0, total: 0 })

    const response = await emitirRemito({
      puntoVenta,
      cliente: remitoForm.razonSocial,
      docTipo: Number.parseInt(remitoForm.docTipo),
      docNro: remitoForm.docTipo === '99' ? 0 : Number.parseInt(remitoForm.docNro),
      razonSocial: remitoForm.razonSocial,
      domicilio: remitoForm.domicilio,
      items: remitoForm.items,
    })
    if (response.success && response.data) {
      const formDataSnapshot: {
        docTipo: number
        docNro: number
        razonSocial: string
        domicilio: string
        items: ItemRemito[]
      } = {
        docTipo: Number.parseInt(remitoForm.docTipo),
        docNro: remitoForm.docTipo === '99' ? 0 : Number.parseInt(remitoForm.docNro),
        razonSocial: remitoForm.razonSocial,
        domicilio: remitoForm.domicilio,
        items: remitoForm.items.map(item => ({ ...item })),
      }

      setResultado({
        ...response,
        formData: formDataSnapshot,
      })
      toast.success('Remito emitido')

      const pdfData: RemitoPDFData = {
        puntoVenta,
        numero: response.data.numero,
        fecha: new Date().toISOString().slice(0, 10),
        cliente: response.data.razonSocial || response.data.cliente,
        razonSocial: response.data.razonSocial || response.data.cliente,
        domicilio: response.data.domicilio || '',
        DocTipo: Number.parseInt(remitoForm.docTipo),
        DocNro: remitoForm.docTipo === '99' ? 0 : Number.parseInt(remitoForm.docNro),
        Concepto: 'Remito',
        CondicionVenta: 'Contado',
        Articulos: articulosPDF,
        ImpNeto: totales.neto,
        ImpIVA: totales.iva,
        ImpTotal: totales.total,
        IVAsAgrupados: ivasAgrupados,
        CAI: response.data.cai,
        CAIFchVto: response.data.caiVencimiento,
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

      setHtmlPreview(generarHTMLRemito(pdfData, '', Number.parseInt(datosEmisor.cuit || '0'), logoBase64 || undefined, arcaLogoBase64 || undefined))
    } else {
      setResultado(response)
      toast.error(response.error || 'No se pudo emitir el remito')
    }
    setLoading(false)
    await cargar()
  }

  const alertaBloqueante = alertas.length > 0 && !caiVigente
  const caiInputsDisabled = Boolean(caiGuardado) && modoCai !== 'edit'

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
          // @ts-ignore
          if (window.electron?.store?.set) {
            // @ts-ignore
            await window.electron.store.set('pdfSavePath', selectedPath)
          }
          toast.success('Carpeta seleccionada correctamente', { id: 'seleccionar-carpeta-remito' })
        }
      }
    }
    catch (error) {
      console.error('Error al seleccionar carpeta:', error)
      toast.error('Error al seleccionar carpeta', { id: 'seleccionar-carpeta-remito' })
    }
  }

  const handleGenerarPDF = async (): Promise<void> => {
    if (!resultado?.success || !resultado.data)
      return

    const formData = resultado.formData || {
      docTipo: Number.parseInt(remitoForm.docTipo),
      docNro: remitoForm.docTipo === '99' ? 0 : Number.parseInt(remitoForm.docNro),
      razonSocial: remitoForm.razonSocial,
      domicilio: remitoForm.domicilio,
      items: remitoForm.items,
    } as {
      docTipo: number
      docNro: number
      razonSocial: string
      domicilio: string
      items: ItemRemito[]
    }

    const ivasAgrupados = agruparIVA(formData.items)
    const totales = formData.items.reduce((acc, item) => {
      const base = item.cantidad * (item.precioUnitario || 0)
      const porcentaje = ALICUOTAS_IVA.find(a => a.id === item.alicuotaIVA)?.porcentaje || 0
      return {
        neto: acc.neto + base,
        iva: acc.iva + (base * (porcentaje / 100)),
        total: acc.total + (base * (1 + porcentaje / 100)),
      }
    }, { neto: 0, iva: 0, total: 0 })

    setLoadingPDF(true)
    const pdfResponse = await generarPDFRemito({
      puntoVenta: caiVigente?.puntoVenta || caiForm.puntoVenta,
      numero: resultado.data.numero,
      fecha: new Date().toISOString().slice(0, 10),
      cliente: resultado.data.cliente,
      razonSocial: resultado.data.razonSocial,
      domicilio: resultado.data.domicilio,
      items: formData.items.map(item => ({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidadMedida: item.unidadMedida,
      })),
      Articulos: formData.items.map((articulo, index) => ({
        codigo: articulo.codigo || String(index + 1).padStart(3, '0'),
        descripcion: articulo.descripcion,
        cantidad: articulo.cantidad,
        unidadMedida: articulo.unidadMedida,
        precioUnitario: articulo.precioUnitario || 0,
        alicuotaIVA: articulo.alicuotaIVA,
        porcentajeIVA: ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA)?.porcentaje || 0,
        subtotal: articulo.cantidad * (articulo.precioUnitario || 0),
      })),
      DocTipo: formData.docTipo,
      DocNro: formData.docNro,
      Concepto: 'Remito',
      CondicionVenta: 'Contado',
      ImpNeto: totales.neto,
      ImpIVA: totales.iva,
      ImpTotal: totales.total,
      IVAsAgrupados: ivasAgrupados,
      CAI: resultado.data.cai,
      CAIFchVto: resultado.data.caiVencimiento,
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
      customPath: pdfSavePath || undefined,
    })

    if (pdfResponse.success && pdfResponse.filePath) {
      setPdfUrl(pdfResponse.filePath)
      toast.success('PDF generado exitosamente')
    }
    else {
      toast.error(pdfResponse.error || 'Error al generar PDF')
    }
    setLoadingPDF(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>CAI de Remitos</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-3"><Label>CAI</Label><Input disabled={caiInputsDisabled} value={caiForm.cai} onChange={e => setCaiForm(prev => ({ ...prev, cai: e.target.value }))} required /></div>
            <div className="space-y-1.5"><Label>Punto de venta</Label><Input disabled={caiInputsDisabled} type="number" min="1" value={caiForm.puntoVenta} onChange={e => setCaiForm(prev => ({ ...prev, puntoVenta: Number(e.target.value) || 1 }))} required /></div>
            <div className="space-y-1.5"><Label>Número desde</Label><Input disabled={caiInputsDisabled} type="number" min="1" value={caiForm.numeroDesde} onChange={e => setCaiForm(prev => ({ ...prev, numeroDesde: Number(e.target.value) || 1 }))} required /></div>
            <div className="space-y-1.5"><Label>Número hasta</Label><Input disabled={caiInputsDisabled} type="number" min="1" value={caiForm.numeroHasta} onChange={e => setCaiForm(prev => ({ ...prev, numeroHasta: Number(e.target.value) || 1 }))} required /></div>
            <div className="space-y-1.5 md:col-span-2"><Label>Vencimiento</Label><Input disabled={caiInputsDisabled} type="date" value={caiForm.fechaVencimiento} onChange={e => setCaiForm(prev => ({ ...prev, fechaVencimiento: e.target.value }))} required /></div>
            <div className="flex items-end">
              <Button
                className="w-full"
                type="button"
                onClick={() => {
                  if (modoCai === 'view') {
                    setModoCai('edit')
                    return
                  }

                  void guardarCaiActual()
                }}
              >
                {modoCai === 'edit' ? <Save className="h-4 w-4" /> : null}
                {modoCai === 'edit' ? 'Guardar CAI' : 'Editar CAI'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {alertaBloqueante && (
        <Card className="border-red-300 bg-red-50"><CardContent className="pt-6"><div className="flex items-start gap-2 text-red-700"><AlertTriangle className="h-5 w-5 mt-0.5" /><div><p className="font-semibold">No se puede emitir remito</p>{alertas.map(a => <p key={`${a.tipo}-${a.cai}`}>{a.mensaje}</p>)}</div></div></CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle>Emitir Remito R</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleEmitir} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="DocTipo" className="text-xs">Tipo Doc.</Label>
                <Select value={remitoForm.docTipo} onValueChange={value => handleInputChange('docTipo', value)}>
                  <SelectTrigger id="DocTipo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map(tipo => <SelectItem key={tipo.id} value={tipo.id}>{tipo.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="DocNro" className="text-xs">{remitoForm.docTipo === '96' ? 'DNI' : 'CUIT'}</Label>
                <div className="flex gap-2">
                  <Input
                    id="DocNro"
                    type="text"
                    value={remitoForm.docNro}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('docNro', e.target.value)}
                    placeholder={remitoForm.docTipo === '96' ? '12345678' : '20123456789'}
                    className="flex-1"
                    required
                  />
                  {(remitoForm.docTipo === '80' || remitoForm.docTipo === '96') && (
                    <Button type="button" onClick={handleConsultarContribuyente} disabled={!remitoForm.docNro || loadingContribuyente} variant="outline" size="icon" title={remitoForm.docTipo === '96' ? 'Buscar datos en AFIP por DNI' : 'Buscar datos en AFIP'}>
                      {loadingContribuyente ? '...' : <Search className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="RazonSocial" className="text-xs">Razón Social / Nombre</Label>
                <Input id="RazonSocial" type="text" value={remitoForm.razonSocial} onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('razonSocial', e.target.value)} placeholder="Nombre del cliente" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="Domicilio" className="text-xs">Domicilio</Label>
                <Input id="Domicilio" type="text" value={remitoForm.domicilio} onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange('domicilio', e.target.value)} placeholder="Dirección del cliente" />
              </div>

            </div>
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Artículos</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => setRemitoForm(prev => ({ ...prev, items: [...prev.items, { codigo: '', descripcion: '', cantidad: 1, unidadMedida: 'unidad', precioUnitario: 0, alicuotaIVA: '5' } as ItemRemito] }))}>
                  + Agregar
                </Button>
              </div>

              {remitoForm.items.map((item, index) => (
                <div key={index} className="border p-3 rounded-lg space-y-2 bg-gray-50">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`descripcion-${index}`} className="text-xs">Descripción</Label>
                      <Input
                        id={`descripcion-${index}`}
                        type="text"
                        value={item.descripcion}
                        className="bg-white"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleArticuloChange(index, 'descripcion', e.target.value)}
                        placeholder="Descripción del artículo"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={() => setRemitoForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }))}
                        variant="outline"
                        size="icon"
                        className="text-red-500 hover:text-red-700"
                        disabled={remitoForm.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      <div className="space-y-1 w-32">
                        <Label htmlFor={`codigo-${index}`} className="text-xs">Código (opcional)</Label>
                        <Input
                          id={`codigo-${index}`}
                          type="text"
                          value={item.codigo || ''}
                          className="bg-white"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleArticuloChange(index, 'codigo', e.target.value)}
                          placeholder="001"
                        />
                      </div>

                      <div className="space-y-1 w-20">
                        <Label htmlFor={`cantidad-${index}`} className="text-xs">Cantidad</Label>
                        <Input
                          id={`cantidad-${index}`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="bg-white"
                          value={item.cantidad}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleArticuloChange(index, 'cantidad', e.target.value === '' ? null : Number.parseFloat(e.target.value))}
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`unidad-${index}`} className="text-xs">Unidad</Label>
                        <Select value={item.unidadMedida} onValueChange={value => handleArticuloChange(index, 'unidadMedida', value)}>
                          <SelectTrigger id={`unidad-${index}`} className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIDADES_MEDIDA.map(unidad => (
                              <SelectItem key={unidad.id} value={unidad.id}>
                                {unidad.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 w-28">
                        <Label htmlFor={`precio-${index}`} className="text-xs">Precio Unitario</Label>
                        <Input
                          id={`precio-${index}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="$"
                          className="bg-white"
                          value={item.precioUnitario ?? ''}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handleArticuloChange(index, 'precioUnitario', e.target.value === '' ? null : Number.parseFloat(e.target.value))}
                          required
                        />
                      </div>

                      <div className="space-y-1 w-24">
                        <Label htmlFor={`iva-porcentaje-${index}`} className="text-xs">IVA %</Label>
                        <Select value={item.alicuotaIVA} onValueChange={value => handleArticuloChange(index, 'alicuotaIVA', value)}>
                          <SelectTrigger id={`iva-porcentaje-${index}`} className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALICUOTAS_IVA.map(alicuota => (
                              <SelectItem key={alicuota.id} value={alicuota.id}>
                                {alicuota.porcentaje}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="min-w-36 space-y-1">
                      <Label className="text-xs">Subtotal</Label>
                      <div className="bg-white border rounded-md px-2 text-sm font-medium h-9 flex items-center">
                        {formatearMoneda(item.cantidad * (item.precioUnitario || 0))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {remitoForm.items.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed rounded-lg">
                  No hay artículos
                </div>
              )}
            </div>

            <div className="gap-3 border-t pt-3 bg-gray-50 p-3 rounded-lg grid grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Neto (sin IVA)</Label>
                <div className="bg-white border rounded-md px-3 h-10 flex items-center font-medium">
                  {formatearMoneda(remitoForm.items.reduce((acc, item) => acc + (item.cantidad * (item.precioUnitario || 0)), 0))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">IVA</Label>
                <div className="bg-white border rounded-md px-3 h-10 flex items-center font-medium">
                  {formatearMoneda(remitoForm.items.reduce((acc, item) => {
                    const base = item.cantidad * (item.precioUnitario || 0)
                    const porcentaje = ALICUOTAS_IVA.find(a => a.id === item.alicuotaIVA)?.porcentaje || 0
                    return acc + (base * (porcentaje / 100))
                  }, 0))}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Total</Label>
                <div className="bg-white border rounded-md px-3 h-10 flex items-center font-bold text-base">
                  {formatearMoneda(remitoForm.items.reduce((acc, item) => {
                    const base = item.cantidad * (item.precioUnitario || 0)
                    const porcentaje = ALICUOTAS_IVA.find(a => a.id === item.alicuotaIVA)?.porcentaje || 0
                    return acc + (base * (1 + porcentaje / 100))
                  }, 0))}
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading || emitirBloqueado} className="w-full"><FileText className="h-4 w-4" />{loading ? 'Emitiendo...' : 'Crear Remito'}</Button>
          </form>
        </CardContent>
      </Card>

      {resultado && (
        <Card className={resultado.success ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}>
          <CardHeader>
            <CardTitle className={resultado.success ? 'text-green-800' : 'text-red-800'}>
              {resultado.success ? 'Remito creado exitosamente' : 'Error al crear remito'}
            </CardTitle>
          </CardHeader>
          <CardContent>
          {resultado.success
            ? (
              <div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-green-800 mb-4">
                  <div><span className="font-medium">Tipo:</span> R</div>
                  <div><span className="font-medium">Código:</span> 91</div>
                  <div><span className="font-medium">Razon Social / Nombre:</span> {resultado.data?.razonSocial || resultado.data?.cliente}</div>
                  <div><span className="font-medium">Domicilio:</span> {resultado.data?.domicilio || '-'}</div>
                  <div><span className="font-medium">Comprobante Nro:</span> {String(resultado.data?.numero).padStart(8, '0')}</div>
                  <div><span className="font-medium">CAI:</span> {resultado.data?.cai}</div>
                </div>

                {htmlPreview && <PDFPreview htmlContent={htmlPreview} qrUrl={null} />}

                <PDFActions
                  pdfUrl={pdfUrl}
                  onGenerar={handleGenerarPDF}
                  pdfSavePath={pdfSavePath}
                  onSelectFolder={handleSelectFolder}
                  loadingPDF={loadingPDF}
                />
              </div>
            )
            : (
              <div>
                <p className="text-red-800">{resultado.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Estado</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>CAI vigente:</strong> {caiVigente?.cai || 'No disponible'}</p>
          <p><strong>Proximo número:</strong> {caiVigente ? String(caiVigente.proximoNumero).padStart(8, '0') : '-'}</p>
          <p><strong>Disponibles:</strong> {caiVigente ? caiVigente.numeroHasta - caiVigente.proximoNumero + 1 : 0}</p>
          <Separator />
          {pdfUrl ? <p className="text-green-700">PDF generado: {pdfUrl}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}
