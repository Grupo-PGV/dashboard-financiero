// DashboardFinancieroIntegrado.jsx - VERSIÓN CORREGIDA COMPLETA

import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Wallet, PieChart, TrendingUp, 
  RefreshCw, CheckCircle, Clock, ChevronLeft, ChevronRight,
  Database, Search
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

  // Estados para paginación
  const [paginacionCompras, setPaginacionCompras] = useState({
    paginaActual: 1,
    itemsPorPagina: 50
  });

  const [paginacionCobrar, setPaginacionCobrar] = useState({
    paginaActual: 1,
    itemsPorPagina: 50
  });

  // Estado para mostrar el explorador
  const [mostrarExplorador, setMostrarExplorador] = useState(false);

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

  // Carga secuencial
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

  // Funciones de paginación
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

  // Componente de paginación
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

  // === COMPONENTE DEL EXPLORADOR DE ENDPOINTS INTEGRADO ===
  const ExplorerComponent = () => {
    const [exploring, setExploring] = useState(false);
    const [results, setResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);

    // ChipaxService integrado
    const explorerService = {
      tokenCache: {
        token: null,
        expiry: null,
        isRefreshing: false,
        refreshPromise: null
      },

      async getChipaxToken() {
        const API_BASE_URL = process.env.REACT_APP_CHIPAX_API_URL || 'https://api.chipax.com/v2';
        const APP_ID = process.env.REACT_APP_CHIPAX_APP_ID;
        const SECRET_KEY = process.env.REACT_APP_CHIPAX_SECRET_KEY;

        if (this.tokenCache.isRefreshing && this.tokenCache.refreshPromise) {
          return await this.tokenCache.refreshPromise;
        }

        const now = Date.now();
        const tokenMargin = 5 * 60 * 1000;
        
        if (this.tokenCache.token && this.tokenCache.expiry && now < (this.tokenCache.expiry - tokenMargin)) {
          return this.tokenCache.token;
        }

        this.tokenCache.isRefreshing = true;
        this.tokenCache.refreshPromise = this.refreshToken(API_BASE_URL, APP_ID, SECRET_KEY);
        
        try {
          const newToken = await this.tokenCache.refreshPromise;
          return newToken;
        } finally {
          this.tokenCache.isRefreshing = false;
          this.tokenCache.refreshPromise = null;
        }
      },

      async refreshToken(apiUrl, appId, secretKey) {
        try {
          const response = await fetch(`${apiUrl}/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              app_id: appId,
              secret_key: secretKey
            })
          });

          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          const token = data.access_token || data.token || data.jwt || data.accessToken;
          
          if (!token) {
            throw new Error('No se encontró access_token en la respuesta');
          }

          this.tokenCache.token = token;
          this.tokenCache.expiry = Date.now() + (50 * 60 * 1000);
          
          return token;
        } catch (error) {
          this.tokenCache.token = null;
          this.tokenCache.expiry = null;
          throw new Error(`Error de autenticación: ${error.message}`);
        }
      },

      async fetchFromChipax(endpoint) {
        const API_BASE_URL = process.env.REACT_APP_CHIPAX_API_URL || 'https://api.chipax.com/v2';
        
        try {
          const token = await this.getChipaxToken();
          const url = `${API_BASE_URL}${endpoint}`;

          const response = await fetch(url, {
            headers: {
              'Authorization': `JWT ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          return data;
        } catch (error) {
          throw error;
        }
      }
    };

    // Lista de endpoints a probar
    const endpointsToExplore = [
      { path: '/compras', name: 'Compras (actual)', category: 'compras' },
      { path: '/compras?recientes=1', name: 'Compras Recientes', category: 'compras' },
      { path: '/compras?year=2025', name: 'Compras 2025', category: 'compras' },
      { path: '/compras?year=2024', name: 'Compras 2024', category: 'compras' },
      { path: '/dtes', name: 'Todos los DTEs', category: 'dtes' },
      { path: '/dtes?recibidos=1', name: 'DTEs Recibidos', category: 'dtes' },
      { path: '/dtes?tipo=33', name: 'DTEs Tipo 33 (Facturas)', category: 'dtes' },
      { path: '/dtes?tipo=34', name: 'DTEs Tipo 34 (No Afectas)', category: 'dtes' },
      { path: '/dtes?porPagar=1', name: 'DTEs Por Pagar', category: 'dtes' },
      { path: '/documentos-recibidos', name: 'Documentos Recibidos', category: 'documentos' },
      { path: '/facturas-recibidas', name: 'Facturas Recibidas', category: 'documentos' },
      { path: '/facturas', name: 'Facturas', category: 'otros' },
    ];

    const exploreEndpoints = async () => {
      setExploring(true);
      setResults([]);
      setSelectedResult(null);

      const newResults = [];

      for (const endpoint of endpointsToExplore) {
        try {
          console.log(`🔍 Explorando: ${endpoint.path}`);
          
          const startTime = Date.now();
          const data = await explorerService.fetchFromChipax(`${endpoint.path}?limit=5&page=1`);
          const responseTime = Date.now() - startTime;

          let items = [];
          let structure = 'unknown';
          
          if (Array.isArray(data)) {
            items = data;
            structure = 'array';
          } else if (data && data.items && Array.isArray(data.items)) {
            items = data.items;
            structure = 'object_with_items';
          } else if (data && data.data && Array.isArray(data.data)) {
            items = data.data;
            structure = 'object_with_data';
          }

          let fechaAnalysis = null;
          if (items.length > 0) {
            const primeraFecha = items[0];
            fechaAnalysis = {
              fechaEmision: primeraFecha.fechaEmision || primeraFecha.fecha_emision,
              fechaRecepcion: primeraFecha.fechaRecepcion || primeraFecha.fecha_recepcion,
              created: primeraFecha.created,
              modified: primeraFecha.modified,
              campos: Object.keys(primeraFecha).filter(key => 
                key.toLowerCase().includes('fecha') || 
                key.toLowerCase().includes('date') ||
                key.toLowerCase().includes('created') ||
                key.toLowerCase().includes('modified')
              )
            };
          }

          newResults.push({
            endpoint: endpoint.path,
            name: endpoint.name,
            category: endpoint.category,
            status: 'success',
            responseTime,
            itemCount: items.length,
            structure,
            fechaAnalysis,
            sampleData: items.slice(0, 2),
            fullResponse: data
          });

          console.log(`✅ ${endpoint.path}: ${items.length} items, ${responseTime}ms`);

        } catch (error) {
          newResults.push({
            endpoint: endpoint.path,
            name: endpoint.name,
            category: endpoint.category,
            status: 'error',
            error: error.message
          });
          
          console.log(`❌ ${endpoint.path}: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Ordenar resultados
      newResults.sort((a, b) => {
        if (a.status === 'success' && b.status === 'error') return -1;
        if (a.status === 'error' && b.status === 'success') return 1;
        
        if (a.status === 'success' && b.status === 'success') {
          if (a.itemCount !== b.itemCount) {
            return b.itemCount - a.itemCount;
          }
          
          const fechaA = a.fechaAnalysis?.fechaEmision || a.fechaAnalysis?.created || '2000-01-01';
          const fechaB = b.fechaAnalysis?.fechaEmision || b.fechaAnalysis?.created || '2000-01-01';
          return new Date(fechaB) - new Date(fechaA);
        }
        
        return 0;
      });

      setResults(newResults);
      setExploring(false);
    };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'success':
          return <CheckCircle className="w-4 h-4 text-green-500" />;
        case 'error':
          return <AlertCircle className="w-4 h-4 text-red-500" />;
        default:
          return <RefreshCw className="w-4 h-4 text-gray-400" />;
      }
    };

    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        return new Date(dateStr).toLocaleDateString('es-CL');
      } catch {
        return dateStr;
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-600" />
                Explorador de Endpoints
              </h2>
              <p className="text-gray-600 mt-1">
                Encuentra el endpoint con facturas recientes
              </p>
            </div>
            
            <button
              onClick={exploreEndpoints}
              disabled={exploring}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              <Search className={`w-4 h-4 mr-2 ${exploring ? 'animate-spin' : ''}`} />
              {exploring ? 'Explorando...' : 'Explorar'}
            </button>
          </div>

          {exploring && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <RefreshCw className="w-5 h-5 text-blue-500 mr-2 animate-spin" />
                <span className="text-blue-700">
                  Explorando {endpointsToExplore.length} endpoints...
                </span>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Resultados</h3>
                
                {results.slice(0, 8).map((result, index) => (
                  <div
                    key={result.endpoint}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedResult?.endpoint === result.endpoint
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedResult(result)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(result.status)}
                          <span className="font-medium text-gray-900">{result.name}</span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{result.endpoint}</p>
                        
                        {result.status === 'success' ? (
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>📊 {result.itemCount} items</p>
                            {result.fechaAnalysis?.fechaEmision && (
                              <p>📅 {formatDate(result.fechaAnalysis.fechaEmision)}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-red-600">❌ {result.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedResult && selectedResult.status === 'success' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Detalles: {selectedResult.name}
                  </h3>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Información</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-600">Items:</span> {selectedResult.itemCount}</p>
                      <p><span className="text-gray-600">Estructura:</span> {selectedResult.structure}</p>
                      <p><span className="text-gray-600">Tiempo:</span> {selectedResult.responseTime}ms</p>
                    </div>
                  </div>

                  {selectedResult.fechaAnalysis && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Fechas</h4>
                      <div className="text-sm space-y-1">
                        {selectedResult.fechaAnalysis.fechaEmision && (
                          <p><span className="text-gray-600">Emisión:</span> {formatDate(selectedResult.fechaAnalysis.fechaEmision)}</p>
                        )}
                        {selectedResult.fechaAnalysis.fechaRecepcion && (
                          <p><span className="text-gray-600">Recepción:</span> {formatDate(selectedResult.fechaAnalysis.fechaRecepcion)}</p>
                        )}
                        {selectedResult.fechaAnalysis.created && (
                          <p><span className="text-gray-600">Created:</span> {formatDate(selectedResult.fechaAnalysis.created)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">💡 Evaluación</h4>
                    <div className="text-sm text-blue-800">
                      {selectedResult.itemCount === 0 ? (
                        <p>❌ Sin datos útiles</p>
                      ) : selectedResult.fechaAnalysis?.fechaEmision ? (
                        new Date(selectedResult.fechaAnalysis.fechaEmision) > new Date('2024-01-01') ? (
                          <p>✅ ¡Excelente! Datos recientes (2024+)</p>
                        ) : (
                          <p>⚠️ Datos antiguos (pre-2024)</p>
                        )
                      ) : (
                        <p>⚠️ Sin análisis de fechas</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
        <div className="flex space-x-3">
          <button
            onClick={() => setMostrarExplorador(!mostrarExplorador)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            <Database className="w-4 h-4 mr-2" />
            {mostrarExplorador ? 'Ocultar Explorador' : 'Explorar Endpoints'}
          </button>
          <button
            onClick={cargarTodosLosDatos}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Cargando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Explorador de Endpoints */}
      {mostrarExplorador && (
        <div className="mb-8">
          <ExplorerComponent />
        </div>
      )}

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
