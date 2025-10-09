// ============================================================================
// Ejemplo de integración con Facturador desde C#
// ============================================================================

using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace EjemploIntegracionFacturador
{
    /// <summary>
    /// Clase para integrar el Facturador Electrónico desde otra aplicación
    /// </summary>
    public class FacturadorHelper
    {
        private string _facturadorPath;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="facturadorPath">Ruta completa al ejecutable del facturador</param>
        public FacturadorHelper(string facturadorPath)
        {
            _facturadorPath = facturadorPath;
        }

        /// <summary>
        /// Valida si un CUIT tiene el formato correcto
        /// </summary>
        /// <param name="cuit">CUIT a validar (con o sin guiones)</param>
        /// <returns>True si es válido, False si no</returns>
        public static bool ValidarCUIT(string cuit)
        {
            if (string.IsNullOrWhiteSpace(cuit))
                return false;

            // Quitar guiones
            string cuitLimpio = cuit.Replace("-", "");

            // Debe tener 11 dígitos
            if (cuitLimpio.Length != 11)
                return false;

            // Debe ser numérico
            return long.TryParse(cuitLimpio, out _);
        }

        /// <summary>
        /// Limpia un CUIT quitando guiones y espacios
        /// </summary>
        /// <param name="cuit">CUIT a limpiar</param>
        /// <returns>CUIT sin guiones ni espacios</returns>
        public static string LimpiarCUIT(string cuit)
        {
            if (string.IsNullOrWhiteSpace(cuit))
                return string.Empty;

            return cuit.Replace("-", "").Replace(" ", "").Trim();
        }

        /// <summary>
        /// Abre el facturador con un CUIT específico
        /// </summary>
        /// <param name="cuit">CUIT del cliente (con o sin guiones)</param>
        /// <returns>True si se abrió correctamente, False si hubo error</returns>
        public bool AbrirConCUIT(string cuit)
        {
            try
            {
                // Validar CUIT
                if (!ValidarCUIT(cuit))
                {
                    MessageBox.Show(
                        "El CUIT proporcionado no es válido. Debe tener 11 dígitos.",
                        "CUIT Inválido",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return false;
                }

                // Verificar que el ejecutable existe
                if (!File.Exists(_facturadorPath))
                {
                    MessageBox.Show(
                        $"No se encontró el ejecutable del facturador:\n{_facturadorPath}",
                        "Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return false;
                }

                // Limpiar CUIT (sin guiones)
                string cuitLimpio = LimpiarCUIT(cuit);

                // Configurar el proceso
                ProcessStartInfo startInfo = new ProcessStartInfo
                {
                    FileName = _facturadorPath,
                    Arguments = cuitLimpio,
                    UseShellExecute = true,
                    WindowStyle = ProcessWindowStyle.Normal
                };

                // Iniciar el proceso
                Process proceso = Process.Start(startInfo);

                return proceso != null;
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Error al abrir el facturador:\n{ex.Message}",
                    "Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return false;
            }
        }

        /// <summary>
        /// Abre el facturador sin CUIT precargado
        /// </summary>
        /// <returns>True si se abrió correctamente, False si hubo error</returns>
        public bool Abrir()
        {
            try
            {
                // Verificar que el ejecutable existe
                if (!File.Exists(_facturadorPath))
                {
                    MessageBox.Show(
                        $"No se encontró el ejecutable del facturador:\n{_facturadorPath}",
                        "Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return false;
                }

                // Iniciar sin argumentos
                Process proceso = Process.Start(_facturadorPath);

                return proceso != null;
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Error al abrir el facturador:\n{ex.Message}",
                    "Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return false;
            }
        }
    }

    // ========================================================================
    // EJEMPLOS DE USO
    // ========================================================================

    public class EjemplosUso
    {
        /// <summary>
        /// Ejemplo 1: Uso básico desde un botón
        /// </summary>
        private void btnFacturar_Click(object sender, EventArgs e)
        {
            // Obtener CUIT del cliente (desde tu base de datos, grid, etc.)
            string cuitCliente = "20111111112"; // Ejemplo

            // Configurar la ruta del facturador
            string pathFacturador = @"C:\Program Files\Facturador\facturador.exe";

            // Crear instancia del helper
            FacturadorHelper facturador = new FacturadorHelper(pathFacturador);

            // Abrir con el CUIT
            bool exito = facturador.AbrirConCUIT(cuitCliente);

            if (exito)
            {
                MessageBox.Show(
                    "Facturador abierto correctamente",
                    "Éxito",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
        }

        /// <summary>
        /// Ejemplo 2: Desde un DataGridView con lista de clientes
        /// </summary>
        private void dgvClientes_CellClick(object sender, DataGridViewCellEventArgs e)
        {
            // Verificar que se hizo click en la columna de "Facturar"
            if (e.ColumnIndex == colFacturar.Index && e.RowIndex >= 0)
            {
                // Obtener el CUIT de la fila seleccionada
                string cuit = dgvClientes.Rows[e.RowIndex].Cells["CUIT"].Value?.ToString();

                if (!string.IsNullOrEmpty(cuit))
                {
                    string pathFacturador = @"C:\Program Files\Facturador\facturador.exe";
                    FacturadorHelper facturador = new FacturadorHelper(pathFacturador);
                    facturador.AbrirConCUIT(cuit);
                }
            }
        }

        /// <summary>
        /// Ejemplo 3: Con validación previa
        /// </summary>
        private void FacturarCliente(string cuit)
        {
            // Validar CUIT primero
            if (!FacturadorHelper.ValidarCUIT(cuit))
            {
                MessageBox.Show(
                    "El CUIT del cliente no es válido",
                    "Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                return;
            }

            // Preguntar al usuario
            DialogResult resultado = MessageBox.Show(
                $"¿Desea abrir el facturador para el cliente con CUIT {cuit}?",
                "Confirmar",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (resultado == DialogResult.Yes)
            {
                string pathFacturador = ObtenerPathFacturador();
                FacturadorHelper facturador = new FacturadorHelper(pathFacturador);
                facturador.AbrirConCUIT(cuit);
            }
        }

        /// <summary>
        /// Ejemplo 4: Guardar ruta en configuración
        /// </summary>
        private string ObtenerPathFacturador()
        {
            // Opción 1: Desde configuración de la app
            // return Properties.Settings.Default.RutaFacturador;

            // Opción 2: Ruta fija
            return @"C:\Program Files\Facturador\facturador.exe";

            // Opción 3: Buscar en carpeta de la aplicación actual
            // string appPath = Application.StartupPath;
            // return Path.Combine(appPath, "Facturador", "facturador.exe");
        }

        /// <summary>
        /// Ejemplo 5: Manejo de errores completo
        /// </summary>
        private void AbrirFacturadorSeguro(string cuit)
        {
            try
            {
                // Limpiar CUIT
                cuit = FacturadorHelper.LimpiarCUIT(cuit);

                // Validar
                if (!FacturadorHelper.ValidarCUIT(cuit))
                {
                    throw new ArgumentException("CUIT inválido");
                }

                // Obtener ruta
                string path = ObtenerPathFacturador();

                // Verificar que existe
                if (!File.Exists(path))
                {
                    throw new FileNotFoundException("No se encontró el facturador", path);
                }

                // Abrir
                FacturadorHelper facturador = new FacturadorHelper(path);
                bool exito = facturador.AbrirConCUIT(cuit);

                if (!exito)
                {
                    throw new Exception("No se pudo abrir el facturador");
                }

                // Log o registro de auditoría
                RegistrarAccion($"Facturador abierto para CUIT {cuit}");
            }
            catch (Exception ex)
            {
                // Log del error
                RegistrarError($"Error al abrir facturador: {ex.Message}");

                // Mostrar al usuario
                MessageBox.Show(
                    $"No se pudo abrir el facturador:\n{ex.Message}",
                    "Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private void RegistrarAccion(string mensaje)
        {
            // Implementar según tu sistema de logging
            // Logger.Info(mensaje);
            Console.WriteLine($"[INFO] {mensaje}");
        }

        private void RegistrarError(string mensaje)
        {
            // Implementar según tu sistema de logging
            // Logger.Error(mensaje);
            Console.WriteLine($"[ERROR] {mensaje}");
        }
    }
}
