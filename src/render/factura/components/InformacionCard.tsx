import { Card, CardContent, CardHeader, CardTitle } from '@render/components/ui/card'

export function InformacionCard() {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Información</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p>
          <span className="font-medium">Factura B:</span>
          {' '}
          Para monotributistas, exentos y consumidores finales con CUIT/CUIL
        </p>
        <p>
          <span className="font-medium">IVA:</span>
          {' '}
          Se discrimina en la factura (21% por defecto)
        </p>
        <p>
          <span className="font-medium">CAE:</span>
          {' '}
          Código de Autorización Electrónico que valida la factura
        </p>
      </CardContent>
    </Card>
  )
}
