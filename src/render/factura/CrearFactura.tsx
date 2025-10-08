import { useState, FormEvent } from 'react';
import { useArca } from '../hooks/useArca';
import { toast } from 'sonner';
import {
  ConexionStatus,
  FacturaForm,
  FacturaResultado,
  FormData,
  FacturaResultadoData,
  Articulo,
} from './components';
import { ALICUOTAS_IVA } from './components/FacturaForm';

interface ConexionStatusData {
  success: boolean;
  serverStatus?: {
    AppServer: string;
    DbServer: string;
    AuthServer: string;
  };
  error?: string;
}

const CrearFactura = () => {
  const { loading, error, crearFactura, verificarConexion, generarQR, generarPDF } = useArca();
  
  const [formData, setFormData] = useState<FormData>({
    TipoFactura: 'B',
    DocNro: '',
    CondicionIVA: '5', // Por defecto Consumidor Final
    Articulos: [],
    ImpNeto: '0.00',
    ImpIVA: '0.00',
    ImpTotal: '0.00',
  });

  const [resultado, setResultado] = useState<FacturaResultadoData | null>(null);
  const [conexionStatus, setConexionStatus] = useState<ConexionStatusData | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const recalcularTotales = (articulos: Articulo[]): void => {
    let totalNeto = 0;
    let totalIVA = 0;

    articulos.forEach((articulo) => {
      const subtotal = articulo.cantidad * articulo.precioUnitario;
      totalNeto += subtotal;

      const alicuota = ALICUOTAS_IVA.find((a) => a.id === articulo.alicuotaIVA);
      if (alicuota) {
        totalIVA += subtotal * (alicuota.porcentaje / 100);
      }
    });

    setFormData((prev) => ({
      ...prev,
      ImpNeto: totalNeto.toFixed(2),
      ImpIVA: totalIVA.toFixed(2),
      ImpTotal: (totalNeto + totalIVA).toFixed(2),
    }));
  };

  const handleInputChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArticuloAdd = (): void => {
    const nuevoArticulo: Articulo = {
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      alicuotaIVA: '5', // Por defecto IVA 21%
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
      TipoFactura: 'B',
      DocNro: '',
      CondicionIVA: '5',
      Articulos: [],
      ImpNeto: '0.00',
      ImpIVA: '0.00',
      ImpTotal: '0.00',
    });
    setResultado(null);
    setQrUrl(null);
    setPdfUrl(null);
  };

  const handleVerificarConexion = async (): Promise<void> => {
    setConexionStatus(null);
    const response = await verificarConexion();
    setConexionStatus(response);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setResultado(null);
    setQrUrl(null);
    setPdfUrl(null);

    // Agrupar artículos por alícuota de IVA
    const ivaAgrupado = new Map<string, { BaseImp: number; Importe: number }>();
    
    formData.Articulos.forEach((articulo) => {
      const subtotal = articulo.cantidad * articulo.precioUnitario;
      const alicuota = ALICUOTAS_IVA.find((a) => a.id === articulo.alicuotaIVA);
      
      if (alicuota) {
        const importeIVA = subtotal * (alicuota.porcentaje / 100);
        
        if (ivaAgrupado.has(articulo.alicuotaIVA)) {
          const actual = ivaAgrupado.get(articulo.alicuotaIVA)!;
          ivaAgrupado.set(articulo.alicuotaIVA, {
            BaseImp: actual.BaseImp + subtotal,
            Importe: actual.Importe + importeIVA,
          });
        } else {
          ivaAgrupado.set(articulo.alicuotaIVA, {
            BaseImp: subtotal,
            Importe: importeIVA,
          });
        }
      }
    });

    const ivaArray = Array.from(ivaAgrupado.entries()).map(([id, valores]) => ({
      Id: parseInt(id),
      BaseImp: parseFloat(valores.BaseImp.toFixed(2)),
      Importe: parseFloat(valores.Importe.toFixed(2)),
    }));

    const cbteTipo = formData.TipoFactura === 'A' ? 1 : 6;

    const facturaData = {
      CbteTipo: cbteTipo,
      DocTipo: 80, // CUIT
      DocNro: parseInt(formData.DocNro),
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
        cuit: 20409378472,
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
      }
    }
  };

  const handleDescargarPDF = async (): Promise<void> => {
    if (!resultado?.data) return;

    toast.loading('Generando PDF...', { id: 'pdf-generation' });

    // Preparar artículos para el PDF
    const articulosPDF = formData.Articulos.map(articulo => {
      const alicuota = ALICUOTAS_IVA.find(a => a.id === articulo.alicuotaIVA);
      return {
        descripcion: articulo.descripcion,
        cantidad: articulo.cantidad,
        precioUnitario: articulo.precioUnitario,
        alicuotaIVA: articulo.alicuotaIVA,
        porcentajeIVA: alicuota?.porcentaje || 0,
        subtotal: articulo.cantidad * articulo.precioUnitario,
      };
    });

    // Agrupar IVAs para el PDF
    const ivaAgrupado = new Map<string, { porcentaje: number; baseImponible: number; importeIVA: number }>();
    
    formData.Articulos.forEach((articulo) => {
      const subtotal = articulo.cantidad * articulo.precioUnitario;
      const alicuota = ALICUOTAS_IVA.find((a) => a.id === articulo.alicuotaIVA);
      
      if (alicuota) {
        const importeIVA = subtotal * (alicuota.porcentaje / 100);
        
        if (ivaAgrupado.has(articulo.alicuotaIVA)) {
          const actual = ivaAgrupado.get(articulo.alicuotaIVA)!;
          ivaAgrupado.set(articulo.alicuotaIVA, {
            porcentaje: alicuota.porcentaje,
            baseImponible: actual.baseImponible + subtotal,
            importeIVA: actual.importeIVA + importeIVA,
          });
        } else {
          ivaAgrupado.set(articulo.alicuotaIVA, {
            porcentaje: alicuota.porcentaje,
            baseImponible: subtotal,
            importeIVA: importeIVA,
          });
        }
      }
    });

    const ivasAgrupados = Array.from(ivaAgrupado.entries()).map(([alicuota, valores]) => ({
      alicuota,
      porcentaje: valores.porcentaje,
      baseImponible: valores.baseImponible,
      importeIVA: valores.importeIVA,
    }));

    // Obtener nombre de condición IVA
    const condicionIVANombre = formData.TipoFactura === 'B' 
      ? (formData.CondicionIVA === '4' ? 'IVA Sujeto Exento' : 'Consumidor Final')
      : 'Responsable Inscripto';

    // Crear datos extendidos para el PDF
    const pdfData = {
      ...resultado.data,
      TipoFactura: formData.TipoFactura,
      CondicionIVA: condicionIVANombre,
      Articulos: articulosPDF,
      IVAsAgrupados: ivasAgrupados,
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

      <ConexionStatus 
        conexionStatus={conexionStatus}
        loading={loading}
        onVerificar={handleVerificarConexion}
      />

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
      />

      {resultado && (
        <FacturaResultado
          resultado={resultado}
          qrUrl={qrUrl}
          pdfUrl={pdfUrl}
          onGenerarPDF={handleDescargarPDF}
        />
      )}
    </div>
  );
};

export default CrearFactura;
