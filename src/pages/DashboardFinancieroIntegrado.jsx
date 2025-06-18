// DashboardFinancieroIntegrado.jsx - VERSIÓN CORREGIDA CON EXPORT DEFAULT
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Wallet, PieChart, TrendingUp, 
  RefreshCw, CheckCircle, Clock
} from 'lucide-react';

// ✅ IMPORTACIONES CORREGIDAS 
import chipaxService from '../services/chipaxService';
import { 
  adaptarCuentasPorCobrar, 
  adaptarCuentasPorPagar,
  filtrarComprasPendientes,
  filtrarComprasPorFecha 
} from '../services/chipaxAdapter';

const DashboardFinancieroIntegrado = () => {
  // Estados principales
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  
  // Estados para filtrado
  const [filtroCompras, setFiltroCompras] = useState({
    soloNoPagadas: true, // Por defecto mostrar solo no pagadas
    fechaInicio: '',
    fechaFin: '',
    folioFiltro: ''
  });

  // === FUNCIONES DE CARGA DE DATOS ===

  const cargarSaldosBancarios = async () => {
    try {
      console.log('🏦 Cargando saldos bancarios...');
      const datos = await chipaxService.obtenerSaldosBancarios();
      
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
    console.log('📋 Cargando cuentas por cobrar...');
    
    try {
      const dtes = await chipaxService.obtenerCuentasPorCobrar();
      console.log('📊 DTEs obtenidos:', dtes);
      
      if (Array.isArray(dtes)) {
        const dtesAdaptados = adaptarCuentasPorCobrar(dtes);
        
        // Filtrar solo los que tienen saldo pendiente
        const dtesConSaldo = dtesAdaptados.filter(dte => 
          dte.monto > 0 && dte.estado === 'Pendiente' && !dte.anulado
        );
        
        console.log(`✅ ${dtesAdaptados.length} cuentas por cobrar cargadas`);
        console.log(`💰 ${dtesConSaldo.length} con saldo pendiente`);
        
        setCuentasPorCobrar(dtesConSaldo);
      } else {
        console.warn('⚠️ DTEs no es array, usando array vacío');
        setCuentasPorCobrar([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cuentas por cobrar:', error);
      setCuentasPorCobrar([]);
      setErrors(prev => [...prev, `Por cobrar: ${error.message}`]);
    }
  };

  const cargarCuentasPorPagar = async () => {
    console.log('💸 Cargando cuentas por pagar...');
    
    try {
      const compras = await chipaxService.obtenerCuentasPorPagar();
      console.log('📊 Compras obtenidas:', compras);
      
      if (Array.isArray(compras)) {
        const comprasAdaptadas = adaptarCuentasPorPagar(compras);
        
        console.log(`✅ ${comprasAdaptadas.length} cuentas por pagar cargadas`);
        
        setCuentasPorPagar(comprasAdaptadas);
      } else {
        console.warn('⚠️ Compras no es array, usando array vacío');
        setCuentasPorPagar([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cuentas por pagar:', error);
      setCuentasPorPagar([]);
      setErrors(prev => [...prev, `Por pagar: ${error.message}`]);
    }
  };

  // Cargar todos los datos
  const cargarTodosLosDatos = async () => {
    setLoading(true);
    setErrors([]); // Limpiar errores previos
    
    console.log('🚀 Iniciando carga completa del dashboard...');
    
    try {
      await Promise.all([
        cargarSaldosBancarios(),
        cargarCuentasPorCobrar(),
        cargarCuentasPorPagar()
      ]);
      
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

  // === FUNCIONES DE CÁLCULO ===

  const calcularTotalSaldos = () => {
    if (!Array.isArray(saldosBancarios)) return 0;
    return saldosBancarios.reduce((total, cuenta) => {
      const saldo = parseFloat(cuenta.saldo || cuenta.saldoCalculado || 0);
      return total + saldo;
    }, 0);
  };

  const calcularTotalPorCobrar = () => {
    if (!Array.isArray(cuentasPorCobrar)) return 0;
    return cuentasPorCobrar.reduce((total, cuenta) => total + (cuenta.monto || 0), 0);
  };

  const calcularTotalPorPagar = () => {
    if (!Array.isArray(cuentasPorPagar)) return 0;
    
    const comprasFiltradas = obtenerComprasFiltradas();
    return comprasFiltradas.reduce((total, compra) => total + (compra.monto || 0), 0);
  };

  const calcularPosicionNeta = () => {
    return calcularTotalSaldos() + calcularTotalPorCobrar() - calcularTotalPorPagar();
  };

  // === FUNCIONES DE FILTRADO ===

  const obtenerComprasFiltradas = () => {
    if (!Array.isArray(cuentasPorPagar)) return [];
    
    let comprasFiltradas = [...cuentasPorPagar];
    
    // Filtro por estado de pago
    if (filtroCompras.soloNoPagadas) {
      comprasFiltradas = filtrarComprasPendientes(comprasFiltradas);
    }
    
    // Filtro por rango de fechas
    if (filtroCompras.fechaInicio && filtroCompras.fechaFin) {
      comprasFiltradas = filtrarComprasPorFecha(
        comprasFiltradas, 
        filtroCompras.fechaInicio, 
        filtroCompras.fechaFin
      );
    }
    
    // Filtro por folio
    if (filtroCompras.folioFiltro.trim()) {
      comprasFiltradas = comprasFiltradas.filter(compra => 
        compra.folio.toString().includes(filtroCompras.folioFiltro.trim())
      );
    }
    
    return comprasFiltradas;
  };

  // === FUNCIÓN DE FORMATO ===
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // === COMPONENTE DE FILTROS ===
  const FiltrosCompras = () => (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <h4 className="font-medium text-gray-700 mb-3">Filtros para Compras</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filtroCompras.soloNoPagadas}
            onChange={(e) => setFiltroCompras(prev => ({
              ...prev,
              soloNoPagadas: e.target.checked
            }))}
            className="mr-2"
          />
          Solo no pagadas
        </label>
        
        <input
          type="text"
          placeholder="Filtrar por folio"
          value={filtroCompras.folioFiltro}
          onChange={(e) => setFiltroCompras(prev => ({
            ...prev,
            folioFiltro: e.target.value
          }))}
          className="px-3 py-2 border border-gray-300 rounded"
        />
        
        <input
          type="date"
          value={filtroCompras.fechaInicio}
          onChange={(e) => setFiltroCompras(prev => ({
            ...prev,
            fechaInicio: e.target.value
          }))}
          className="px-3 py-2 border border-gray-300 rounded"
        />
        
        <input
          type="date"
          value={filtroCompras.fechaFin}
          onChange={(e) => setFiltroCompras(prev => ({
            ...prev,
            fechaFin: e.target.value
          }))}
          className="px-3 py-2 border border-gray-300 rounded"
        />
      </div>
      
      <div className="mt-3 text-sm text-gray-600">
        Mostrando {obtenerComprasFiltradas().length} de {cuentasPorPagar.length} compras
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Financiero</h1>
          <p className="text-gray-600 mt-1">Resumen financiero integral de tu empresa</p>
        </div>
        <button
          onClick={cargarTodosLosDatos}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Alertas de errores */}
      {errors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <h3 className="font-medium text-red-800">Errores encontrados:</h3>
          </div>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tarjetas de resumen */}
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
            {cuentasPorCobrar.length} facturas pendientes
          </p>
        </div>

        {/* Cuentas por Pagar */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">
              Por Pagar {filtroCompras.soloNoPagadas ? '(Pendiente)' : '(Total)'}
            </h3>
            <Calendar className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(calcularTotalPorPagar())}
          </p>
          <p className="text-sm text-gray-600">
            {obtenerComprasFiltradas().length} compras
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

      {/* Sección de Cuentas por Pagar */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cuentas por Pagar</h2>
        
        <FiltrosCompras />
        
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha Pago</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {obtenerComprasFiltradas().slice(0, 10).map((compra) => (
                <tr key={compra.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">{compra.folio}</td>
                  <td className="px-4 py-2 text-sm">{compra.razonSocial}</td>
                  <td className="px-4 py-2 text-sm">{compra.fecha}</td>
                  <td className="px-4 py-2 text-sm">
                    {compra.fechaPago ? compra.fechaPago : 'Sin pagar'}
                  </td>
                  <td className="px-4 py-2 text-sm font-medium">{formatCurrency(compra.monto)}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      compra.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      compra.estado === 'Pagado' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {compra.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {obtenerComprasFiltradas().length > 10 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Mostrando 10 de {obtenerComprasFiltradas().length} compras. 
            <span className="text-blue-600 hover:text-blue-800 cursor-pointer ml-1">
              Ver todas
            </span>
          </div>
        )}
      </div>

      {/* Sección de Cuentas por Cobrar */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cuentas por Cobrar Pendientes</h2>
        
        {cuentasPorCobrar.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monto Pendiente</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cuentasPorCobrar.slice(0, 10).map((cuenta) => (
                  <tr key={cuenta.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{cuenta.folio}</td>
                    <td className="px-4 py-2 text-sm">{cuenta.razonSocial}</td>
                    <td className="px-4 py-2 text-sm">{cuenta.fecha}</td>
                    <td className="px-4 py-2 text-sm">{cuenta.fechaVencimiento || 'Sin fecha'}</td>
                    <td className="px-4 py-2 text-sm font-medium">{formatCurrency(cuenta.monto)}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        {cuenta.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No hay cuentas por cobrar pendientes</p>
          </div>
        )}
        
        {cuentasPorCobrar.length > 10 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Mostrando 10 de {cuentasPorCobrar.length} facturas pendientes.
            <span className="text-blue-600 hover:text-blue-800 cursor-pointer ml-1">
              Ver todas
            </span>
          </div>
        )}
      </div>

      {/* Debug info en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Info</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Saldos bancarios: {saldosBancarios.length} items</p>
            <p>Cuentas por cobrar: {cuentasPorCobrar.length} items</p>
            <p>Cuentas por pagar: {cuentasPorPagar.length} items</p>
            <p>Compras filtradas: {obtenerComprasFiltradas().length} items</p>
            <p>Errores: {errors.length}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ EXPORT DEFAULT AGREGADO - ESTO RESUELVE EL ERROR DE BUILD
export default DashboardFinancieroIntegrado;
