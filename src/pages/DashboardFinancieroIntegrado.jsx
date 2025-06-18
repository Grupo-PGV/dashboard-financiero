// DashboardFinancieroIntegrado.jsx - CON PAGINACIÓN COMPLETA

import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Wallet, PieChart, TrendingUp, 
  RefreshCw, CheckCircle, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';

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
    soloNoPagadas: true,
    fechaInicio: '',
    fechaFin: '',
    folioFiltro: ''
  });

  // ✅ ESTADOS PARA PAGINACIÓN
  const [paginacionCompras, setPaginacionCompras] = useState({
    paginaActual: 1,
    itemsPorPagina: 50
  });

  const [paginacionCobrar, setPaginacionCobrar] = useState({
    paginaActual: 1,
    itemsPorPagina: 50
  });

  // === FUNCIONES DE CARGA SECUENCIAL ===

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
        const dtesAdaptados = adaptarCuentasPorCobrar(dtes);
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
    try {
      console.log('💸 Cargando cuentas por pagar...');
      const compras = await chipaxService.obtenerCuentasPorPagar();
      
      if (Array.isArray(compras)) {
        const comprasAdaptadas = adaptarCuentasPorPagar(compras);
        
        console.log(`✅ ${comprasAdaptadas.length} cuentas por pagar cargadas`);
        
        setCuentasPorPagar(comprasAdaptadas);
        // Reset paginación al cargar nuevos datos
        setPaginacionCompras(prev => ({ ...prev, paginaActual: 1 }));
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

  // ✅ CARGA SECUENCIAL
  const cargarTodosLosDatos = async () => {
    setLoading(true);
    setErrors([]);
    
    console.log('🚀 Iniciando carga completa del dashboard...');
    
    try {
      console.log('🏦 === PASO 1: Saldos bancarios ===');
      await cargarSaldosBancarios();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('📋 === PASO 2: Cuentas por cobrar ===');
      await cargarCuentasPorCobrar();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('💸 === PASO 3: Cuentas por pagar ===');
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
    
    if (filtroCompras.soloNoPagadas) {
      comprasFiltradas = filtrarComprasPendientes(comprasFiltradas);
    }
    
    if (filtroCompras.fechaInicio && filtroCompras.fechaFin) {
      comprasFiltradas = filtrarComprasPorFecha(
        comprasFiltradas, 
        filtroCompras.fechaInicio, 
        filtroCompras.fechaFin
      );
    }
    
    if (filtroCompras.folioFiltro.trim()) {
      comprasFiltradas = comprasFiltradas.filter(compra => 
        compra.folio.toString().includes(filtroCompras.folioFiltro.trim())
      );
    }
    
    return comprasFiltradas;
  };

  // ✅ FUNCIONES DE PAGINACIÓN

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

  // === COMPONENTE DE FILTROS ===
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
              setPaginacionCompras(prev => ({ ...prev, paginaActual: 1 })); // Reset página
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
            setPaginacionCompras(prev => ({ ...prev, paginaActual: 1 })); // Reset página
          }}
          className="px-3 py-2 border border-gray-300 rounded"
        />
        
        <input
          type="date"
          value={filtroCompras.fechaInicio}
          onChange={(e) => {
            setFiltroCompras(prev => ({ ...prev, fechaInicio: e.target.value }));
            setPaginacionCompras(prev => ({ ...prev, paginaActual: 1 })); // Reset página
          }}
          className="px-3 py-2 border border-gray-300 rounded"
        />
        
        <input
          type="date"
          value={filtroCompras.fechaFin}
          onChange={(e) => {
            setFiltroCompras(prev => ({ ...prev, fechaFin: e.target.value }));
            setPaginacionCompras(prev => ({ ...prev, paginaActual: 1 })); // Reset página
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

  // ✅ COMPONENTE DE PAGINACIÓN
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
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setPaginacion(prev => ({ ...prev, paginaActual: prev.paginaActual - 1 }))}
            disabled={paginacion.paginaActual === 1}
            className="p-2 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={18} />
          </button>
          
          {paginasAMostrar.map(pagina => (
            <button
              key={pagina}
              onClick={() => setPaginacion(prev => ({ ...prev, paginaActual: pagina }))}
              className={`px-3 py-1 rounded text-sm ${
                paginacion.paginaActual === pagina
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {pagina}
            </button>
          ))}
          
          <button
            onClick={() => setPaginacion(prev => ({ ...prev, paginaActual: prev.paginaActual + 1 }))}
            disabled={paginacion.paginaActual === totalPaginas}
            className="p-2 rounded text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

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

      {/* Indicador de carga */}
      {loading && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <RefreshCw className="w-5 h-5 text-blue-500 mr-2 animate-spin" />
            <p className="text-blue-700">Cargando datos financieros...</p>
          </div>
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

      {/* Sección de Cuentas por Pagar CON PAGINACIÓN */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Cuentas por Pagar 
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Total cargadas: {cuentasPorPagar.length})
            </span>
          </h2>
        </div>
        
        <div className="p-6">
          <FiltrosCompras />
        </div>
        
        {obtenerComprasFiltradas().length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Pago</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {obtenerComprasPaginadas().map((compra) => (
                    <tr key={compra.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{compra.folio}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{compra.razonSocial}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{compra.fecha}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {compra.fechaPago ? compra.fechaPago : 'Sin pagar'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(compra.montoTotal)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
            
            <ComponentePaginacion 
              paginacion={paginacionCompras}
              setPaginacion={setPaginacionCompras}
              totalPaginas={getTotalPaginasCompras()}
              nombre="compras"
            />
          </>
        ) : (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay compras que coincidan con los filtros</p>
          </div>
        )}
      </div>

      {/* Sección de Cuentas por Cobrar CON PAGINACIÓN */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            Cuentas por Cobrar Pendientes
            <span className="text-sm font-normal text-gray-500 ml-2">
              (Total: {cuentasPorCobrar.length})
            </span>
          </h2>
        </div>
        
        {cuentasPorCobrar.length > 0 ? (
          <>
            <div className="p-6 border-b">
              <div className="flex justify-end">
                <select
                  value={paginacionCobrar.itemsPorPagina}
                  onChange={(e) => setPaginacionCobrar(prev => ({ 
                    ...prev, 
                    itemsPorPagina: parseInt(e.target.value),
                    paginaActual: 1 
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Folio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto Pendiente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {obtenerCobrarPaginadas().map((cuenta) => (
                    <tr key={cuenta.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cuenta.folio}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cuenta.razonSocial}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cuenta.fecha}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cuenta.fechaVencimiento || 'Sin fecha'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(cuenta.monto)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {cuenta.estado}
                        </span>
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
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No hay cuentas por cobrar pendientes</p>
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
            <p>Página actual compras: {paginacionCompras.paginaActual}/{getTotalPaginasCompras()}</p>
            <p>Página actual cobrar: {paginacionCobrar.paginaActual}/{getTotalPaginasCobrar()}</p>
            <p>Errores: {errors.length}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardFinancieroIntegrado;
