import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Wallet, PieChart, TrendingUp, 
  RefreshCw, CheckCircle, Clock, ChevronLeft, ChevronRight,
  Database, Search, Bug, XCircle
} from 'lucide-react';

// Simulación de servicios (reemplazar con imports reales)
const chipaxService = {
  obtenerCuentasPorPagar: async () => {
    // Simulación de datos para demostración
    return [
      {
        id: 1,
        folio: '12345',
        razonSocial: 'PROVEEDOR EJEMPLO SPA',
        fechaEmision: '2025-01-15',
        estado: 'pagado', // Estado original de Chipax
        montoTotal: 1500000,
        fechaPagoInterna: '2025-01-20'
      },
      {
        id: 2,
        folio: '12346',
        razonSocial: 'OTRO PROVEEDOR LTDA',
        fechaEmision: '2025-01-10',
        estado: 'aceptado',
        montoTotal: 800000
      },
      {
        id: 3,
        folio: '12347',
        razonSocial: 'SERVICIO EJEMPLO SA',
        fechaEmision: '2024-12-28',
        estado: 'pagado',
        montoTotal: 2300000,
        fechaPagoInterna: '2025-01-05'
      }
    ];
  }
};

// ✅ ADAPTADOR CON ESTADOS CORREGIDOS
const adaptarCuentasPorPagarCorregido = (compras) => {
  if (!Array.isArray(compras)) return [];

  return compras.map((compra, index) => {
    const montoTotal = parseFloat(compra.montoTotal || 0);
    const estaAnulado = compra.anulado === 'S' || compra.anulado === true;
    const fechaPagoReal = compra.fechaPago || 
                         (compra.fechaPagoInterna && compra.eventoReceptor === 'D' ? compra.fechaPagoInterna : null);
    
    let estado, saldoPendiente, descripcionEstado, categoria;
    
    if (estaAnulado) {
      estado = 'Anulado';
      saldoPendiente = 0;
      descripcionEstado = 'Factura anulada';
      categoria = 'anulado';
    } else {
      const estadoChipax = (compra.estado || '').toLowerCase().trim();
      
      switch (estadoChipax) {
        case 'pagado':
        case 'paid':
          // 🎯 CORRECCIÓN: Las "pagadas" son pendientes de aprobación
          estado = 'Pendiente Aprobación';
          saldoPendiente = montoTotal;
          descripcionEstado = 'Pendiente de aprobación (aparecía como pagada)';
          categoria = 'pendiente_aprobacion';
          break;
          
        case 'aceptado':
        case 'accepted':
          estado = 'Aceptado';
          saldoPendiente = montoTotal;
          descripcionEstado = 'Factura aceptada, pendiente de pago';
          categoria = 'aceptado';
          break;
          
        case 'pendiente':
          estado = 'Pendiente Proceso';
          saldoPendiente = montoTotal;
          descripcionEstado = 'En proceso';
          categoria = 'pendiente_proceso';
          break;
          
        default:
          if (fechaPagoReal) {
            estado = 'Pagado Realmente';
            saldoPendiente = 0;
            descripcionEstado = 'Realmente pagado';
            categoria = 'pagado_realmente';
          } else {
            estado = 'Estado Desconocido';
            saldoPendiente = montoTotal;
            descripcionEstado = 'Estado no reconocido';
            categoria = 'desconocido';
          }
      }
    }
    
    return {
      id: compra.id || index,
      folio: compra.folio || 'S/N',
      razonSocial: compra.razonSocial || 'Proveedor no especificado',
      fecha: compra.fechaEmision || compra.fecha || new Date().toISOString().split('T')[0],
      monto: saldoPendiente,
      montoTotal: montoTotal,
      estado: estado,
      estadoOriginal: compra.estado,
      descripcionEstado: descripcionEstado,
      categoria: categoria,
      fechaPago: fechaPagoReal,
      estaPagado: estado === 'Pagado Realmente',
      necesitaAprobacion: estado === 'Pendiente Aprobación',
      estaAprobado: estado === 'Aceptado' || estado === 'Pagado Realmente'
    };
  });
};

