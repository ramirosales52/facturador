import { useState } from 'react';
import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:3000/arca';

interface IVA {
  Id: number;
  BaseImp: number;
  Importe: number;
}

interface CreateFacturaDto {
  CbteTipo: number;
  DocTipo: number;
  DocNro: number;
  ImpTotal: number;
  ImpNeto: number;
  ImpIVA: number;
  Iva: IVA[];
}

interface FacturaResponse {
  success: boolean;
  data?: {
    CAE: string;
    CAEFchVto: string;
    CbteDesde: number;
    CbteHasta: number;
    PtoVta: number;
    CbteTipo: number;
    DocTipo: number;
    DocNro: number;
    ImpTotal: number;
    FchProceso: string;
  };
  error?: string;
}

interface QRResponse {
  success: boolean;
  qrUrl?: string;
  qrData?: any;
  error?: string;
}

interface PDFResponse {
  success: boolean;
  filePath?: string;
  fileName?: string;
  qrUrl?: string;
  message?: string;
  error?: string;
}

interface ContribuyenteResponse {
  success: boolean;
  data?: {
    razonSocial: string;
    domicilio: string;
    localidad: string;
    provincia: string;
    condicionIVA: number;
    tipoPersona: string;
  };
  error?: string;
}

interface ServerStatusResponse {
  success: boolean;
  serverStatus?: {
    AppServer: string;
    DbServer: string;
    AuthServer: string;
  };
  error?: string;
}

export const useArca = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequest = async <T,>(requestFn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      return await requestFn();
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      const errorMsg = axiosError.response?.data?.error || axiosError.message || 'Error en la solicitud';
      setError(errorMsg);
      return { success: false, error: errorMsg } as T;
    } finally {
      setLoading(false);
    }
  };

  const crearFactura = async (data: CreateFacturaDto): Promise<FacturaResponse> => {
    return handleRequest(async () => {
      const response = await axios.post<FacturaResponse>(`${API_BASE_URL}/factura`, data);
      return response.data;
    });
  };

  const verificarConexion = async (): Promise<ServerStatusResponse> => {
    return handleRequest(async () => {
      const response = await axios.get<ServerStatusResponse>(`${API_BASE_URL}/server-status`);
      return response.data;
    });
  };

  const generarQR = async (qrData: any): Promise<QRResponse> => {
    return handleRequest(async () => {
      const response = await axios.post<QRResponse>(`${API_BASE_URL}/generar-qr`, qrData);
      return response.data;
    });
  };

  const generarPDF = async (facturaInfo: any): Promise<PDFResponse> => {
    return handleRequest(async () => {
      const response = await axios.post<PDFResponse>(`${API_BASE_URL}/generar-pdf`, facturaInfo);
      return response.data;
    });
  };

  const consultarContribuyente = async (cuit: string): Promise<ContribuyenteResponse> => {
    // No usamos handleRequest para no afectar el estado de error global
    // Los errores se manejan con toasts en el componente
    try {
      const response = await axios.get<ContribuyenteResponse>(`${API_BASE_URL}/contribuyente/${cuit}`);
      return response.data;
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      const errorMsg = axiosError.response?.data?.error || axiosError.message || 'Error en la solicitud';
      return { success: false, error: errorMsg };
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    loading,
    error,
    clearError,
    crearFactura,
    verificarConexion,
    generarQR,
    generarPDF,
    consultarContribuyente,
  };
};
