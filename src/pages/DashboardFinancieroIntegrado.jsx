// DashboardFinancieroIntegrado.jsx - Versión original corregida
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Wallet, PieChart, TrendingUp, 
  RefreshCw, CheckCircle, Clock
} from 'lucide-react';

// Importar servicios corregidos
import chipaxService from '../services/chipaxService';
import { adaptarCompras } from '../services/chipaxAdapter';
import ChipaxSaldosInvestigator from '../services/chipaxSaldosInvestigator';

const DashboardFinancieroIntegrado = () => {
  // Estados principales del dashboard original
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [cuentasPendientes, setCuentasPendientes] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Estados para mostrar el progreso de carga
  const [estadosCarga, setEstadosCarga] = useState({
    saldos: 'idle', // idle, loading, success, error
    porCobrar: 'idle',
    porPagar: 'idle'
  });

  // === FUNCIONES DE CARGA DE DATOS ===

  /**
   * Cargar saldos bancarios usando el investigador avanzado
   */
  const cargarSaldosBancarios = async () => {
    setEstadosCarga(prev => ({ ...prev, saldos: 'loading' }));
    
    try {
      console.log('🏦 Cargando saldos bancarios...');
      
      // Usar el investigador de saldos para obtener datos reales
      const saldos = await ChipaxSaldosInvestigator.obtenerSaldosOptimizados();
      
      if (saldos && saldos.length > 0) {
        setSaldosBancarios(saldos);
        setEstadosCarga(prev => ({ ...prev, saldos: 'success' }));
        console.log(`✅ ${saldos.length} saldos bancarios cargados`);
      } else {
        // Fallback: obtener cuentas sin saldos
        const cuentasSinSaldos = await chipaxService.obtenerSaldosBancarios();
        setSaldosBancarios(cuentasSinSaldos.map(cuenta => ({
          ...cuenta,
          saldo: 0,
          origen: 'fallback_sin_saldo'
        })));
        setEstadosCarga(prev => ({ ...prev, saldos: 'success' }));
        console.log('⚠️ Usando cuentas sin saldos como fallback');
      }
      
    } catch (error) {
      console.error('❌ Error cargando saldos:', error);
      setEstadosCarga(prev => ({ ...prev, saldos: 'error' }));
      setErrors(prev => ({ ...prev, saldos: error.message }));
    }
  };

  /**
   * Cargar cuentas por cobrar (ya funciona correctamente)
   */
  const cargarCuentasPorCobrar = async () => {
    setEstadosCarga(prev => ({ ...prev, porCobrar: 'loading' }));
    
    try {
      console.log('📋 Cargando cuentas por cobrar...');
      
      const datos = await chipaxService.obtenerDTEsPorCobrar();
      setCuentasPendientes(datos);
      setEstadosCarga(prev => ({ ...prev, porCobrar: 'success' }));
      console.log(`✅ ${datos.length} cuentas por cobrar cargadas`);
      
    } catch (error) {
      console.error('❌ Error cargando cuentas por cobrar:', error);
      setEstadosCarga(prev => ({ ...prev, porCobrar: 'error' }));
      setErrors(prev => ({ ...prev, porCobrar: error.message }));
    }
  };

  /**
   * Cargar cuentas por pagar con adaptador corregido
   */
  const cargarCuentasPorPagar = async () => {
    setEstadosCarga(prev => ({ ...prev, porPagar: 'loading' }));
    
    try {
      console.log('🛒 Cargando cuentas por pagar...');
      
      // Obtener datos brutos de la API
      const comprasRaw = await chipaxService.obtenerCompras();
      
      // Aplicar adaptador corregido que convierte proveedor a string
      const comprasAdaptadas = adaptarCompras(comprasRaw);
      
      // Verificar que la adaptación funcionó correctamente
      if (comprasAdaptadas.length > 0) {
        const primeraCompra = comprasAdaptadas[0];
        if (typeof primeraCompra.proveedor !== 'string') {
          throw new Error('El adaptador no está funcionando correctamente - proveedor no es string');
        }
      }
      
      setCuentasPorPagar(comprasAdaptadas);
      setEstadosCarga(prev => ({ ...prev, porPagar: 'success' }));
      console.log(`✅ ${comprasAdaptadas.length} cuentas por pagar cargadas y adaptadas`);
      
    } catch (error) {
      console.error('❌ Error cargando cuentas por pagar:', error);
      setEstadosCarga(prev => ({ ...prev, porPagar: 'error' }));
      setErrors(prev => ({ ...prev, porPagar: error.message }));
    }
  };

  /**
   * Cargar todos los datos al inicializar
   */
  const cargarTodosLosDatos = async () => {
    setLoading(true);
    console.log('🚀 Iniciando carga completa del dashboard...');
    
    try {
      // Cargar todos los módulos en paralelo para mejor rendimiento
      await Promise.allSettled([
        cargarSaldosBancarios(),
        cargarCuentasPorCobrar(),
        cargarCuentasPorPagar()
      ]);
      
      console.log('✅ Carga completa finalizada');
    } catch (error) {
      console.error('❌ Error en carga completa:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Recargar datos específicos
   */
  const recargarDatos = async (tipo) => {
    switch (tipo) {
      case 'saldos':
        await cargarSaldosBancarios();
        break;
      case 'porCobrar':
        await cargarCuentasPorCobrar();
        break;
      case 'porPagar':
        await cargarCuentasPorPagar();
        break;
      case 'todo':
        await cargarTodosLosDatos();
        break;
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarTodosLosDatos();
  }, []);

  // === FUNCIONES DE CÁLCULO ===

  const calcularTotalSaldos = () => {
    return saldosBancarios.reduce((total, cuenta) => total + (cuenta.saldo || 0), 0);
  };

  const calcularTotalPorCobrar = () => {
    return cuentasPendientes.reduce((total, cuenta) => total + (cuenta.monto || 0), 0);
  };

  const calcularTotalPorPagar = () => {
    return cuentasPorPagar.reduce((total, cuenta) => total + (cuenta.monto || 0), 0);
  };

  const calcularPosicionNeta = () => {
    return calcularTotalSaldos() + calcularTotalPorCobrar() - calcularTotalPorPagar();
  };

  // === FUNCIONES DE UTILIDAD ===

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'loading':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header con título y controles */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Financiero</h1>
            <p className="text-gray-600">Integración con Chipax API v2 - PGR Seguridad S.p.A</p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => recargarDatos('todo')}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                loading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Cargando...' : 'Recargar Todo'}
            </button>
          </div>
        </div>

        {/* Indicadores de estado de carga */}
        <div className="flex gap-4 p-4 bg-white rounded-lg shadow">
          <div className="flex items-center gap-2">
            {getStatusIcon(estadosCarga.saldos)}
            <span className="text-sm">Saldos Bancarios</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(estadosCarga.porCobrar)}
            <span className="text-sm">Cuentas por Cobrar</span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(estadosCarga.porPagar)}
            <span className="text-sm">Cuentas por Pagar</span>
          </div>
        </div>
      </div>

      {/* Mostrar errores si existen */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium flex items-center mb-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            Errores Detectados
          </h3>
          {Object.entries(errors).map(([key, error]) => (
            <p key={key} className="text-red-700 text-sm">
              <strong>{key}:</strong> {error}
            </p>
          ))}
        </div>
      )}

      {/* Tarjetas de resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Saldos Bancarios */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Saldos Bancarios</h3>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-500" />
              <button
                onClick={() => recargarDatos('saldos')}
                disabled={estadosCarga.saldos === 'loading'}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${
                  estadosCarga.saldos === 'loading' ? 'animate-spin' : ''
                }`} />
              </button>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(calcularTotalSaldos())}
          </p>
          <p className="text-sm text-gray-600">
            {saldosBancarios.length} cuentas activas
          </p>
        </div>

        {/* Cuentas por Cobrar */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Por Cobrar</h3>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <button
                onClick={() => recargarDatos('porCobrar')}
                disabled={estadosCarga.porCobrar === 'loading'}
                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${
                  estadosCarga.porCobrar === 'loading' ? 'animate-spin' : ''
                }`} />
              </button>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(calcularTotalPorCobrar())}
          </p>
          <p className="text-sm text-gray-600">
            {cuentasPendientes.length} facturas pendientes
          </p>
        </div>

        {/* Cuentas por Pagar */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Por Pagar</h3>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <button
                onClick={() => recargarDatos('porPagar')}
                disabled={estadosCarga.porPagar === 'loading'}
                className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${
                  estadosCarga.porPagar === 'loading' ? 'animate-spin' : ''
                }`} />
              </button>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(calcularTotalPorPagar())}
          </p>
          <p className="text-sm text-gray-600">
            {cuentasPorPagar.length} compras pendientes
          </p>
        </div>

        {/* Posición Neta */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Posición Neta</h3>
            <PieChart className="h-5 w-5 text-purple-500" />
          </div>
          <p className={`text-2xl font-bold ${
            calcularPosicionNeta() >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(calcularPosicionNeta())}
          </p>
          <p className="text-sm text-gray-600">
            {calcularPosicionNeta() >= 0 ? 'Posición positiva' : 'Posición negativa'}
          </p>
        </div>
      </div>

      {/* Sección de datos detallados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cuentas por Cobrar Detalladas */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Cuentas por Cobrar</h2>
            <button
              onClick={() => recargarDatos('porCobrar')}
              disabled={estadosCarga.porCobrar === 'loading'}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${
                estadosCarga.porCobrar === 'loading' ? 'animate-spin' : ''
              }`} />
            </button>
          </div>
          
          {estadosCarga.porCobrar === 'loading' ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Cargando...</span>
            </div>
          ) : cuentasPendientes.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cuentasPendientes.slice(0, 5).map((cuenta, index) => (
                <div key={cuenta.id || index} className="p-3 border border-gray-200 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">Folio {cuenta.folio}</p>
                      <p className="text-sm text-gray-600">{cuenta.razonSocial}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(cuenta.monto)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {cuentasPendientes.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  Y {cuentasPendientes.length - 5} más...
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay cuentas por cobrar</p>
          )}
        </div>

        {/* Cuentas por Pagar Detalladas */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Cuentas por Pagar</h2>
            <button
              onClick={() => recargarDatos('porPagar')}
              disabled={estadosCarga.porPagar === 'loading'}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${
                estadosCarga.porPagar === 'loading' ? 'animate-spin' : ''
              }`} />
            </button>
          </div>
          
          {estadosCarga.porPagar === 'loading' ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Cargando...</span>
            </div>
          ) : cuentasPorPagar.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cuentasPorPagar.slice(0, 5).map((cuenta, index) => (
                <div key={cuenta.id || index} className="p-3 border border-gray-200 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">Folio {cuenta.numero}</p>
                      <p className="text-sm text-gray-600">{cuenta.proveedor}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">
                        {formatCurrency(cuenta.monto)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {cuentasPorPagar.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  Y {cuentasPorPagar.length - 5} más...
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay cuentas por pagar</p>
          )}
        </div>
      </div>

      {/* Información adicional en modo desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Información de Debug</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Saldos bancarios: {saldosBancarios.length} cuentas</p>
            <p>Cuentas por cobrar: {cuentasPendientes.length} facturas</p>
            <p>Cuentas por pagar: {cuentasPorPagar.length} compras</p>
            <p>Estado de carga: {JSON.stringify(estadosCarga)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFinancieroIntegrado;