// ✅ CALCULAR RESUMEN SOLO PARA 2025
const calcularResumen2025 = (cuentasPorPagar) => {
  if (!Array.isArray(cuentasPorPagar)) {
    return {
      totalFacturas: 0,
      totalMonto: 0,
      pendientesAprobacion: { count: 0, monto: 0 },
      aceptadas: { count: 0, monto: 0 },
      pagadasRealmente: { count: 0, monto: 0 },
      anuladas: { count: 0, monto: 0 }
    };
  }

  // Filtrar solo facturas de 2025
  const facturas2025 = cuentasPorPagar.filter(factura => {
    const año = new Date(factura.fecha).getFullYear();
    return año === 2025;
  });

  const pendientesAprobacion = facturas2025.filter(f => f.estado === 'Pendiente Aprobación');
  const aceptadas = facturas2025.filter(f => f.estado === 'Aceptado');
  const pagadasRealmente = facturas2025.filter(f => f.estado === 'Pagado Realmente');
  const anuladas = facturas2025.filter(f => f.estado === 'Anulado');

  const sumarMontos = (facturas) => 
    facturas.reduce((total, f) => total + (f.montoTotal || 0), 0);

  return {
    totalFacturas: facturas2025.length,
    totalMonto: sumarMontos(facturas2025),
    pendientesAprobacion: {
      count: pendientesAprobacion.length,
      monto: sumarMontos(pendientesAprobacion)
    },
    aceptadas: {
      count: aceptadas.length,
      monto: sumarMontos(aceptadas)
    },
    pagadasRealmente: {
      count: pagadasRealmente.length,
      monto: sumarMontos(pagadasRealmente)
    },
    anuladas: {
      count: anuladas.length,
      monto: sumarMontos(anuladas)
    }
  };
};

