import { Button } from '@render/components/ui/button'
import { Card, CardContent } from '@render/components/ui/card'
import { CheckCircle2, XCircle } from 'lucide-react'

interface ConexionStatusProps {
  conexionStatus: {
    success: boolean
    serverStatus?: {
      AppServer: string
      DbServer: string
      AuthServer: string
    }
    error?: string
  } | null
  loading: boolean
  onVerificar: () => Promise<void>
}

export function ConexionStatus({ conexionStatus, loading, onVerificar }: ConexionStatusProps) {
  return (
    <Card className="mb-4">
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Estado de conexión con ARCA</p>
            <p className="text-xs text-gray-600">Verificar disponibilidad del servidor</p>
          </div>
          <Button onClick={onVerificar} disabled={loading} variant="outline" size="sm">
            {loading ? 'Verificando...' : 'Verificar'}
          </Button>
        </div>

        {conexionStatus && (
          <div className={`mt-3 p-2 rounded-md text-sm ${conexionStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {conexionStatus.success
              ? (
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Conexión exitosa
                  </p>
                  <p className="text-xs mt-1">
                    App: {conexionStatus.serverStatus?.AppServer} |
                    DB: {conexionStatus.serverStatus?.DbServer} |
                    Auth: {conexionStatus.serverStatus?.AuthServer}
                  </p>
                </div>
              )
              : (
                <p className="font-medium flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Error: {conexionStatus.error}
                </p>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
