import { useState, FormEvent } from 'react';
import { useArca } from '../hooks/useArca';
import { toast } from 'sonner';
import {
  ConexionStatus,
  FacturaForm,
  FacturaResultado,
  InformacionCard,
  FormData,
  FacturaResultadoData,
} from './components';

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
    DocNro: '',
    ImpNeto: '',
    ImpIVA: '',
    ImpTotal: '',
  });

  const [resultado, setResultado] = useState<FacturaResultadoData | null>(null);
  const [conexionStatus, setConexionStatus] = useState<ConexionStatusData | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const calcularTotal = (neto: string, iva: string): string => {
    const netoNum = parseFloat(neto) || 0;
    const ivaNum = parseFloat(iva) || 0;
    return (netoNum + ivaNum).toFixed(2);
  };

  const handleInputChange = (field: keyof FormData, value: string): void => {
    const newData = { ...formData, [field]: value };
    
    if (field === 'ImpNeto' || field === 'ImpIVA') {
      newData.ImpTotal = calcularTotal(newData.ImpNeto, newData.ImpIVA);
    }
    
    setFormData(newData);
  };

  const calcularIVA21 = (): void => {
    const neto = parseFloat(formData.ImpNeto) || 0;
    const iva = (neto * 0.21).toFixed(2);
    handleInputChange('ImpIVA', iva);
  };

  const limpiarFormulario = (): void => {
    setFormData({
      DocNro: '',
      ImpNeto: '',
      ImpIVA: '',
      ImpTotal: '',
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

    const facturaData = {
      CbteTipo: 6, // Factura B
      DocTipo: 80, // CUIT
      DocNro: parseInt(formData.DocNro),
      ImpTotal: parseFloat(formData.ImpTotal),
      ImpNeto: parseFloat(formData.ImpNeto),
      ImpIVA: parseFloat(formData.ImpIVA),
      Iva: [
        {
          Id: 5, // IVA 21%
          BaseImp: parseFloat(formData.ImpNeto),
          Importe: parseFloat(formData.ImpIVA),
        },
      ],
    };

    const response = await crearFactura(facturaData);
    setResultado(response);

    // Si la factura se creó exitosamente, generar QR automáticamente
    if (response.success && response.data) {
      const qrData = {
        ver: 1,
        fecha: response.data.FchProceso,
        cuit: 20409378472, // Tu CUIT
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

    const pdfResponse = await generarPDF(resultado.data);
    
    if (pdfResponse.success && pdfResponse.fileUrl) {
      setPdfUrl(pdfResponse.fileUrl);
      toast.success(
        'PDF generado exitosamente', 
        { 
          id: 'pdf-generation',
          description: 'El enlace está disponible abajo',
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
    <div className="container mx-auto p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Facturación Electrónica - Factura B</h1>
        <p className="text-gray-600">Crear factura B para monotributistas y responsables inscriptos</p>
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
        onSubmit={handleSubmit}
        onCalcularIVA={calcularIVA21}
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

      <InformacionCard />
    </div>
  );
};

export default CrearFactura;
