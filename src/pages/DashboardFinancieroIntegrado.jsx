// DashboardFinancieroIntegrado.jsx - Versión ultra simplificada que funciona
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Wallet, PieChart, TrendingUp, 
  RefreshCw, CheckCircle, Clock
} from 'lucide-react';

// Importar servicios corregidos
import chipaxService from '../services/chipaxService';
import { adaptarCompras } from '../services/chipaxAdapter';

const DashboardFinancieroIntegrado = () => {
  // Estados esenciales - SOLO arrays para evitar errores
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [cuentasPendientes, setCuentasPendientes] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);

  // === FUNCIONES DE CARGA SIMPLIFICADAS ===

  const cargarSaldosBancarios = async () => {
    try {
      console.log('🏦 Cargando saldos bancarios...');
      const datos = await chipaxService.obtenerSaldosBancarios();
      
      // VALIDACIÓN CRÍTICA: Asegurar que sea array
      if (Array.isArray(datos)) {
        setSaldosBancarios(datos);
        console.log(`✅ ${datos.length} saldos cargados`);
      } else {
        console.warn('⚠️ Saldos no es array, usando array vacío');
        setSaldosBancarios([]);
      }
    } catch (error) {
      console.error('❌ Error cargando saldos:', error);
      setSaldosBancarios([]);
      setErrors(prev => [...prev, `Saldos: ${error.message}`]);
    }
  };

  const cargarCuentasPorCobrar = async () => {
    try {
      console.log('📋 Cargando cuentas por cobrar...');
      const datos = await chipaxService.obtenerDTEsPorCobrar();
      
      // VALIDACIÓN CRÍTICA: Asegurar que sea array
      if (Array.isArray(datos)) {
        setCuentasPendientes(datos);
        console.log(`✅ ${datos.length} cuentas por cobrar cargadas`);
      } else {
        console.warn('⚠️ Cuentas por cobrar no es array, usando array vacío');
        setCuentasPendientes([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cuentas por cobrar:', error);
      setCuentasPendientes([]);
      setErrors(prev => [...prev, `Por cobrar: ${error.message}`]);
    }
  };

  const cargarCuentasPorPagar = async () => {
    try {
      console.log('💸 Cargando cuentas por pagar...');
      const comprasRaw = await chipaxService.obtenerCompras();
      
      // VALIDACIÓN: Verificar que obtenemos datos
      if (!comprasRaw) {
        console.warn('⚠️ No se obtuvieron datos de compras');
        setCuentasPorPagar([]);
        return;
      }
      
      // Aplicar adaptador corregido
      const comprasAdaptadas = adaptarCompras(comprasRaw);
      
      // VALIDACIÓN CRÍTICA: Verificar que es array y elementos válidos
      if (Array.isArray(comprasAdaptadas)) {
        // Verificar que los proveedores sean strings
        const primerElemento = comprasAdaptadas[0];
        if (primerElemento && typeof primerElemento.proveedor === 'string') {
          setCuentasPorPagar(comprasAdaptadas);
          console.log(`✅ ${comprasAdaptadas.length} cuentas por pagar cargadas`);
        } else {
          console.error('❌ Error: proveedor no es string después de adaptación');
          setCuentasPorPagar([]);
          setErrors(prev => [...prev, 'Por pagar: Error en adaptación de proveedor']);
        }
      } else {
        console.warn('⚠️ Adaptador no retornó array válido');
        setCuentasPorPagar([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cuentas por pagar:', error);
      setCuentasPorPagar([]);
      setErrors(prev => [...prev, `Por pagar: ${error.message}`]);
    }
  };

  // Cargar todos los datos al iniciar
  const cargarTodosLosDatos = async () => {
    setLoading(true);
    setErrors([]); // Limpiar errores previos
    
    console.log('🚀 Iniciando carga completa del dashboard...');
    
    try {
      // Cargar en secuencia para evitar problemas de concurrencia
      await cargarSaldosBancarios();
      await cargarCuentasPorCobrar();
      await cargarCuentasPorPagar();
      
      console.log('✅ Carga completa finalizada');
    } catch (error) {
      console.error('❌ Error en carga completa:', error);
      setErrors(prev => [...prev, `Carga general: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarTodosLosDatos();
  }, []);

  // === FUNCIONES DE CÁLCULO SEGURAS ===

  const calcularTotalSaldos = () => {
    if (!Array.isArray(saldosBancarios)) return 0;
    return saldosBancarios.reduce((total, cuenta) => {
      const saldo = parseFloat(cuenta.saldo) || 0;
      return total + saldo;
    }, 0);
  };

  const calcularTotalPorCobrar = () => {
    if (!Array.isArray(cuentasPendientes)) return 0;
    return cuentasPendientes.reduce((total, cuenta) => {
      const monto = parseFloat(cuenta.monto) || 0;
      return total + monto;
    }, 0);
  };

  const calcularTotalPorPagar = () => {
    if (!Array.isArray(cuentasPorPagar)) return 0;
    return cuentasPorPagar.reduce((total, cuenta) => {
      const monto = parseFloat(cuenta.monto) || 0;
      return total + monto;
    }, 0);
  };

  const calcularPosicionNeta = () => {
    return calcularTotalSaldos() + calcularTotalPorCobrar() - calcularTotalPorPagar();
  };

  // === FUNCIONES DE UTILIDAD ===

  const formatCurrency = (amount) => {
    const numero = parseFloat(amount) || 0;
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(numero);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Financiero</h1>
            <p className="text-gray-600">PGR Seguridad S.p.A - Chipax API v2</p>
          </div>
          
          <button
            onClick={cargarTodosLosDatos}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              loading 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Cargando...' : 'Recargar'}
          </button>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500 mr-2" />
              <span className="text-blue-700">Cargando datos desde Chipax...</span>
            </div>
          </div>
        )}
      </div>

      {/* Mostrar errores si existen */}
      {errors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium flex items-center mb-2">
            <AlertCircle className="h-4 w-4 mr-2" />
            Errores Durante la Carga
          </h3>
          <ul className="text-red-700 text-sm space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tarjetas de resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Saldos Bancarios */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Saldos Bancarios</h3>
            <Wallet className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(calcularTotalSaldos())}
          </p>
          <p className="text-sm text-gray-600">
            {saldosBancarios.length} cuentas
          </p>
        </div>

        {/* Cuentas por Cobrar */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Por Cobrar</h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(calcularTotalPorCobrar())}
          </p>
          <p className="text-sm text-gray-600">
            {cuentasPendientes.length} facturas
          </p>
        </div>

        {/* Cuentas por Pagar */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Por Pagar</h3>
            <Calendar className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(calcularTotalPorPagar())}
          </p>
          <p className="text-sm text-gray-600">
            {cuentasPorPagar.length} compras
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

      {/* Detalles en dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cuentas por Cobrar Detalladas */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimas Cuentas por Cobrar</h2>
          
          {cuentasPendientes.length > 0 ? (
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimas Cuentas por Pagar</h2>
          
          {cuentasPorPagar.length > 0 ? (
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

      {/* Debug info solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Info</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Saldos bancarios: {saldosBancarios.length} (array: {Array.isArray(saldosBancarios) ? 'Sí' : 'No'})</p>
            <p>Cuentas por cobrar: {cuentasPendientes.length} (array: {Array.isArray(cuentasPendientes) ? 'Sí' : 'No'})</p>
            <p>Cuentas por pagar: {cuentasPorPagar.length} (array: {Array.isArray(cuentasPorPagar) ? 'Sí' : 'No'})</p>
            <p>Errores: {errors.length}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFinancieroIntegrado;
