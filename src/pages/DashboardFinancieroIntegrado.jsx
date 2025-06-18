// DashboardFinancieroIntegrado.jsx - VERSIÓN COMPLETA CON DEBUGGER

import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Wallet, PieChart, TrendingUp, 
  RefreshCw, CheckCircle, Clock, ChevronLeft, ChevronRight,
  Database, Search, Bug
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
  // ✅ NUEVO: Estado para pestañas
  const [pestanaActiva, setPestanaActiva] = useState('dashboard');
  
  // Estados principales
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  
  // Estados para filtrado
  const [filtroCompras, setFiltroCompras] = useState({
    soloNoPagadas: false, // ✅ CAMBIADO: Ya no filtrar por pagadas por defecto
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

  // === FUNCIONES DE CARGA MEJORADAS ===

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
    try {
      console.log('📋 Cargando cuentas por cobrar...');
      const dtes = await chipaxService.obtenerCuentasPorCobrar();
      
      if (Array.isArray(dtes)) {
        const cuentasAdaptadas = adaptarCuentasPorCobrar(dtes);
        setCuentasPorCobrar(cuentasAdaptadas);
        console.log(`✅ ${cuentasAdaptadas.length} cuentas por cobrar cargadas`);
      } else {
        console.warn('⚠️ DTEs no es array');
        setCuentasPorCobrar([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cuentas por cobrar:', error);
      setCuentasPorCobrar([]);
      setErrors(prev => [...prev, `Cuentas por cobrar: ${error.message}`]);
    }
  };

  const cargarCuentasPorPagar = async () => {
    try {
      console.log('💸 Cargando cuentas por pagar...');
      const compras = await chipaxService.obtenerCuentasPorPagar();
      
      if (Array.isArray(compras)) {
        const cuentasAdaptadas = adaptarCuentasPorPagar(compras);
        setCuentasPorPagar(cuentasAdaptadas);
        console.log(`✅ ${cuentasAdaptadas.length} cuentas por pagar cargadas`);
      } else {
        console.warn('⚠️ Compras no es array');
        setCuentasPorPagar([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cuentas por pagar:', error);
      setCuentasPorPagar([]);
      setErrors(prev => [...prev, `Cuentas por pagar: ${error.message}`]);
    }
  };

  // ✅ NUEVA FUNCIÓN: Carga rápida solo 2025
  const cargarSolo2025 = async () => {
    try {
      setLoading(true);
      console.log('🚀 Cargando SOLO facturas de 2025...');
      
      // Aquí puedes usar la función optimizada cuando la implementes
      const compras = await chipaxService.obtenerCuentasPorPagar();
      
      if (Array.isArray(compras)) {
        // Filtrar solo 2025
        const compras2025 = compras.filter(compra => {
          const fecha = compra.fechaEmision || compra.fecha_emision || compra.fecha || '';
          return fecha.includes('2025');
        });
        
        const cuentasAdaptadas = adaptarCuentasPorPagar(compras2025);
        setCuentasPorPagar(cuentasAdaptadas);
        console.log(`✅ ${cuentasAdaptadas.length} facturas de 2025 cargadas`);
      }
    } catch (error) {
      console.error('❌ Error cargando 2025:', error);
      setErrors(prev => [...prev, `2025: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const cargarTodosDatos = async () => {
    setLoading(true);
    setErrors([]);
    
    try {
      console.log('🔄 Iniciando carga completa...');
      
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

  // Carga inicial
  useEffect(() => {
    cargarTodosDatos();
  }, []);

  // === FUNCIONES DE FILTRADO Y PAGINACIÓN ===

  const obtenerComprasFiltradas = () => {
    let comprasFiltradas = [...cuentasPorPagar];

    if (filtroCompras.soloNoPagadas) {
      comprasFiltradas = comprasFiltradas.filter(compra => 
        compra.estado !== 'Pagado' && !compra.estaPagado
      );
    }

    if (filtroCompras.folioFiltro) {
      comprasFiltradas = comprasFiltradas.filter(compra =>
        compra.folio.toString().includes(filtroCompras.folioFiltro)
      );
    }

    if (filtroCompras.fechaInicio && filtroCompras.fechaFin) {
      comprasFiltradas = filtrarComprasPorFecha(
        comprasFiltradas,
        filtroCompras.fechaInicio,
        filtroCompras.fechaFin
      );
    }

    return comprasFiltradas;
  };

  const obtenerComprasPaginadas = () => {
    const comprasFiltradas = obtenerComprasFiltradas();
    const inicio = (paginacionCompras.paginaActual - 1) * paginacionCompras.itemsPorPagina;
    const fin = inicio + paginacionCompras.itemsPorPagina;
    return comprasFiltradas.slice(inicio, fin);
  };

  const obtenerCobrarPaginadas = () => {
    const inicio = (paginacionCobrar.paginaActual - 1) * paginacionCobrar.itemsPorPagina;
    const fin = inicio + paginacionCobrar.itemsPorPagina;
    return cuentasPorCobrar.slice(inicio, fin);
  };

  const getTotalPaginasCompras = () => {
    const total = obtenerComprasFiltradas().length;
    return Math.ceil(total / paginacionCompras.itemsPorPagina);
  };

  const getTotalPaginasCobrar = () => {
    return Math.ceil(cuentasPorCobrar.length / paginacionCobrar.itemsPorPagina);
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

  // === COMPONENTE DE PESTAÑAS ===
  const TabNavigation = () => (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button 
            onClick={() => setPestanaActiva('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              pestanaActiva === 'dashboard' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <PieChart size={16} />
            Dashboard Financiero
          </button>
          
          <button 
            onClick={() => setPestanaActiva('debugger')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              pestanaActiva === 'debugger' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bug size={16} />
            🔍 API Debugger
          </button>
        </nav>
      </div>
    </div>
  );

  // === COMPONENTES DE FILTROS ===
  const FiltrosCompras = () => (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <h4 className="font-medium text-gray-700 mb-3">Filtros para Compras</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filtroCompras.soloNoPagadas}
            onChange={(e) => {
              setFiltroCompras(prev => ({ ...prev, soloNoPagadas: e.target.checked }));
              setPaginacionCompras(prev => ({ ...prev, paginaActual: 1 }));
            }}
            className="mr-2"
          />
          Solo no pagadas
        </label>
        
        <input
          type="text"
          placeholder="Filtrar por folio"
          value={filtroCompras.folioFiltro}
          onChange={(e) => {
            setFiltroCompras(prev => ({ ...prev, folioFiltro: e.target.value }));
            setPaginacionCompras(prev => ({ ...prev, paginaActual: 1 }));
          }}
          className="px-3 py-2 border border-gray-300 rounded"
        />
        
        <input
          type="date"
          value={filtroCompras.fechaInicio}
          onChange={(e) => {
            setFiltroCompras(prev => ({ ...prev, fechaInicio: e.target.value }));
            setPaginacionCompras(prev => ({ ...prev, paginaActual: 1 }));
          }}
          className="px-3 py-2 border border-gray-300 rounded"
        />
        
        <input
          type="date"
          value={filtroCompras.fechaFin}
          onChange={(e) => {
            setFiltroCompras(prev => ({ ...prev, fechaFin: e.target.value }));
            setPaginacionCompras(prev => ({ ...prev, paginaActual: 1 }));
          }}
          className="px-3 py-2 border border-gray-300 rounded"
        />
      </div>
      
      <div className="mt-3 flex justify-between items-center text-sm text-gray-600">
        <span>
          Mostrando {obtenerComprasFiltradas().length} de {cuentasPorPagar.length} compras
        </span>
        <select
          value={paginacionCompras.itemsPorPagina}
          onChange={(e) => setPaginacionCompras(prev => ({ 
            ...prev, 
            itemsPorPagina: parseInt(e.target.value),
            paginaActual: 1 
          }))}
          className="px-2 py-1 border border-gray-300 rounded text-sm"
        >
          <option value={25}>25 por página</option>
          <option value={50}>50 por página</option>
          <option value={100}>100 por página</option>
        </select>
      </div>
    </div>
  );

  // === COMPONENTE DE CONTROLES ===
  const ControlesPrincipales = () => (
    <div className="mb-6 flex flex-wrap gap-4">
      <button
        onClick={cargarTodosDatos}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Cargando...' : 'Actualizar Todo'}
      </button>

      <button
        onClick={cargarSolo2025}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        <Calendar size={16} />
        Solo 2025 (Rápido)
      </button>

      {errors.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg">
          <AlertCircle size={16} />
          {errors.length} error(es)
        </div>
      )}
    </div>
  );

  // === COMPONENTE DE ESTADÍSTICAS ===
  const EstadisticasGenerales = () => {
    const totalSaldos = saldosBancarios.reduce((sum, cuenta) => sum + (cuenta.saldoCalculado || 0), 0);
    const totalPorCobrar = cuentasPorCobrar.reduce((sum, cuenta) => sum + (cuenta.saldo || 0), 0);
    const totalPorPagar = cuentasPorPagar.reduce((sum, cuenta) => sum + (cuenta.monto || 0), 0);

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <Wallet className="text-blue-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Saldos Bancarios</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalSaldos)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Por Cobrar</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalPorCobrar)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertCircle className="text-red-600" size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Por Pagar</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalPorPagar)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // === COMPONENTE DE PAGINACIÓN ===
  const ComponentePaginacion = ({ paginacion, setPaginacion, totalPaginas, nombre }) => {
    const paginasAMostrar = [];
    const maxPaginas = 5;
    
    let inicio = Math.max(1, paginacion.paginaActual - Math.floor(maxPaginas / 2));
    let fin = Math.min(totalPaginas, inicio + maxPaginas - 1);
    
    if (fin - inicio + 1 < maxPaginas) {
      inicio = Math.max(1, fin - maxPaginas + 1);
    }
    
    for (let i = inicio; i <= fin; i++) {
      paginasAMostrar.push(i);
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
        <div className="text-sm text-gray-700">
          Mostrando {((paginacion.paginaActual - 1) * paginacion.itemsPorPagina) + 1} a{' '}
          {Math.min(paginacion.paginaActual * paginacion.itemsPorPagina, 
                   nombre === 'compras' ? obtenerComprasFiltradas().length : cuentasPorCobrar.length)} de{' '}
          {nombre === 'compras' ? obtenerComprasFiltradas().length : cuentasPorCobrar.length} resultados
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPaginacion(prev => ({ ...prev, paginaActual: Math.max(1, paginacion.paginaActual - 1) }))}
            disabled={paginacion.paginaActual === 1}
            className="px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          
          {paginasAMostrar.map(numeroPagina => (
            <button
              key={numeroPagina}
              onClick={() => setPaginacion(prev => ({ ...prev, paginaActual: numeroPagina }))}
              className={`px-3 py-1 border rounded-md ${
                paginacion.paginaActual === numeroPagina
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              {numeroPagina}
            </button>
          ))}
          
          <button
            onClick={() => setPaginacion(prev => ({ ...prev, paginaActual: Math.min(totalPaginas, paginacion.paginaActual + 1) }))}
            disabled={paginacion.paginaActual === totalPaginas}
            className="px-3 py-1 border rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  // === RENDER PRINCIPAL ===
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Financiero</h1>
          <p className="mt-2 text-gray-600">
            Gestión integral de facturas, saldos y flujo de caja con herramientas de debugging
          </p>
        </div>

        {/* ✅ NAVEGACIÓN DE PESTAÑAS */}
        <TabNavigation />

        {/* ✅ CONTENIDO SEGÚN PESTAÑA ACTIVA */}
        {pestanaActiva === 'dashboard' && (
          <>
            <ControlesPrincipales />
            <EstadisticasGenerales />

            {/* Saldos Bancarios */}
            <div className="bg-white rounded-lg shadow-md mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Saldos Bancarios</h2>
              </div>
              <div className="p-6">
                {saldosBancarios.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banco</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Actualización</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {saldosBancarios.map((cuenta, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {cuenta.nombre || cuenta.numeroCuenta}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {cuenta.banco}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(cuenta.saldoCalculado || cuenta.saldo)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {cuenta.ultimaActualizacion ? new Date(cuenta.ultimaActualizacion).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No hay datos de saldos bancarios disponibles.</p>
                )}
              </div>
            </div>

            {/* Cuentas por Pagar */}
            <div className="bg-white rounded-lg shadow-md mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Cuentas por Pagar</h2>
              </div>
              <div className="p-6">
                <FiltrosCompras />
                
                {cuentasPorPagar.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folio</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {obtenerComprasPaginadas().map((compra, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {compra.folio}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {compra.razonSocial}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {compra.fecha}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  compra.estado === 'Pagado' ? 'bg-green-100 text-green-800' :
                                  compra.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                  compra.estado === 'Aceptado' ? 'bg-blue-100 text-blue-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {compra.estado}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(compra.montoTotal)}
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

            {/* Cuentas por Cobrar */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Cuentas por Cobrar</h2>
              </div>
              <div className="p-6">
                {cuentasPorCobrar.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folio</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {obtenerCobrarPaginadas().map((cuenta, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {cuenta.folio}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {cuenta.cliente}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {cuenta.fechaEmision}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {cuenta.fechaVencimiento || 'N/A'}
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
          </>
        )}

        {/* ✅ PESTAÑA DEL DEBUGGER */}
        {pestanaActiva === 'debugger' && (
          <ChipaxComprasDebugger />
        )}
      </div>
    </div>
  );
};

export default DashboardFinancieroIntegrado;
