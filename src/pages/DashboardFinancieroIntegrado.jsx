// === ACTUALIZACIONES PARA EL COMPONENTE DASHBOARD ===

import React, { useState, useEffect } from 'react';
import { 
  adaptarCuentasPorCobrar, 
  adaptarCuentasPorPagar, 
  filtrarComprasPendientes,
  filtrarComprasPorFecha 
} from '../services/chipaxAdapter';

const DashboardFinancieroIntegrado = () => {
  // Estados existentes
  const [saldosBancarios, setSaldosBancarios] = useState([]);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  
  // ✅ NUEVOS ESTADOS PARA FILTRADO
  const [filtroCompras, setFiltroCompras] = useState({
    soloNoPagadas: false,
    fechaInicio: '',
    fechaFin: '',
    folioFiltro: ''
  });
  
  // ✅ FUNCIÓN MEJORADA: Cargar cuentas por cobrar
  const cargarCuentasPorCobrar = async () => {
    console.log('📋 Cargando cuentas por cobrar...');
    
    try {
      const dtes = await chipaxService.obtenerCuentasPorCobrar();
      console.log('📊 DTEs obtenidos:', dtes);
      
      if (Array.isArray(dtes)) {
        const dtesAdaptados = adaptarCuentasPorCobrar(dtes);
        
        // ✅ VALIDACIÓN: Verificar que tenemos datos válidos
        const dtesConSaldo = dtesAdaptados.filter(dte => dte.monto > 0);
        
        console.log(`✅ ${dtesAdaptados.length} cuentas por cobrar cargadas`);
        console.log(`💰 ${dtesConSaldo.length} con saldo pendiente`);
        
        setCuentasPorCobrar(dtesAdaptados);
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

  // ✅ FUNCIÓN MEJORADA: Cargar cuentas por pagar
  const cargarCuentasPorPagar = async () => {
    console.log('💸 Cargando cuentas por pagar...');
    
    try {
      const compras = await chipaxService.obtenerCuentasPorPagar();
      console.log('📊 Compras obtenidas:', compras);
      
      if (Array.isArray(compras)) {
        const comprasAdaptadas = adaptarCuentasPorPagar(compras);
        
        console.log(`✅ ${comprasAdaptadas.length} cuentas por pagar cargadas`);
        
        // ✅ MOSTRAR ESTADÍSTICAS
        const pendientes = filtrarComprasPendientes(comprasAdaptadas);
        console.log(`💰 ${pendientes.length} compras realmente pendientes`);
        
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

  // ✅ FUNCIONES DE CÁLCULO CORREGIDAS
  const calcularTotalPorCobrar = () => {
    if (!Array.isArray(cuentasPorCobrar)) return 0;
    
    return cuentasPorCobrar
      .filter(cuenta => cuenta.estado === 'Pendiente' && !cuenta.anulado)
      .reduce((total, cuenta) => total + (cuenta.monto || 0), 0);
  };

  const calcularTotalPorPagar = () => {
    if (!Array.isArray(cuentasPorPagar)) return 0;
    
    // ✅ OPCIÓN 1: Solo pendientes (recomendado para el resumen)
    if (filtroCompras.soloNoPagadas) {
      return filtrarComprasPendientes(cuentasPorPagar)
        .reduce((total, compra) => total + (compra.monto || 0), 0);
    }
    
    // ✅ OPCIÓN 2: Todas las compras (para vista completa)
    return cuentasPorPagar.reduce((total, compra) => total + (compra.monto || 0), 0);
  };

  // ✅ FUNCIÓN PARA FILTRAR COMPRAS EN LA UI
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

  // ✅ FUNCIÓN PARA OBTENER CUENTAS POR COBRAR PENDIENTES
  const obtenerCobrarPendientes = () => {
    if (!Array.isArray(cuentasPorCobrar)) return [];
    
    return cuentasPorCobrar.filter(cuenta => 
      cuenta.estado === 'Pendiente' && 
      !cuenta.anulado && 
      cuenta.monto > 0
    );
  };

  // Componente de filtros para compras
  const FiltrosCompras = () => (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <h4 className="font-medium text-gray-700 mb-3">Filtros para Compras</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Filtro solo no pagadas */}
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
        
        {/* Filtro por folio */}
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
        
        {/* Filtro fecha inicio */}
        <input
          type="date"
          value={filtroCompras.fechaInicio}
          onChange={(e) => setFiltroCompras(prev => ({
            ...prev,
            fechaInicio: e.target.value
          }))}
          className="px-3 py-2 border border-gray-300 rounded"
        />
        
        {/* Filtro fecha fin */}
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
      
      {/* Estadísticas de filtrado */}
      <div className="mt-3 text-sm text-gray-600">
        Mostrando {obtenerComprasFiltradas().length} de {cuentasPorPagar.length} compras
        {filtroCompras.soloNoPagadas && ` (${filtrarComprasPendientes(cuentasPorPagar).length} pendientes)`}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header existente */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Financiero</h1>
        <button
          onClick={cargarTodosLosDatos}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* Tarjetas de resumen CORREGIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Cuentas por Cobrar - Solo pendientes */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">Por Cobrar (Pendiente)</h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(calcularTotalPorCobrar())}
          </p>
          <p className="text-sm text-gray-600">
            {obtenerCobrarPendientes().length} facturas pendientes
          </p>
        </div>

        {/* Cuentas por Pagar - Con filtro */}
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
        
        {/* Otras tarjetas... */}
      </div>

      {/* Sección de Cuentas por Pagar con filtros */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cuentas por Pagar</h2>
        
        <FiltrosCompras />
        
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Folio</th>
                <th className="px-4 py-2 text-left">Proveedor</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Fecha Pago</th>
                <th className="px-4 py-2 text-left">Monto</th>
                <th className="px-4 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {obtenerComprasFiltradas().map((compra) => (
                <tr key={compra.id} className="border-b">
                  <td className="px-4 py-2">{compra.folio}</td>
                  <td className="px-4 py-2">{compra.razonSocial}</td>
                  <td className="px-4 py-2">{compra.fecha}</td>
                  <td className="px-4 py-2">
                    {compra.fechaPago ? compra.fechaPago : 'Sin pagar'}
                  </td>
                  <td className="px-4 py-2">{formatCurrency(compra.monto)}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
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
      </div>

      {/* Sección de Cuentas por Cobrar */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cuentas por Cobrar Pendientes</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Folio</th>
                <th className="px-4 py-2 text-left">Cliente</th>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Vencimiento</th>
                <th className="px-4 py-2 text-left">Monto Pendiente</th>
                <th className="px-4 py-2 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {obtenerCobrarPendientes().map((cuenta) => (
                <tr key={cuenta.id} className="border-b">
                  <td className="px-4 py-2">{cuenta.folio}</td>
                  <td className="px-4 py-2">{cuenta.razonSocial}</td>
                  <td className="px-4 py-2">{cuenta.fecha}</td>
                  <td className="px-4 py-2">{cuenta.fechaVencimiento || 'Sin fecha'}</td>
                  <td className="px-4 py-2">{formatCurrency(cuenta.monto)}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                      {cuenta.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
