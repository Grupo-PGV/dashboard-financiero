// DashboardFinancieroIntegrado.jsx - VERSIÓN FINAL CORREGIDA
import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Calendar, Wallet, PieChart, TrendingUp, 
  RefreshCw, CheckCircle, Clock, ChevronLeft, ChevronRight,
  Database, Search, Bug
} from 'lucide-react';

import chipaxService from '../services/chipaxService';
import ChipaxComprasDebugger from '../components/ChipaxComprasDebugger';
import ChipaxSaldosExplorer from '../components/ChipaxSaldosExplorer';
import { 
  adaptarCuentasPorCobrar, 
  adaptarCuentasPorPagar,
  filtrarComprasPendientes,
  filtrarComprasPorFecha 
} from '../services/chipaxAdapter';
import SaldosCuentasCorrientes from '../components/SaldosCuentasCorrientes';

const DashboardFinancieroIntegrado = () => {
  // Estados principales
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [pestanaActiva, setPestanaActiva] = useState('saldos');
  
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

  // === FUNCIONES DE CARGA CORREGIDAS ===
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

  // ✅ FUNCIÓN CORREGIDA: cargarCuentasPorPagar
  const cargarCuentasPorPagar = async () => {
    try {
      console.log('💸 Cargando cuentas por pagar...');
      const compras = await chipaxService.obtenerCuentasPorPagar();
      
      console.log('🔧 DEBUG RESPUESTA DEL SERVICIO:');
      console.log(`📊 Tipo: ${typeof compras}`);
      console.log(`📊 Es array: ${Array.isArray(compras)}`);
      console.log(`📊 Longitud: ${compras ? compras.length : 'undefined'}`);
      
      if (Array.isArray(compras) && compras.length > 0) {
        // ✅ NO FILTRAR por año todavía, usar todas las facturas que encontramos
        console.log('📋 Procesando facturas encontradas...');
        console.log('📋 Muestra de fechas encontradas:');
        compras.slice(0, 5).forEach((compra, i) => {
          const fechaEmision = compra.fechaEmision || compra.fecha_emision || 'Sin fecha';
          console.log(`  ${i + 1}. Folio ${compra.folio}: ${fechaEmision} - ${compra.razonSocial}`);
        });
        
        const cuentasAdaptadas = adaptarCuentasPorPagar(compras);
        setCuentasPorPagar(cuentasAdaptadas);
        console.log(`✅ ${cuentasAdaptadas.length} facturas cargadas y adaptadas`);
        
        // ✅ Mostrar análisis por año
        const porAño = {};
        cuentasAdaptadas.forEach(cuenta => {
          const año = new Date(cuenta.fecha).getFullYear();
          porAño[año] = (porAño[año] || 0) + 1;
        });
        
        console.log('📊 DISTRIBUCIÓN POR AÑO:');
        Object.entries(porAño)
          .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
          .forEach(([año, cantidad]) => {
            console.log(`   ${año}: ${cantidad} facturas`);
          });
        
      } else {
        console.warn('⚠️ No se recibieron facturas del servicio');
        setCuentasPorPagar([]);
      }
    } catch (error) {
      console.error('❌ Error cargando cuentas por pagar:', error);
      setCuentasPorPagar([]);
      setErrors(prev => [...prev, `Cuentas por pagar: ${error.message}`]);
    }
  };

  // ✅ NUEVA FUNCIÓN: Cargar facturas recientes
  const cargarFacturasRecientes = async () => {
    try {
      setLoading(true);
      setErrors([]);
      console.log('🚀 Cargando facturas más recientes...');
      
      const compras = await chipaxService.obtenerCuentasPorPagar();
      
      if (Array.isArray(compras) && compras.length > 0) {
        // Buscar las facturas más recientes (últimos 6 meses)
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
        
        const facturasRecientes = compras.filter(compra => {
          const fechaEmision = new Date(compra.fechaEmision || compra.fecha_emision || '1900-01-01');
          return fechaEmision >= seisMesesAtras;
        });
        
        console.log(`📊 Encontradas ${facturasRecientes.length} facturas de los últimos 6 meses`);
        
        if (facturasRecientes.length > 0) {
          const cuentasAdaptadas = adaptarCuentasPorPagar(facturasRecientes);
          setCuentasPorPagar(cuentasAdaptadas);
          console.log(`✅ ${cuentasAdaptadas.length} facturas recientes cargadas`);
          
          // Mostrar las 5 más recientes
          console.log('📋 LAS 5 FACTURAS MÁS RECIENTES ENCONTRADAS:');
          cuentasAdaptadas
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
            .slice(0, 5)
            .forEach((factura, i) => {
              const diasHace = Math.floor((new Date() - new Date(factura.fecha)) / (1000 * 60 * 60 * 24));
              console.log(`  ${i + 1}. Folio ${factura.folio}: ${factura.fecha} (hace ${diasHace} días) - ${factura.proveedor}`);
            });
        } else {
          console.log('📊 Usando todas las facturas disponibles (no hay facturas recientes)');
          const cuentasAdaptadas = adaptarCuentasPorPagar(compras);
          setCuentasPorPagar(cuentasAdaptadas);
        }
      } else {
        console.warn('⚠️ No se recibieron facturas del servicio');
        setCuentasPorPagar([]);
      }
    } catch (error) {
      console.error('❌ Error cargando facturas recientes:', error);
      setErrors(prev => [...prev, `Facturas recientes: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN MODIFICADA: cargarFacturasPorAño
  const cargarFacturasPorAño = async (año = 2025) => {
    try {
      setLoading(true);
      setErrors([]);
      console.log(`🚀 Buscando facturas del año ${año}...`);
      
      const compras = await chipaxService.obtenerCuentasPorPagar();
      
      if (Array.isArray(compras)) {
        // Filtrar por año específico
        const comprasDelAño = compras.filter(compra => {
          const fecha = compra.fechaEmision || compra.fecha_emision || compra.fecha || '';
          return fecha.includes(año.toString());
        });
        
        console.log(`📊 Encontradas ${comprasDelAño.length} facturas del año ${año}`);
        
        if (comprasDelAño.length > 0) {
          const cuentasAdaptadas = adaptarCuentasPorPagar(comprasDelAño);
          setCuentasPorPagar(cuentasAdaptadas);
          console.log(`✅ ${cuentasAdaptadas.length} facturas del ${año} cargadas`);
        } else {
          console.log(`⚠️ No se encontraron facturas del año ${año}`);
          console.log('🔍 Probando con facturas recientes...');
          await cargarFacturasRecientes();
        }
      }
    } catch (error) {
      console.error(`❌ Error cargando facturas del ${año}:`, error);
      setErrors(prev => [...prev, `Facturas ${año}: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN RENOMBRADA: cargarSolo2025 ahora llama a cargarFacturasPorAño
  const cargarSolo2025 = async () => {
    await cargarFacturasPorAño(2025);
  };

  // ✅ FUNCIONES ESPECÍFICAS para cada módulo
  const cargarSoloSaldos = async () => {
    try {
      setLoading(true);
      console.log('🏦 Cargando solo saldos bancarios...');
      await cargarSaldosBancarios();
    } catch (error) {
      console.error('❌ Error cargando saldos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarSoloCuentasPorCobrar = async () => {
    try {
      setLoading(true);
      console.log('📋 Cargando solo cuentas por cobrar...');
      await cargarCuentasPorCobrar();
    } catch (error) {
      console.error('❌ Error cargando cuentas por cobrar:', error);
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

  // Carga inicial - SOLO verificar conectividad
  useEffect(() => {
    verificarConectividad();
  }, []);

  // ✅ NUEVA FUNCIÓN: Solo verificar que la API funciona
  const verificarConectividad = async () => {
    try {
      setLoading(true);
      setErrors([]);
      console.log('🔍 Verificando conectividad con Chipax...');
      
      // Solo hacer login para verificar que la API responde
      await chipaxService.getChipaxToken();
      
      console.log('✅ Conectividad con Chipax verificada');
      setErrors([]);
    } catch (error) {
      console.error('❌ Error de conectividad:', error);
      
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        setErrors(['⚠️ Error de CORS detectado. La API funciona pero requiere configuración especial desde navegador.']);
      } else {
        setErrors([`❌ Error de conectividad: ${error.message}`]);
      }
    } finally {
      setLoading(false);
    }
  };

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
          {nombre === 'compras' ? obtenerComprasFiltradas().length : cuentasPorCobrar.length} resultados
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPaginacion(prev => ({ ...prev, paginaActual: Math.max(1, prev.paginaActual - 1) }))}
            disabled={paginacion.paginaActual === 1}
            className="px-2 py-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <ChevronLeft size={16} />
          </button>
          
          {paginasAMostrar.map(pagina => (
            <button
              key={pagina}
              onClick={() => setPaginacion(prev => ({ ...prev, paginaActual: pagina }))}
              className={`px-3 py-1 rounded text-sm ${
                paginacion.paginaActual === pagina
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

  // ✅ CONTROLES PRINCIPALES MODIFICADOS con botones adicionales
  const ControlesPrincipales = () => (
    <div className="mb-6">
      {/* Primera fila de botones principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Botón Cuentas por Pagar */}
        <button
          onClick={cargarSolo2025}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <AlertCircle size={16} />
          <div className="text-left">
            <div className="text-sm font-medium">Cuentas por Pagar</div>
            <div className="text-xs opacity-90">Facturas 2025</div>
          </div>
        </button>

        {/* Botón Cuentas por Cobrar */}
        <button
          onClick={cargarSoloCuentasPorCobrar}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <TrendingUp size={16} />
          <div className="text-left">
            <div className="text-sm font-medium">Cuentas por Cobrar</div>
            <div className="text-xs opacity-90">Facturas pendientes</div>
          </div>
        </button>

        {/* Botón Saldos Bancarios */}
        <button
          onClick={cargarSoloSaldos}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Wallet size={16} />
          <div className="text-left">
            <div className="text-sm font-medium">Saldos Bancarios</div>
            <div className="text-xs opacity-90">Cuentas corrientes</div>
          </div>
        </button>

        {/* Botón Cargar Todo */}
        <button
          onClick={cargarTodosDatos}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <div className="text-left">
            <div className="text-sm font-medium">Cargar Todo</div>
            <div className="text-xs opacity-90">Proceso completo</div>
          </div>
        </button>
      </div>

      {/* ✅ SEGUNDA FILA DE BOTONES NUEVOS */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={cargarFacturasRecientes}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          <Clock size={16} className="inline mr-2" />
          Cargar Facturas Recientes (6 meses)
        </button>
        
        <button
          onClick={() => cargarFacturasPorAño(2025)}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          <Calendar size={16} className="inline mr-2" />
          Buscar Facturas 2025
        </button>
        
        <button
          onClick={() => cargarFacturasPorAño(2024)}
          disabled={loading}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          <Calendar size={16} className="inline mr-2" />
          Cargar Facturas 2024
        </button>
        
        <button
          onClick={cargarCuentasPorPagar}
          disabled={loading}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:opacity-50"
        >
          <Database size={16} className="inline mr-2" />
          Cargar Todas las Facturas
        </button>
      </div>
      
      {/* ✅ INFORMACIÓN DE LAS FACTURAS CARGADAS */}
      {cuentasPorPagar.length > 0 && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded mb-4">
          <strong>📊 Facturas cargadas:</strong> {cuentasPorPagar.length} facturas
          {cuentasPorPagar.length > 0 && (
            <>
              <br />
              <strong>📅 Rango de fechas:</strong> {
                (() => {
                  const fechas = cuentasPorPagar.map(c => new Date(c.fecha)).sort((a, b) => a - b);
                  const primera = fechas[0].toISOString().split('T')[0];
                  const ultima = fechas[fechas.length - 1].toISOString().split('T')[0];
                  return `${primera} → ${ultima}`;
                })()
              }
            </>
          )}
        </div>
      )}

      {/* Estado de conectividad */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {loading ? (
            <>
              <RefreshCw className="animate-spin text-blue-500" size={16} />
              <span className="text-sm text-blue-600">Cargando...</span>
            </>
          ) : errors.length === 0 ? (
            <>
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-sm text-green-600">✅ API Chipax conectada</span>
            </>
          ) : (
            <>
              <AlertCircle className="text-red-500" size={16} />
              <span className="text-sm text-red-600">⚠️ Verificar conectividad</span>
            </>
          )}
        </div>

        <button
          onClick={verificarConectividad}
          disabled={loading}
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Verificar conexión
        </button>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-sm text-red-600">
            {errors.map((error, index) => (
              <div key={index}>• {error}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const EstadisticasGenerales = () => {
    const totalSaldos = saldosBancarios.reduce((sum, cuenta) => sum + (cuenta.saldoCalculado || 0), 0);
    
    // ✅ CORRECCIÓN: Sumar correctamente las cuentas por cobrar
    const totalPorCobrar = cuentasPorCobrar.reduce((sum, cuenta) => sum + (cuenta.saldo || cuenta.monto || 0), 0);
    
    // Total de facturas cargadas
    const totalPorPagar = cuentasPorPagar.reduce((sum, cuenta) => sum + (cuenta.monto || 0), 0);
    
    // Información sobre el filtro activo
    const facturas2025 = cuentasPorPagar.filter(c => new Date(c.fecha).getFullYear() === 2025);
    const añoMostrado = facturas2025.length === cuentasPorPagar.length ? '2025' : 'Múltiples años';

    return (
      <div className="space-y-4">
        {/* Indicador de datos cargados */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Wallet className="text-blue-600" size={16} />
              <span className="text-blue-800">
                Saldos: {saldosBancarios.length > 0 ? `${saldosBancarios.length} cuentas` : 'Sin cargar'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={16} />
              <span className="text-blue-800">
                Por Cobrar: {cuentasPorCobrar.length > 0 ? `${cuentasPorCobrar.length} facturas` : 'Sin cargar'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="text-blue-600" size={16} />
              <span className="text-blue-800">
                Por Pagar: {cuentasPorPagar.length > 0 ? `${cuentasPorPagar.length} facturas ${añoMostrado}` : 'Sin cargar'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Wallet className="text-blue-600" size={24} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Saldos Bancarios</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {saldosBancarios.length > 0 ? formatCurrency(totalSaldos) : 'Sin datos'}
                </p>
                {saldosBancarios.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {saldosBancarios.length} cuentas
                  </p>
                )}
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
                <p className="text-2xl font-semibold text-gray-900">
                  {cuentasPorCobrar.length > 0 ? formatCurrency(totalPorCobrar) : 'Sin datos'}
                </p>
                {cuentasPorCobrar.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {cuentasPorCobrar.length} facturas
                  </p>
                )}
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
                <p className="text-2xl font-semibold text-gray-900">
                  {cuentasPorPagar.length > 0 ? formatCurrency(totalPorPagar) : 'Sin datos'}
                </p>
                {cuentasPorPagar.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {cuentasPorPagar.length} facturas {añoMostrado}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ResumenFacturas2025 = () => {
    if (cuentasPorPagar.length === 0) return null;

    const facturas2025 = cuentasPorPagar.filter(c => new Date(c.fecha).getFullYear() === 2025);
    
    if (facturas2025.length === 0) {
      // Mostrar información sobre el año que sí hay facturas
      const añosDisponibles = [...new Set(cuentasPorPagar.map(c => new Date(c.fecha).getFullYear()))]
        .sort((a, b) => b - a);
      
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">📅 Facturas cargadas por año:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {añosDisponibles.map(año => {
              const facturasDel_año = cuentasPorPagar.filter(c => new Date(c.fecha).getFullYear() === año);
              const montoDel_año = facturasDel_año.reduce((sum, c) => sum + (c.monto || 0), 0);
              
              return (
                <div key={año} className="text-center p-2 bg-white rounded">
                  <div className="font-medium text-gray-800">{año}</div>
                  <div className="text-xs text-gray-600">{facturasDel_año.length} facturas</div>
                  <div className="text-xs text-gray-600">{formatCurrency(montoDel_año)}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    const totalMonto2025 = facturas2025.reduce((sum, cuenta) => sum + (cuenta.monto || 0), 0);
    const facturasPendientes = facturas2025.filter(c => c.estado !== 'Pagado' && !c.estaPagado);
    const facturasPagadas = facturas2025.filter(c => c.estado === 'Pagado' || c.estaPagado);

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-green-800 mb-3">📊 Resumen Facturas 2025</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700">{facturas2025.length}</div>
            <div className="text-green-600">Total facturas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-700">{formatCurrency(totalMonto2025)}</div>
            <div className="text-green-600">Monto total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-700">{facturasPendientes.length}</div>
            <div className="text-orange-600">Pendientes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-700">{facturasPagadas.length}</div>
            <div className="text-blue-600">Pagadas</div>
          </div>
        </div>
      </div>
    );
  };

  const TablaCompras = () => {
    const comprasPaginadas = obtenerComprasPaginadas();
    const totalPaginas = getTotalPaginasCompras();

    if (cuentasPorPagar.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Sin facturas de compra</h3>
          <p className="text-gray-500">Haz clic en "Cuentas por Pagar" para cargar las facturas</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">💸 Cuentas por Pagar</h2>
            <div className="text-sm text-gray-600">
              {obtenerComprasFiltradas().length} facturas
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Search size={14} className="inline mr-1" />
                Buscar por folio
              </label>
              <input
                type="text"
                placeholder="Número de folio..."
                value={filtroCompras.folioFiltro}
                onChange={(e) => setFiltroCompras(prev => ({ ...prev, folioFiltro: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha desde</label>
              <input
                type="date"
                value={filtroCompras.fechaInicio}
                onChange={(e) => setFiltroCompras(prev => ({ ...prev, fechaInicio: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha hasta</label>
              <input
                type="date"
                value={filtroCompras.fechaFin}
                onChange={(e) => setFiltroCompras(prev => ({ ...prev, fechaFin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filtroCompras.soloNoPagadas}
                  onChange={(e) => setFiltroCompras(prev => ({ ...prev, soloNoPagadas: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Solo no pagadas</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comprasPaginadas.map((cuenta, index) => (
                <tr key={cuenta.id || index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {cuenta.folio}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={cuenta.proveedor}>
                      {cuenta.proveedor}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {cuenta.fecha}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(cuenta.monto)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      cuenta.estaPagado
                        ? 'bg-green-100 text-green-800'
                        : cuenta.estaAnulado
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {cuenta.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <ComponentePaginacion
            paginacion={paginacionCompras}
            setPaginacion={setPaginacionCompras}
            totalPaginas={totalPaginas}
            nombre="compras"
          />
        )}
      </div>
    );
  };

  const TablaCobrar = () => {
    const cobrarPaginadas = obtenerCobrarPaginadas();
    const totalPaginas = getTotalPaginasCobrar();

    if (cuentasPorCobrar.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Sin facturas por cobrar</h3>
          <p className="text-gray-500">Haz clic en "Cuentas por Cobrar" para cargar las facturas</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">📈 Cuentas por Cobrar</h2>
            <div className="text-sm text-gray-600">
              {cuentasPorCobrar.length} facturas
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cobrarPaginadas.map((cuenta, index) => (
                <tr key={cuenta.id || index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {cuenta.folio}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="max-w-xs truncate" title={cuenta.cliente}>
                      {cuenta.cliente}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {cuenta.fecha}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(cuenta.monto)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(cuenta.saldo)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      cuenta.estaPagado
                        ? 'bg-green-100 text-green-800'
                        : cuenta.estaVencido
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {cuenta.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <ComponentePaginacion
            paginacion={paginacionCobrar}
            setPaginacion={setPaginacionCobrar}
            totalPaginas={totalPaginas}
            nombre="cobrar"
          />
        )}
      </div>
    );
  };

  // === RENDERIZADO PRINCIPAL ===
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header con pestañas */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            📊 Dashboard Financiero Integrado - Chipax
          </h1>
          
          {/* Pestañas de navegación */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setPestanaActiva('dashboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pestanaActiva === 'dashboard'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Dashboard Principal
            </button>
            <button
              onClick={() => setPestanaActiva('saldos')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pestanaActiva === 'saldos'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏦 Explorador Saldos
            </button>
            <button
              onClick={() => setPestanaActiva('debugger')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                pestanaActiva === 'debugger'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔧 Debugger Compras
            </button>
          </div>
        </div>

        {/* Contenido según pestaña activa */}
        {pestanaActiva === 'dashboard' && (
          <>
            <ControlesPrincipales />
            
            {/* Mensaje de ayuda si no hay datos cargados */}
            {saldosBancarios.length === 0 && cuentasPorCobrar.length === 0 && cuentasPorPagar.length === 0 && !loading && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <Database className="text-yellow-600" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      🚀 ¡Bienvenido al Dashboard Financiero!
                    </h3>
                    <p className="text-yellow-700 mb-3">
                      Para comenzar, haz clic en los botones de arriba para cargar los datos que necesites:
                    </p>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• <strong>Cuentas por Pagar:</strong> Facturas de proveedores (2025)</li>
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

        {pestanaActiva === 'saldos' && (
          <ChipaxSaldosExplorer />
        )}

        {pestanaActiva === 'debugger' && (
          <ChipaxComprasDebugger />
        )}
      </div>
    </div>
  );
};

export default DashboardFinancieroIntegrado;
