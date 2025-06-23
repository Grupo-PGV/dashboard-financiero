// DashboardFinancieroIntegrado.jsx - VERSIÓN CORREGIDA COMPLETA
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Wallet, PieChart, TrendingUp, 
  RefreshCw, CheckCircle, Clock, ChevronLeft, ChevronRight,
  Database, Search, Bug, DollarSign, Users, FileText
} from 'lucide-react';

import chipaxService from '../services/chipaxService';
import ChipaxComprasDebugger from '../components/ChipaxComprasDebugger';
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
  const [pestanaActiva, setPestanaActiva] = useState('dashboard');
  
  // Estados para filtrado
  const [filtroCompras, setFiltroCompras] = useState({
    soloNoPagadas: false,
    fechaInicio: '',
    fechaFin: '',
    folioFiltro: ''
  });

  // Estados para paginación
  const [paginacionCompras, setPaginacionCompras] = useState({
    paginaActual: 1,
    itemsPorPagina: 50
  });

  const [paginacionCobrar, setPaginacionCobrar] = useState({
    paginaActual: 1,
    itemsPorPagina: 50
  });

  // === FUNCIONES DE CARGA ===
  const cargarSaldosBancarios = async () => {
    try {
      console.log('🏦 Cargando saldos bancarios...');
      // ✅ CORREGIDO: Usar la nueva función obtenerSaldosBancarios
      const datos = await chipaxService.obtenerSaldosBancarios();
      
      // ✅ CORREGIDO: Los datos ya vienen como array directo
      if (Array.isArray(datos) && datos.length > 0) {
        setSaldosBancarios(datos);
        console.log('✅ Saldos bancarios cargados:', datos.length);
      } else {
        console.warn('⚠️ No se obtuvieron saldos bancarios');
        setSaldosBancarios([]);
      }
    } catch (error) {
      console.error('❌ Error cargando saldos:', error);
      setErrors(prev => [...prev, `Error cargando saldos: ${error.message}`]);
    }
  };

  const cargarCuentasPorCobrar = async () => {
    try {
      console.log('💰 Cargando cuentas por cobrar...');
      const datos = await chipaxService.obtenerDtesPorCobrar();
      
      if (Array.isArray(datos) && datos.length > 0) {
        const adaptados = adaptarCuentasPorCobrar(datos);
        const pendientes = adaptados.filter(cuenta => cuenta.saldo > 0);
        setCuentasPorCobrar(pendientes);
        console.log('✅ Cuentas por cobrar cargadas:', pendientes.length);
      } else {
        console.warn('⚠️ No se obtuvieron cuentas por cobrar');
        setCuentasPorCobrar([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cuentas por cobrar:', error);
      setErrors(prev => [...prev, `Error cargando cuentas por cobrar: ${error.message}`]);
    }
  };

  const cargarCuentasPorPagar = async () => {
    try {
      console.log('💸 Cargando cuentas por pagar...');
      const datos = await chipaxService.obtenerCompras();
      
      if (Array.isArray(datos) && datos.length > 0) {
        const adaptados = adaptarCuentasPorPagar(datos);
        const pendientes = filtrarComprasPendientes(adaptados);
        setCuentasPorPagar(pendientes);
        console.log('✅ Cuentas por pagar cargadas:', pendientes.length);
      } else {
        console.warn('⚠️ No se obtuvieron cuentas por pagar');
        setCuentasPorPagar([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cuentas por pagar:', error);
      setErrors(prev => [...prev, `Error cargando cuentas por pagar: ${error.message}`]);
    }
  };

  const cargarTodosDatos = async () => {
    setLoading(true);
    setErrors([]);
    
    try {
      console.log('🔄 Cargando todos los datos...');
      await Promise.all([
        cargarSaldosBancarios(),
        cargarCuentasPorCobrar(),
        cargarCuentasPorPagar()
      ]);
      console.log('✅ Todos los datos cargados exitosamente');
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      setErrors(prev => [...prev, `Error general: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // === FUNCIONES AUXILIARES ===
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-CL');
    } catch {
      return dateString;
    }
  };

  // === FUNCIONES DE FILTRADO ===
  const aplicarFiltrosCompras = (compras) => {
    let filtered = [...compras];

    if (filtroCompras.soloNoPagadas) {
      filtered = filtered.filter(compra => !compra.estaPagado);
    }

    if (filtroCompras.fechaInicio && filtroCompras.fechaFin) {
      filtered = filtrarComprasPorFecha(filtered, filtroCompras.fechaInicio, filtroCompras.fechaFin);
    }

    if (filtroCompras.folioFiltro) {
      filtered = filtered.filter(compra => 
        compra.folio.toString().toLowerCase().includes(filtroCompras.folioFiltro.toLowerCase())
      );
    }

    return filtered;
  };

  // === FUNCIONES DE PAGINACIÓN ===
  const getTotalPaginasCompras = () => {
    const comprasFiltradas = aplicarFiltrosCompras(cuentasPorPagar);
    return Math.ceil(comprasFiltradas.length / paginacionCompras.itemsPorPagina);
  };

  const getTotalPaginasCobrar = () => {
    return Math.ceil(cuentasPorCobrar.length / paginacionCobrar.itemsPorPagina);
  };

  const getComprasPaginadas = () => {
    const comprasFiltradas = aplicarFiltrosCompras(cuentasPorPagar);
    const inicio = (paginacionCompras.paginaActual - 1) * paginacionCompras.itemsPorPagina;
    const fin = inicio + paginacionCompras.itemsPorPagina;
    return comprasFiltradas.slice(inicio, fin);
  };

  const getCuentasPorCobrarPaginadas = () => {
    const inicio = (paginacionCobrar.paginaActual - 1) * paginacionCobrar.itemsPorPagina;
    const fin = inicio + paginacionCobrar.itemsPorPagina;
    return cuentasPorCobrar.slice(inicio, fin);
  };

  // === COMPONENTES INTERNOS ===
  const ComponentePaginacion = ({ paginacion, setPaginacion, totalPaginas, nombre }) => (
    <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200">
      <div className="flex items-center">
        <span className="text-sm text-gray-700">
          Página {paginacion.paginaActual} de {totalPaginas}
        </span>
        <select
          className="ml-4 rounded border-gray-300 text-sm"
          value={paginacion.itemsPorPagina}
          onChange={(e) => setPaginacion(prev => ({
            ...prev,
            itemsPorPagina: parseInt(e.target.value),
            paginaActual: 1
          }))}
        >
          <option value={25}>25 por página</option>
          <option value={50}>50 por página</option>
          <option value={100}>100 por página</option>
        </select>
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setPaginacion(prev => ({
            ...prev,
            paginaActual: Math.max(1, prev.paginaActual - 1)
          }))}
          disabled={paginacion.paginaActual === 1}
          className="p-2 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setPaginacion(prev => ({
            ...prev,
            paginaActual: Math.min(totalPaginas, prev.paginaActual + 1)
          }))}
          disabled={paginacion.paginaActual === totalPaginas}
          className="p-2 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );

  const EstadisticasGenerales = () => {
    const totalSaldos = saldosBancarios.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    const totalPorCobrar = cuentasPorCobrar.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    const totalPorPagar = cuentasPorPagar.reduce((sum, cuenta) => sum + cuenta.monto, 0);
    const liquidezNeta = totalSaldos + totalPorCobrar - totalPorPagar;

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Wallet className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Saldos Bancarios</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalSaldos)}</p>
              <p className="text-sm text-gray-500">{saldosBancarios.length} cuentas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Por Cobrar</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPorCobrar)}</p>
              <p className="text-sm text-gray-500">{cuentasPorCobrar.length} facturas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Por Pagar</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPorPagar)}</p>
              <p className="text-sm text-gray-500">{cuentasPorPagar.length} facturas</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <DollarSign className={`h-8 w-8 ${liquidezNeta >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Liquidez Neta</p>
              <p className={`text-2xl font-bold ${liquidezNeta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(liquidezNeta)}
              </p>
              <p className="text-sm text-gray-500">Disponible proyectado</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ResumenFacturas2025 = () => {
    const facturas2025 = cuentasPorPagar.filter(compra => {
      const fecha = new Date(compra.fecha);
      return fecha.getFullYear() === 2025;
    });

    const montoTotal2025 = facturas2025.reduce((sum, factura) => sum + factura.monto, 0);

    return (
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📊 Resumen Facturas 2025
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Facturas 2025</p>
            <p className="text-xl font-bold text-blue-600">{facturas2025.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Monto Total 2025</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(montoTotal2025)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Promedio por Factura</p>
            <p className="text-xl font-bold text-gray-600">
              {facturas2025.length > 0 ? formatCurrency(montoTotal2025 / facturas2025.length) : '$0'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const FiltrosCompras = () => (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filtroCompras.soloNoPagadas}
              onChange={(e) => setFiltroCompras(prev => ({
                ...prev,
                soloNoPagadas: e.target.checked
              }))}
              className="rounded"
            />
            <span className="ml-2 text-sm">Solo no pagadas</span>
          </label>
        </div>
        <div>
          <input
            type="date"
            placeholder="Fecha inicio"
            value={filtroCompras.fechaInicio}
            onChange={(e) => setFiltroCompras(prev => ({
              ...prev,
              fechaInicio: e.target.value
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <input
            type="date"
            placeholder="Fecha fin"
            value={filtroCompras.fechaFin}
            onChange={(e) => setFiltroCompras(prev => ({
              ...prev,
              fechaFin: e.target.value
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Buscar por folio..."
            value={filtroCompras.folioFiltro}
            onChange={(e) => setFiltroCompras(prev => ({
              ...prev,
              folioFiltro: e.target.value
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>
    </div>
  );

  const TablaCompras = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          💸 Cuentas por Pagar ({cuentasPorPagar.length})
        </h3>
      </div>
      
      <div className="p-6">
        <FiltrosCompras />
        
        {cuentasPorPagar.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Folio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proveedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getComprasPaginadas().map((compra, index) => (
                    <tr key={compra.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {compra.folio}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {compra.proveedor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(compra.fecha)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(compra.fechaVencimiento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(compra.monto)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          compra.estaPagado 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {compra.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <ComponentePaginacion 
              paginacion={paginacionCompras}
              setPaginacion={setPaginacionCompras}
              totalPaginas={getTotalPaginasCompras()}
              nombre="compras"
            />
          </>
        ) : (
          <p className="text-gray-500">No hay datos de cuentas por pagar disponibles.</p>
        )}
      </div>
    </div>
  );

  const TablaCobrar = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          💰 Cuentas por Cobrar ({cuentasPorCobrar.length})
        </h3>
      </div>
      
      <div className="p-6">
        {cuentasPorCobrar.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Folio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Emisión
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getCuentasPorCobrarPaginadas().map((cuenta, index) => (
                    <tr key={cuenta.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cuenta.folio}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cuenta.cliente}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(cuenta.fechaEmision)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(cuenta.fechaVencimiento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cuenta.saldo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <ComponentePaginacion 
              paginacion={paginacionCobrar}
              setPaginacion={setPaginacionCobrar}
              totalPaginas={getTotalPaginasCobrar()}
              nombre="cobrar"
            />
          </>
        ) : (
          <p className="text-gray-500">No hay datos de cuentas por cobrar disponibles.</p>
        )}
      </div>
    </div>
  );

  // === RENDER PRINCIPAL ===
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Dashboard Financiero Integrado
            </h1>
            <p className="text-gray-600 mt-1">
              Gestión completa de flujo de caja con datos de Chipax
            </p>
          </div>
          
          {/* Navegación de pestañas */}
          <div className="flex gap-2">
            <button
              onClick={() => setPestanaActiva('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                pestanaActiva === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <PieChart size={16} className="inline mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setPestanaActiva('debugger')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                pestanaActiva === 'debugger'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bug size={16} className="inline mr-2" />
              Debug
            </button>
          </div>
        </div>

        {/* Controles de carga de datos */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cargar Datos</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={cargarSaldosBancarios}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Wallet size={16} className="mr-2" />
              Saldos Bancarios
            </button>
            
            <button
              onClick={cargarCuentasPorCobrar}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <TrendingUp size={16} className="mr-2" />
              Cuentas por Cobrar
            </button>
            
            <button
              onClick={cargarCuentasPorPagar}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <AlertCircle size={16} className="mr-2" />
              Cuentas por Pagar
            </button>
            
            <button
              onClick={cargarTodosDatos}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Database size={16} className="mr-2" />}
              Cargar Todo
            </button>
          </div>
        </div>

        {/* Mostrar errores */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h4 className="text-red-800 font-medium mb-2">Errores encontrados:</h4>
            <ul className="text-red-700 text-sm space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
            <button
              onClick={() => setErrors([])}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Limpiar errores
            </button>
          </div>
        )}

        {/* Contenido según la pestaña activa */}
        {pestanaActiva === 'dashboard' && (
          <>
            {/* Mostrar indicador de datos vacíos */}
            {saldosBancarios.length === 0 && cuentasPorCobrar.length === 0 && cuentasPorPagar.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-6 h-6 text-yellow-600 mt-1 mr-3" />
                  <div>
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">
                      🚀 ¡Bienvenido al Dashboard Financiero!
                    </h3>
                    <p className="text-yellow-700 mb-3">
                      Para comenzar, haz clic en los botones de arriba para cargar los datos que necesites:
                    </p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• <strong>Cuentas por Pagar:</strong> Facturas de proveedores</li>
                      <li>• <strong>Cuentas por Cobrar:</strong> Facturas de clientes pendientes</li>
                      <li>• <strong>Saldos Bancarios:</strong> Estado de cuentas corrientes</li>
                      <li>• <strong>Cargar Todo:</strong> Todos los módulos de una vez</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <EstadisticasGenerales />
            <ResumenFacturas2025 />
            
            <div className="space-y-8">
              <TablaCompras />
              <TablaCobrar />
            </div>
          </>
        )}

        {pestanaActiva === 'debugger' && (
          <ChipaxComprasDebugger />
        )}
      </div>
    </div>
  );
};

export default DashboardFinancieroIntegrado;
