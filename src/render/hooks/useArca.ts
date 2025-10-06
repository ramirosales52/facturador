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
  fileUrl?: string;
  fileName?: string;
  qrUrl?: string;
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

  const crearFactura = async (data: CreateFacturaDto): Promise<FacturaResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<FacturaResponse>(`${API_BASE_URL}/factura`, data);
      return response.data;
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      const errorMsg = axiosError.response?.data?.error || axiosError.message || 'Error al crear factura';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const verificarConexion = async (): Promise<ServerStatusResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<ServerStatusResponse>(`${API_BASE_URL}/server-status`);
      return response.data;
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      const errorMsg = axiosError.response?.data?.error || axiosError.message || 'Error al verificar conexión';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const generarQR = async (qrData: any): Promise<QRResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<QRResponse>(`${API_BASE_URL}/generar-qr`, qrData);
      return response.data;
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      const errorMsg = axiosError.response?.data?.error || axiosError.message || 'Error al generar QR';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const generarPDF = async (facturaInfo: any): Promise<PDFResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<PDFResponse>(`${API_BASE_URL}/generar-pdf`, facturaInfo);
      return response.data;
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      const errorMsg = axiosError.response?.data?.error || axiosError.message || 'Error al generar PDF';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    crearFactura,
    verificarConexion,
    generarQR,
    generarPDF,
  };
};
