import { Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import CrearFactura from './factura/CrearFactura'

function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Navigate to="/factura" />} />
        <Route path="/factura" element={<CrearFactura />} />
      </Routes>
    </>
  )
}

export default App
