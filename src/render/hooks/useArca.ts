import type { AxiosError } from 'axios'
import axios from 'axios'
import { useState } from 'react'

// Función para obtener la URL base de la API
async function getApiBaseUrl(): Promise<string> {
  // Intentar obtener el puerto del backend desde Electron
  if (window.electron && window.electron.getBackendPort) {
    try {
      const port = await window.electron.getBackendPort()
      return `http://localhost:${port}/arca`
    }
    catch (err) {
      console.warn('No se pudo obtener el puerto del backend, usando puerto predeterminado 3000', err)
    }
  }
  return 'http://localhost:3000/arca'
}

let cachedApiBaseUrl: string | null = null

// Inicializar la URL base al cargar el módulo
async function initApiBaseUrl() {
  cachedApiBaseUrl = await getApiBaseUrl()
  console.log(`API Base URL: ${cachedApiBaseUrl}`)
}

initApiBaseUrl()

interface IVA {
  Id: number
  BaseImp: number
  Importe: number
}

interface CreateFacturaDto {
  CbteTipo: number
  DocTipo: number
  DocNro: number
  ImpTotal: number
  ImpNeto: number
  ImpIVA: number
  Iva: IVA[]
}

interface FacturaResponse {
  success: boolean
  data?: {
    CAE: string
    CAEFchVto: string
    CbteDesde: number
    CbteHasta: number
    PtoVta: number
    CbteTipo: number
    DocTipo: number
    DocNro: number
    ImpTotal: number
    FchProceso: string
  }
  error?: string
}

interface QRResponse {
  success: boolean
  qrUrl?: string
  qrData?: any
  error?: string
}

interface PDFResponse {
  success: boolean
  filePath?: string
  fileName?: string
  qrUrl?: string
  message?: string
  error?: string
}

interface ContribuyenteResponse {
  success: boolean
  data?: {
    razonSocial: string
    domicilio: string
    localidad: string
    provincia: string
    condicionIVA: number
    tipoPersona: string
  }
  error?: string
}

export function useArca() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getApiUrl = async (): Promise<string> => {
    if (cachedApiBaseUrl) {
      return cachedApiBaseUrl
    }
    cachedApiBaseUrl = await getApiBaseUrl()
    return cachedApiBaseUrl
  }

  const handleRequest = async <T>(requestFn: () => Promise<T>): Promise<T> => {
    setLoading(true)
    setError(null)
    try {
      const result = await requestFn()
      return result
    }
    catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>
      const errorMsg = axiosError.response?.data?.error || axiosError.message || 'Error en la solicitud'
      setError(errorMsg)
      return { success: false, error: errorMsg } as T
    }
    finally {
      setLoading(false)
    }
  }

  const crearFactura = async (data: CreateFacturaDto): Promise<FacturaResponse> => {
    return handleRequest(async () => {
      const apiUrl = await getApiUrl()
      const response = await axios.post<FacturaResponse>(`${apiUrl}/factura`, data)
      return response.data
    })
  }

  const generarQR = async (qrData: any): Promise<QRResponse> => {
    return handleRequest(async () => {
      const apiUrl = await getApiUrl()
      const response = await axios.post<QRResponse>(`${apiUrl}/generar-qr`, qrData)
      return response.data
    })
  }

  const generarPDF = async (facturaInfo: any): Promise<PDFResponse> => {
    return handleRequest(async () => {
      const apiUrl = await getApiUrl()
      const response = await axios.post<PDFResponse>(`${apiUrl}/generar-pdf`, facturaInfo)
      return response.data
    })
  }

  const consultarContribuyente = async (cuit: string): Promise<ContribuyenteResponse> => {
    // No usamos handleRequest para no afectar el estado de error global
    // Los errores se manejan con toasts en el componente
    try {
      const apiUrl = await getApiUrl()
      const response = await axios.get<ContribuyenteResponse>(`${apiUrl}/contribuyente/${cuit}`)
      return response.data
    }
    catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>
      const errorMsg = axiosError.response?.data?.error || axiosError.message || 'Error en la solicitud'
      return { success: false, error: errorMsg }
    }
  }

  const clearError = () => {
    setError(null)
  }

  return {
    loading,
    error,
    clearError,
    crearFactura,
    generarQR,
    generarPDF,
    consultarContribuyente,
  }
}
