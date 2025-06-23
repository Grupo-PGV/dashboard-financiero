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
        // ✅ FILTRAR SOLO 2025 por defecto
        const compras2025 = compras.filter(compra => {
          const fecha = compra.fechaEmision || compra.fecha_emision || compra.fecha || '';
          return fecha.includes('2025');
        });
        
        const cuentasAdaptadas = adaptarCuentasPorPagar(compras2025);
        setCuentasPorPagar(cuentasAdaptadas);
        console.log(`✅ ${cuentasAdaptadas.length} facturas de 2025 cargadas por defecto`);
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
      setErrors([]);
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
      console.error('❌ Error cargando facturas 2025:', error);
      setErrors(prev => [...prev, `Facturas 2025: ${error.message}`]);
    } finally {
      setLoading(false);
    }
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
    <div className="mb-6">
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
                <p className="text-sm font-medium text-gray-600">
                  Por Pagar {añoMostrado === '2025' ? '(2025)' : ''}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {cuentasPorPagar.length > 0 ? formatCurrency(totalPorPagar) : 'Sin datos'}
                </p>
                {cuentasPorPagar.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {cuentasPorPagar.length} facturas
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
    const facturas2025 = cuentasPorPagar.filter(c => new Date(c.fecha).getFullYear() === 2025);
    
    if (facturas2025.length === 0) {
      return null;
    }

    const estadisticas = {
      total: facturas2025.length,
      // ✅ CORRECCIÓN: Estados desconocidos son pendientes de aprobación
      pendientesAprobacion: facturas2025.filter(f => 
        f.estado === 'Pendiente Aprobación' || f.estado === 'Estado Desconocido'
      ).length,
      aceptadas: facturas2025.filter(f => f.estado === 'Aceptado').length,
      pagadasRealmente: facturas2025.filter(f => f.estado === 'Pagado Realmente').length,
      montoTotal: facturas2025.reduce((sum, f) => sum + (f.montoTotal || 0), 0)
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="text-blue-500" size={20} />
          <h3 className="text-lg font-semibold">Resumen Facturas 2025</h3>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            {estadisticas.total} facturas
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">{estadisticas.total}</div>
            <div className="text-sm text-blue-700">Total 2025</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-900">{estadisticas.pendientesAprobacion}</div>
            <div className="text-sm text-orange-700">Pend. Aprobación</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">{estadisticas.aceptadas}</div>
            <div className="text-sm text-blue-700">Aceptadas</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-900">{estadisticas.pagadasRealmente}</div>
            <div className="text-sm text-green-700">Pagadas</div>
          </div>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-xl font-bold text-gray-900">
            {formatCurrency(estadisticas.montoTotal)}
          </div>
          <div className="text-sm text-gray-600">
            Monto total facturas 2025
          </div>
        </div>

        {/* ✅ NOTA EXPLICATIVA sobre la corrección */}
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-orange-600 mt-0.5" size={16} />
            <div className="text-sm">
              <p className="font-semibold text-orange-800 mb-1">
                Estados Corregidos
              </p>
              <p className="text-orange-700">
                Las facturas que aparecían como "Estado Desconocido" han sido reclasificadas 
                como "Pendientes de Aprobación" según tu indicación.
              </p>
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
                          compra.estado === 'Estado Desconocido' ? 'bg-orange-100 text-orange-800' : // ✅ También naranja
                          compra.estado === 'Aceptado' ? 'bg-blue-100 text-blue-800' :
                          compra.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {/* ✅ CORRECCIÓN: Mostrar "Pendiente Aprobación" para estados desconocidos */}
                          {compra.estado === 'Estado Desconocido' ? 'Pendiente Aprobación' : compra.estado}
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

        {/* Errores - Solo si hay errores */}
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
            
            {/* ✅ Ayuda específica para errores CORS */}
            {errors.some(error => error.includes('CORS')) && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-sm">
                  <p className="font-semibold text-yellow-800 mb-1">
                    💡 Solución para Error CORS:
                  </p>
                  <p className="text-yellow-700">
                    Este error puede ocurrir desde el navegador. Considera usar un proxy 
                    o configurar CORS en el servidor de Chipax. El dashboard funciona 
                    correctamente desde localhost.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contenido según pestaña activa */}
        {pestanaActiva === 'dashboard' && (
          <>
            <ControlesPrincipales />
            
            {/* ✅ Mensaje de ayuda si no hay datos cargados */}
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

        {pestanaActiva === 'debugger' && (
          <ChipaxComprasDebugger />
        )}
      </div>
    </div>
  );
};

export default DashboardFinancieroIntegrado;
