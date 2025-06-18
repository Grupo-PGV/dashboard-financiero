// DashboardFinancieroIntegrado.jsx - VERSIÓN CORREGIDA PARA NETLIFY
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

  const cargarSolo2025 = async () => {
    try {
      setLoading(true);
      console.log('🚀 Cargando SOLO facturas de 2025...');
      
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
        compra.folio.toString().toLowerCase().includes(filtroCompras.folioFiltro.toLowerCase())
      );
    }

    if (filtroCompras.fechaInicio && filtroCompras.fechaFin) {
      comprasFiltradas = filtrarComprasPorFecha(comprasFiltradas, filtroCompras.fechaInicio, filtroCompras.fechaFin);
    }

    return comprasFiltradas;
  };

  const obtenerComprasPaginadas = () => {
    const filtradas = obtenerComprasFiltradas();
    const inicio = (paginacionCompras.paginaActual - 1) * paginacionCompras.itemsPorPagina;
    const fin = inicio + paginacionCompras.itemsPorPagina;
    return filtradas.slice(inicio, fin);
  };

  const obtenerCobrarPaginadas = () => {
    const inicio = (paginacionCobrar.paginaActual - 1) * paginacionCobrar.itemsPorPagina;
    const fin = inicio + paginacionCobrar.itemsPorPagina;
    return cuentasPorCobrar.slice(inicio, fin);
  };

  const getTotalPaginasCompras = () => {
    return Math.ceil(obtenerComprasFiltradas().length / paginacionCompras.itemsPorPagina);
  };

  const getTotalPaginasCobrar = () => {
    return Math.ceil(cuentasPorCobrar.length / paginacionCobrar.itemsPorPagina);
  };

  // === FUNCIONES DE UTILIDAD ===
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // === COMPONENTES ===
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
          {nombre === 'compras' ? obtenerComprasFiltradas().length : cuentasPorCobrar.length} registros
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaginacion(prev => ({ ...prev, paginaActual: 1 }))}
            disabled={paginacion.paginaActual === 1}
            className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          
          {paginasAMostrar.map(pagina => (
            <button
              key={pagina}
              onClick={() => setPaginacion(prev => ({ ...prev, paginaActual: pagina }))}
              className={`px-3 py-1 text-sm rounded ${
                pagina === paginacion.paginaActual
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {pagina}
            </button>
          ))}
          
          <button
            onClick={() => setPaginacion(prev => ({ ...prev, paginaActual: totalPaginas }))}
            disabled={paginacion.paginaActual === totalPaginas}
            className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

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

  const TablaCompras = () => (
    <div className="bg-white rounded-lg shadow-md">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Cuentas por Pagar</h2>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Buscar por folio..."
              value={filtroCompras.folioFiltro}
              onChange={(e) => setFiltroCompras(prev => ({ ...prev, folioFiltro: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filtroCompras.soloNoPagadas}
                onChange={(e) => setFiltroCompras(prev => ({ ...prev, soloNoPagadas: e.target.checked }))}
              />
              Solo no pagadas
            </label>
          </div>
        </div>
      </div>
      <div className="p-6">
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
                        {compra.proveedor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {compra.fecha}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          compra.estado === 'Pagado Realmente' ? 'bg-green-100 text-green-800' :
                          compra.estado === 'Pendiente Aprobación' ? 'bg-orange-100 text-orange-800' :
                          compra.estado === 'Aceptado' ? 'bg-blue-100 text-blue-800' :
                          compra.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
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
  );

  const TablaCobrar = () => (
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
              Debugger
            </button>
          </div>
        </div>

        {/* Errores */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-red-500" size={20} />
              <h3 className="font-semibold text-red-700">Errores de Carga</h3>
            </div>
            <ul className="text-sm text-red-600 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Contenido según pestaña activa */}
        {pestanaActiva === 'dashboard' && (
          <>
            <ControlesPrincipales />
            <EstadisticasGenerales />
            
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