// ✅ COMPONENTE: Cuadro Resumen 2025
const CuadroResumen2025 = ({ cuentasPorPagar, loading }) => {
  const resumen = calcularResumen2025(cuentasPorPagar);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (parte, total) => {
    if (total === 0) return '0%';
    return `${((parte / total) * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="animate-spin text-blue-500" size={20} />
          <h3 className="text-lg font-semibold">Cargando Resumen 2025...</h3>
        </div>
      </div>
    );
  }

  if (resumen.totalFacturas === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="text-orange-500" size={20} />
          <h3 className="text-lg font-semibold">Resumen Facturas 2025</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">No se encontraron facturas de 2025</p>
          <p className="text-sm text-gray-400 mt-2">
            Las facturas más recientes pueden estar en páginas posteriores
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <PieChart className="text-blue-500" size={20} />
          <h3 className="text-lg font-semibold">Resumen Facturas 2025</h3>
        </div>
        <div className="text-sm text-gray-500">
          Estados Corregidos
        </div>
      </div>

      {/* Totales principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-700">Total Facturas 2025</div>
          <div className="text-2xl font-bold text-blue-900">{resumen.totalFacturas}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-700">Monto Total 2025</div>
          <div className="text-2xl font-bold text-green-900">
            {formatCurrency(resumen.totalMonto)}
          </div>
        </div>
      </div>

      {/* Estados detallados */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800 mb-3">
          Estados Corregidos (Clasificación Real)
        </h4>

        {/* Pendientes de Aprobación */}
        <div className="border-l-4 border-orange-400 bg-orange-50 p-4 rounded-r-lg">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="text-orange-600" size={16} />
                <h5 className="font-semibold text-orange-800">Pendientes de Aprobación</h5>
                <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                  CORREGIDO
                </span>
              </div>
              <p className="text-sm text-orange-700 mb-2">
                Aparecían como "pagadas" pero necesitan aprobación
              </p>
            </div>
            <div className="text-right ml-4">
              <div className="text-lg font-bold text-orange-900">
                {resumen.pendientesAprobacion.count}
              </div>
              <div className="text-sm font-semibold text-orange-800">
                {formatCurrency(resumen.pendientesAprobacion.monto)}
              </div>
              <div className="text-xs text-orange-600">
                {formatPercentage(resumen.pendientesAprobacion.monto, resumen.totalMonto)}
              </div>
            </div>
          </div>
        </div>

        {/* Aceptadas */}
        <div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="text-blue-600" size={16} />
                <h5 className="font-semibold text-blue-800">Aceptadas</h5>
              </div>
              <p className="text-sm text-blue-700">
                Facturas aprobadas, pendientes de pago
              </p>
            </div>
            <div className="text-right ml-4">
              <div className="text-lg font-bold text-blue-900">
                {resumen.aceptadas.count}
              </div>
              <div className="text-sm font-semibold text-blue-800">
                {formatCurrency(resumen.aceptadas.monto)}
              </div>
              <div className="text-xs text-blue-600">
                {formatPercentage(resumen.aceptadas.monto, resumen.totalMonto)}
              </div>
            </div>
          </div>
        </div>

        {/* Pagadas Realmente */}
        <div className="border-l-4 border-green-400 bg-green-50 p-4 rounded-r-lg">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="text-green-600" size={16} />
                <h5 className="font-semibold text-green-800">Pagadas Realmente</h5>
              </div>
              <p className="text-sm text-green-700">
                Facturas realmente pagadas (con fecha de pago)
              </p>
            </div>
            <div className="text-right ml-4">
              <div className="text-lg font-bold text-green-900">
                {resumen.pagadasRealmente.count}
              </div>
              <div className="text-sm font-semibold text-green-800">
                {formatCurrency(resumen.pagadasRealmente.monto)}
              </div>
              <div className="text-xs text-green-600">
                {formatPercentage(resumen.pagadasRealmente.monto, resumen.totalMonto)}
              </div>
            </div>
          </div>
        </div>

        {/* Anuladas (si hay) */}
        {resumen.anuladas.count > 0 && (
          <div className="border-l-4 border-gray-400 bg-gray-50 p-4 rounded-r-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="text-gray-600" size={16} />
                  <h5 className="font-semibold text-gray-800">Anuladas</h5>
                </div>
                <p className="text-sm text-gray-700">
                  Facturas anuladas o rechazadas
                </p>
              </div>
              <div className="text-right ml-4">
                <div className="text-lg font-bold text-gray-900">
                  {resumen.anuladas.count}
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {formatCurrency(resumen.anuladas.monto)}
                </div>
                <div className="text-xs text-gray-600">
                  {formatPercentage(resumen.anuladas.monto, resumen.totalMonto)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nota explicativa */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
          <div className="text-sm">
            <p className="font-semibold text-yellow-800 mb-1">
              Estados Corregidos según Análisis
            </p>
            <p className="text-yellow-700">
              Las facturas que aparecían como "Pagado Realmente" han sido reclasificadas 
              como "Pendientes de Aprobación" según el descubrimiento de que aún no han 
              sido aceptadas y se encuentran pendientes de aprobación.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ COMPONENTE PRINCIPAL DEL DASHBOARD
const DashboardFinancieroIntegrado = () => {
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  // Cargar datos
  const cargarCuentasPorPagar = async () => {
    try {
      setLoading(true);
      setErrors([]);
      console.log('💸 Cargando cuentas por pagar...');
      
      const datos = await chipaxService.obtenerCuentasPorPagar();
      const datosAdaptados = adaptarCuentasPorPagarCorregido(datos);
      
      setCuentasPorPagar(datosAdaptados);
      console.log(`✅ ${datosAdaptados.length} cuentas por pagar cargadas y adaptadas`);
      
    } catch (error) {
      console.error('❌ Error cargando cuentas por pagar:', error);
      setErrors(prev => [...prev, { 
        tipo: 'cuentas_por_pagar', 
        mensaje: error.message 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarCuentasPorPagar();
  }, []);

  return (
    <div className=\"min-h-screen bg-gray-50 p-4\">
      <div className=\"max-w-6xl mx-auto\">
        {/* Header */}
        <div className=\"flex justify-between items-center mb-6\">
          <div>
            <h1 className=\"text-2xl font-bold text-gray-900\">
              Dashboard Financiero Integrado
            </h1>
            <p className=\"text-gray-600 mt-1\">
              Resumen de facturas 2025 con estados corregidos
            </p>
          </div>
          <button
            onClick={cargarCuentasPorPagar}
            disabled={loading}
            className=\"flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50\"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>

        {/* Errores */}
        {errors.length > 0 && (
          <div className=\"bg-red-50 border border-red-200 rounded-lg p-4 mb-6\">
            <div className=\"flex items-center gap-2 mb-2\">
              <AlertCircle className=\"text-red-500\" size={20} />
              <h3 className=\"font-semibold text-red-700\">Errores de Carga</h3>
            </div>
            <ul className=\"text-sm text-red-600 space-y-1\">
              {errors.map((error, index) => (
                <li key={index}>• {error.tipo}: {error.mensaje}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Cuadro Resumen 2025 */}
        <CuadroResumen2025 
          cuentasPorPagar={cuentasPorPagar} 
          loading={loading}
        />

        {/* Información adicional */}
        <div className=\"bg-white rounded-lg shadow-md p-6\">
          <h3 className=\"text-lg font-semibold mb-4\">Información del Sistema</h3>
          <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4 text-sm\">
            <div>
              <span className=\"font-medium\">Total Facturas Cargadas:</span>
              <span className=\"ml-2\">{cuentasPorPagar.length}</span>
            </div>
            <div>
              <span className=\"font-medium\">Última Actualización:</span>
              <span className=\"ml-2\">{new Date().toLocaleString('es-CL')}</span>
            </div>
            <div>
              <span className=\"font-medium\">Estados Corregidos:</span>
              <span className=\"ml-2 text-green-600\">✓ Activo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFinancieroIntegrado;
