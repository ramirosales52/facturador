import { useState, FormEvent, useEffect } from 'react';
import { useArca } from '../hooks/useArca';
import { toast } from 'sonner';
import {
  FacturaForm,
  FacturaResultado,
  FormData,
  FacturaResultadoData,
  Articulo,
} from './components';
import { generarHTMLFactura, FacturaPDFData } from './components/facturaTemplate';
import { ConfiguracionEmisor, DatosEmisor } from './components/ConfiguracionEmisor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@render/components/ui/tabs';
import { calcularTotalesFactura, agruparIVAParaAFIP, agruparIVAPorAlicuota, getNombreCondicionIVA, calcularSubtotal } from '../utils/calculos';
import { DEFAULTS, TIPOS_COMPROBANTE, ALICUOTAS_IVA } from '../constants/afip';

const CrearFactura = () => {
  const { loading, error, clearError, crearFactura, generarQR, generarPDF, consultarContribuyente } = useArca();

  const [formData, setFormData] = useState<FormData>({
    TipoFactura: DEFAULTS.TIPO_FACTURA,
    DocTipo: DEFAULTS.TIPO_DOCUMENTO,
    DocNro: '',
    Concepto: DEFAULTS.CONCEPTO,
    CondicionIVA: DEFAULTS.CONDICION_IVA,
    RazonSocial: '',
    Domicilio: '',
    Articulos: [],
    ImpNeto: '0.00',
    ImpIVA: '0.00',
    ImpTotal: '0.00',
  });

  const [datosEmisor, setDatosEmisor] = useState<DatosEmisor>({
    cuit: DEFAULTS.CUIT_EMISOR,
    razonSocial: '',
    domicilio: '',
    condicionIVA: DEFAULTS.CONDICION_IVA_EMISOR,
    iibb: '',
    inicioActividades: '',
    puntoVenta: DEFAULTS.PUNTO_VENTA,
  });

  const [resultado, setResultado] = useState<FacturaResultadoData | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);
  const [loadingContribuyente, setLoadingContribuyente] = useState(false);
  const [loadingEmisor, setLoadingEmisor] = useState(false);

  const recalcularTotales = (articulos: Articulo[]): void => {
    const totales = calcularTotalesFactura(articulos);
    
    setFormData((prev) => ({
      ...prev,
      ImpNeto: totales.neto.toFixed(2),
      ImpIVA: totales.iva.toFixed(2),
      ImpTotal: totales.total.toFixed(2),
    }));
  };

  const handleInputChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArticuloAdd = (): void => {
    const nuevoArticulo: Articulo = {
      codigo: '',
      descripcion: '',
      cantidad: DEFAULTS.CANTIDAD_DEFAULT,
      unidadMedida: DEFAULTS.UNIDAD_MEDIDA_DEFAULT,
      precioUnitario: undefined,
      alicuotaIVA: DEFAULTS.ALICUOTA_IVA_DEFAULT,
    };
    const nuevosArticulos = [...formData.Articulos, nuevoArticulo];
    setFormData((prev) => ({ ...prev, Articulos: nuevosArticulos }));
    recalcularTotales(nuevosArticulos);
  };

  const handleArticuloRemove = (index: number): void => {
    const nuevosArticulos = formData.Articulos.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, Articulos: nuevosArticulos }));
    recalcularTotales(nuevosArticulos);
  };

  const handleArticuloChange = (index: number, field: keyof Articulo, value: string | number): void => {
    const nuevosArticulos = [...formData.Articulos];
    nuevosArticulos[index] = { ...nuevosArticulos[index], [field]: value };
    setFormData((prev) => ({ ...prev, Articulos: nuevosArticulos }));
    recalcularTotales(nuevosArticulos);
  };

  const limpiarFormulario = (): void => {
    setFormData({
      TipoFactura: DEFAULTS.TIPO_FACTURA,
      DocTipo: DEFAULTS.TIPO_DOCUMENTO,
      DocNro: '',
      Concepto: DEFAULTS.CONCEPTO,
      CondicionIVA: DEFAULTS.CONDICION_IVA,
      Articulos: [],
      ImpNeto: '0.00',
      ImpIVA: '0.00',
      ImpTotal: '0.00',
    });
    setResultado(null);
    setQrUrl(null);
    setPdfUrl(null);
    setHtmlPreview(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    clearError();
    setResultado(null);
    setQrUrl(null);
    setPdfUrl(null);
    setHtmlPreview(null);

    // Validar que haya datos del emisor
    if (!datosEmisor.razonSocial || !datosEmisor.domicilio) {
      toast.error('Configure los datos del emisor primero', {
        description: 'Vaya a la pestaña "Configuración" y complete los datos'
      })
      return
    }

    // Usar utilidad para agrupar IVA
    const ivaArray = agruparIVAParaAFIP(formData.Articulos);

    const cbteTipo = formData.TipoFactura === 'A' ? TIPOS_COMPROBANTE.FACTURA_A : TIPOS_COMPROBANTE.FACTURA_B;
    const docTipo = parseInt(formData.DocTipo);
    const docNro = formData.DocTipo === '99' ? 0 : parseInt(formData.DocNro);
    const concepto = parseInt(formData.Concepto);

    const facturaData = {
      PtoVta: datosEmisor.puntoVenta,
      CbteTipo: cbteTipo,
      Concepto: concepto,
      DocTipo: docTipo,
      DocNro: docNro,
      ImpTotal: parseFloat(formData.ImpTotal),
      ImpNeto: parseFloat(formData.ImpNeto),
      ImpIVA: parseFloat(formData.ImpIVA),
      Iva: ivaArray,
    };

    const response = await crearFactura(facturaData);
    setResultado(response);

    // Si la factura se creó exitosamente, generar QR automáticamente
    if (response.success && response.data) {
      const qrData = {
        ver: 1,
        fecha: response.data.FchProceso,
        cuit: parseInt(datosEmisor.cuit),
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
      };

      const qrResponse = await generarQR(qrData);
      if (qrResponse.success && qrResponse.qrUrl) {
        setQrUrl(qrResponse.qrUrl);
        
        // Generar vista previa HTML
        const articulosPDF = formData.Articulos.map(articulo => {
          const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA);
          const subtotalSinIVA = calcularSubtotal(articulo);
          const ivaArticulo = subtotalSinIVA * ((alicuota?.porcentaje || 0) / 100);
          
          // Para Factura B, el subtotal mostrado debe incluir el IVA
          const subtotalMostrar = formData.TipoFactura === 'B' 
            ? subtotalSinIVA + ivaArticulo 
            : subtotalSinIVA;
          
          return {
            codigo: articulo.codigo || '',
            descripcion: articulo.descripcion,
            cantidad: articulo.cantidad,
            unidadMedida: articulo.unidadMedida,
            precioUnitario: articulo.precioUnitario,
            alicuotaIVA: articulo.alicuotaIVA,
            porcentajeIVA: alicuota?.porcentaje || 0,
            subtotal: subtotalMostrar,
          };
        });

        const ivasAgrupados = agruparIVAPorAlicuota(formData.Articulos).map(iva => ({
          alicuota: iva.id,
          porcentaje: iva.porcentaje,
          baseImponible: iva.baseImponible,
          importeIVA: iva.importeIVA,
        }));

        const condicionIVANombre = getNombreCondicionIVA(formData.CondicionIVA, formData.TipoFactura);

        const pdfData: FacturaPDFData = {
          ...response.data,
          ImpNeto: parseFloat(formData.ImpNeto),
          ImpIVA: parseFloat(formData.ImpIVA),
          TipoFactura: formData.TipoFactura,
          CondicionIVA: condicionIVANombre,
          RazonSocial: formData.RazonSocial,
          Domicilio: formData.Domicilio,
          Articulos: articulosPDF,
          IVAsAgrupados: ivasAgrupados,
          DatosEmisor: {
            cuit: datosEmisor.cuit,
            razonSocial: datosEmisor.razonSocial,
            domicilio: datosEmisor.domicilio,
            condicionIVA: datosEmisor.condicionIVA === '1' ? 'Responsable Inscripto' : 
                          datosEmisor.condicionIVA === '6' ? 'Responsable Monotributo' : 'Exento',
            iibb: datosEmisor.iibb || 'Exento',
            inicioActividades: datosEmisor.inicioActividades,
          },
        };

        const htmlContent = generarHTMLFactura(pdfData, qrResponse.qrUrl, parseInt(datosEmisor.cuit));
        setHtmlPreview(htmlContent);
      }
    }
  };

  const handleConsultarContribuyente = async (): Promise<void> => {
    if (!formData.DocNro) {
      toast.error('Ingrese un CUIT para buscar')
      return
    }

    clearError()
    
    // Dismissar TODOS los toasts anteriores para evitar solapamiento
    toast.dismiss()
    
    // Pequeño delay para que la animación de cierre termine
    await new Promise(resolve => setTimeout(resolve, 150))
    
    setLoadingContribuyente(true)
    
    // Crear un toast de loading con ID único para esta búsqueda
    const toastId = toast.loading('Consultando datos en AFIP...')

    try {
      const response = await consultarContribuyente(formData.DocNro)

      if (response.success && response.data) {
        if (response.data.razonSocial) {
          handleInputChange('RazonSocial', response.data.razonSocial)
        }
        if (response.data.domicilio) {
          handleInputChange('Domicilio', response.data.domicilio)
        }

        // Actualizar el toast de loading a success
        toast.success(
          `Encontrado: ${response.data.razonSocial}`,
          { 
            id: toastId,
            description: `${response.data.localidad}, ${response.data.provincia}`,
            duration: 4000,
          }
        )
      } else {
        // Actualizar el toast de loading a error
        toast.error(
          'CUIT no encontrado',
          { 
            id: toastId,
            description: response.error || 'No se encontraron datos en AFIP'
          }
        )
      }
    } catch (err) {
      toast.error(
        'Error al consultar contribuyente',
        { id: toastId }
      )
    } finally {
      setLoadingContribuyente(false)
      clearError()
    }
  };

  const handleBuscarEmisor = async (cuit: string) => {
    setLoadingEmisor(true)
    try {
      const response = await consultarContribuyente(cuit)
      setLoadingEmisor(false)
      return response
    } catch (err) {
      setLoadingEmisor(false)
      return { success: false, error: 'Error al consultar' }
    }
  };

  const handleGuardarEmisor = (datos: DatosEmisor) => {
    setDatosEmisor(datos)
    // Guardar en localStorage para persistencia
    localStorage.setItem('datosEmisor', JSON.stringify(datos))
  };

  // Cargar datos del emisor al iniciar
  useEffect(() => {
    const datosGuardados = localStorage.getItem('datosEmisor')
    if (datosGuardados) {
      try {
        setDatosEmisor(JSON.parse(datosGuardados))
      } catch (e) {
        console.error('Error al cargar datos del emisor')
      }
    }
  }, []);

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
      } catch (error) {
        console.error('Error al obtener CUIT desde línea de comandos:', error)
      }
    }

    cargarCuitDesdeComandoLinea()
  }, []);

  const handleDescargarPDF = async (): Promise<void> => {
    if (!resultado?.data) return;

    toast.loading('Generando PDF...', { id: 'pdf-generation' });

    // Preparar artículos para el PDF usando utilidades
    const articulosPDF = formData.Articulos.map(articulo => {
      const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA);
      const subtotalSinIVA = calcularSubtotal(articulo);
      const ivaArticulo = subtotalSinIVA * ((alicuota?.porcentaje || 0) / 100);
      
      // Para Factura B, el subtotal mostrado debe incluir el IVA
      const subtotalMostrar = formData.TipoFactura === 'B' 
        ? subtotalSinIVA + ivaArticulo 
        : subtotalSinIVA;
      
      return {
        codigo: articulo.codigo || '',
        descripcion: articulo.descripcion,
        cantidad: articulo.cantidad,
        unidadMedida: articulo.unidadMedida,
        precioUnitario: articulo.precioUnitario,
        alicuotaIVA: articulo.alicuotaIVA,
        porcentajeIVA: alicuota?.porcentaje || 0,
        subtotal: subtotalMostrar,
      };
    });

    // Usar utilidad para agrupar IVAs
    const ivasAgrupados = agruparIVAPorAlicuota(formData.Articulos).map(iva => ({
      alicuota: iva.id,
      porcentaje: iva.porcentaje,
      baseImponible: iva.baseImponible,
      importeIVA: iva.importeIVA,
    }));

    // Obtener nombre de condición IVA usando utilidad
    const condicionIVANombre = getNombreCondicionIVA(formData.CondicionIVA, formData.TipoFactura);

    // Crear datos extendidos para el PDF
    const pdfData = {
      ...resultado.data,
      TipoFactura: formData.TipoFactura,
      CondicionIVA: condicionIVANombre,
      RazonSocial: formData.RazonSocial,
      Domicilio: formData.Domicilio,
      Articulos: articulosPDF,
      IVAsAgrupados: ivasAgrupados,
      DatosEmisor: {
        cuit: datosEmisor.cuit,
        razonSocial: datosEmisor.razonSocial,
        domicilio: datosEmisor.domicilio,
        condicionIVA: datosEmisor.condicionIVA === '1' ? 'Responsable Inscripto' : 
                      datosEmisor.condicionIVA === '6' ? 'Responsable Monotributo' : 'Exento',
        iibb: datosEmisor.iibb || 'Exento',
        inicioActividades: datosEmisor.inicioActividades,
      },
    };

    const pdfResponse = await generarPDF(pdfData);

    if (pdfResponse.success && pdfResponse.filePath) {
      setPdfUrl(pdfResponse.filePath);
      toast.success(
        'PDF generado exitosamente',
        {
          id: 'pdf-generation',
          description: pdfResponse.message || 'El archivo está guardado en tu escritorio',
          duration: 3000,
        }
      );
    } else {
      toast.error(
        `Error al generar PDF: ${pdfResponse.error}`,
        { id: 'pdf-generation' }
      );
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">Facturación Electrónica</h1>
        <p className="text-sm text-gray-600">Crear facturas A y B con artículos detallados</p>
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
          />

          {resultado && (
            <div className="mt-4">
              <FacturaResultado
                resultado={resultado}
                qrUrl={qrUrl}
                pdfUrl={pdfUrl}
                onGenerarPDF={handleDescargarPDF}
                htmlPreview={htmlPreview || undefined}
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
  );
};

export default CrearFactura;
