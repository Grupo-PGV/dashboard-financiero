// FinancialKPIDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Percent, Calendar, Activity, 
  DollarSign, AlertCircle, ChevronUp, ChevronDown, HelpCircle,
  BarChart2, PieChart, Download
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';

/**
 * Componente para mostrar KPIs financieros
 * 
 * @param {Object} props
 * @param {Array} props.saldosBancarios - Saldos bancarios
 * @param {Array} props.cuentasPendientes - Cuentas por cobrar
 * @param {Array} props.cuentasPorPagar - Cuentas por pagar
 * @param {Object} props.flujoCaja - Flujo de caja
 * @param {Array} props.periodos - Periodos para comparación (actual, anterior, hace_un_ano)
 * @param {boolean} props.loading - Indica si está cargando los datos
 * @param {Function} props.onExportData - Función para exportar datos
 */
const FinancialKPIDashboard = ({ 
  saldosBancarios = [],
  cuentasPendientes = [],
  cuentasPorPagar = [],
  flujoCaja = {},
  periodos = ['actual', 'anterior', 'hace_un_ano'],
  loading = false,
  onExportData
}) => {
  // Estados para los KPIs calculados
  const [kpis, setKpis] = useState({
    liquidezCorriente: 0,
    rotacionCxC: 0,
    rotacionCxP: 0,
    margenOperativo: 0,
    crecimientoIngresos: 0,
    diasCxC: 0,
    diasCxP: 0,
    saldoTotal: 0
  });
  
  // Estado para el gráfico seleccionado
  const [selectedChart, setSelectedChart] = useState('ingresos_vs_egresos');
  
  // Formatear moneda
  const formatCurrency = (amount, currency = 'CLP') => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency,
      maximumFractionDigits: currency === 'CLP' ? 0 : 2
    }).format(amount);
  };
  
  // Formatear porcentaje
  const formatPercent = (value) => {
    return `${(value * 100).toFixed(2)}%`;
  };
  
  // Calcular KPIs financieros
  useEffect(() => {
    if (loading) return;
    
    // Total de activos circulantes (saldos bancarios + cuentas por cobrar)
    const totalActivosCirculantes = saldosBancarios.reduce((sum, cuenta) => sum + cuenta.saldo, 0) +
                                   cuentasPendientes.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    
    // Total de pasivos circulantes (cuentas por pagar)
    const totalPasivosCirculantes = cuentasPorPagar.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    
    // Liquidez corriente
    const liquidezCorriente = totalPasivosCirculantes > 0 
      ? totalActivosCirculantes / totalPasivosCirculantes 
      : totalActivosCirculantes > 0 ? 100 : 0;
    
    // Calcular periodos para el flujo de caja
    const periodos = flujoCaja?.periodos || [];
    const periodosLength = periodos.length;
    
    // Calcular ingresos y egresos totales
    const totalIngresos = periodos.reduce((sum, p) => sum + p.ingresos, 0);
    const totalEgresos = periodos.reduce((sum, p) => sum + p.egresos, 0);
    
    // Margen operativo
    const margenOperativo = totalIngresos > 0 
      ? (totalIngresos - totalEgresos) / totalIngresos 
      : 0;
    
    // Calcular crecimiento de ingresos
    let crecimientoIngresos = 0;
    if (periodosLength >= 2) {
      const periodoActual = periodos[periodosLength - 1];
      const periodoAnterior = periodos[periodosLength - 2];
      
      if (periodoAnterior.ingresos > 0) {
        crecimientoIngresos = (periodoActual.ingresos - periodoAnterior.ingresos) / periodoAnterior.ingresos;
      }
    }
    
    // Días promedio de cobro (CxC)
    // Fórmula: (CxC / Ventas anuales) * 365
    const ventasAnuales = totalIngresos > 0 ? totalIngresos : 1;
    const totalCxC = cuentasPendientes.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    const diasCxC = (totalCxC / ventasAnuales) * 365;
    
    // Días promedio de pago (CxP)
    // Fórmula: (CxP / Compras anuales) * 365
    const comprasAnuales = totalEgresos > 0 ? totalEgresos : 1;
    const totalCxP = cuentasPorPagar.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    const diasCxP = (totalCxP / comprasAnuales) * 365;
    
    // Rotación de cuentas por cobrar
    // Fórmula: Ventas anuales / CxC promedio
    const rotacionCxC = totalCxC > 0 ? ventasAnuales / totalCxC : 0;
    
    // Rotación de cuentas por pagar
    // Fórmula: Compras anuales / CxP promedio
    const rotacionCxP = totalCxP > 0 ? comprasAnuales / totalCxP : 0;
    
    // Saldo total bancario
    const saldoTotal = saldosBancarios.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    
    // Actualizar KPIs
    setKpis({
      liquidezCorriente,
      rotacionCxC,
      rotacionCxP,
      margenOperativo,
      crecimientoIngresos,
      diasCxC,
      diasCxP,
      saldoTotal
    });
  }, [saldosBancarios, cuentasPendientes, cuentasPorPagar, flujoCaja, loading]);
  
  // Preparar datos para el gráfico de ingresos vs egresos
  const prepareIngresosVsEgresosData = () => {
    const periodos = flujoCaja?.periodos || [];
    
    return periodos.map(periodo => {
      const fecha = periodo.fecha ? new Date(periodo.fecha) : null;
      const label = fecha 
        ? fecha.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
        : `${periodo.mes || ''} ${periodo.anio || ''}`;
      
      return {
        name: label,
        ingresos: periodo.ingresos,
        egresos: periodo.egresos,
        flujoNeto: periodo.flujoNeto
      };
    });
  };
  
  // Preparar datos para el gráfico de distribución de cuentas por cobrar
  const prepareCxCDistribucionData = () => {
    // Agrupar cuentas por rangos de días
    const groups = {
      'Al día': 0,
      '1-30 días': 0,
      '31-60 días': 0,
      '61-90 días': 0,
      'Más de 90 días': 0
    };
    
    cuentasPendientes.forEach(cuenta => {
      const diasVencidos = cuenta.diasVencidos || 0;
      
      if (diasVencidos <= 0) {
        groups['Al día'] += cuenta.saldo;
      } else if (diasVencidos <= 30) {
        groups['1-30 días'] += cuenta.saldo;
      } else if (diasVencidos <= 60) {
        groups['31-60 días'] += cuenta.saldo;
      } else if (diasVencidos <= 90) {
        groups['61-90 días'] += cuenta.saldo;
      } else {
        groups['Más de 90 días'] += cuenta.saldo;
      }
    });
    
    // Convertir a formato para el gráfico
    return Object.entries(groups).map(([name, value]) => ({
      name,
      value: value
    }));
  };
  
  // Colores para gráficos
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];
  
  // Calcular el color para la tendencia
  const getTrendColor = (value) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };
  
  // Calcular el ícono para la tendencia
  const getTrendIcon = (value) => {
    if (value > 0) return <ChevronUp size={16} />;
    if (value < 0) return <ChevronDown size={16} />;
    return null;
  };
  
  // Tooltip personalizado para los gráficos
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow rounded border border-gray-200">
          <p className="font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {
                entry.name === 'name' || entry.name === 'flujoNeto'
                  ? formatCurrency(entry.value)
                  : formatCurrency(entry.value)
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Renderizar skeleton durante carga
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(index => (
            <div key={index} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="h-80 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity size={20} className="mr-2 text-blue-600" />
            Indicadores Financieros Clave (KPIs)
          </h2>
          
          {onExportData && (
            <button 
              className="flex items-center text-sm py-1 px-3 border border-gray-300 rounded hover:bg-gray-50"
              onClick={onExportData}
            >
              <Download size={16} className="mr-1" />
              Exportar KPIs
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Métricas financieras clave para monitorear el desempeño de tu empresa
        </p>
      </div>
      
      {/* Tarjetas de KPIs */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Saldo Bancario Total */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-blue-800 flex items-center">
                <DollarSign size={16} className="mr-1" />
                Saldo Bancario Total
              </h3>
              
              <div className="flex items-center">
                <div className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {saldosBancarios.length} cuentas
                </div>
              </div>
            </div>
            
            <p className="text-2xl font-bold text-blue-900 mb-1">
              {formatCurrency(kpis.saldoTotal)}
            </p>
            
            <div className="text-xs flex items-center">
              <div title="Ayuda" className="text-blue-700 cursor-help">
                <HelpCircle size={12} />
              </div>
              <span className="ml-1 text-blue-700">
                Saldo total en todas las cuentas bancarias
              </span>
            </div>
          </div>
          
          {/* Liquidez Corriente */}
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-emerald-800 flex items-center">
                <Percent size={16} className="mr-1" />
                Liquidez Corriente
              </h3>
              
              <div className={`flex items-center ${
                kpis.liquidezCorriente >= 1 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {getTrendIcon(kpis.liquidezCorriente - 1)}
                <span className="text-xs">
                  {kpis.liquidezCorriente >= 1 ? 'Favorable' : 'Desfavorable'}
                </span>
              </div>
            </div>
            
            <p className="text-2xl font-bold text-emerald-900 mb-1">
              {kpis.liquidezCorriente.toFixed(2)}
            </p>
            
            <div className="text-xs flex items-center">
              <div title="Ayuda" className="text-emerald-700 cursor-help">
                <HelpCircle size={12} />
              </div>
              <span className="ml-1 text-emerald-700">
                Activos circulantes / Pasivos circulantes
              </span>
            </div>
          </div>
          
          {/* Margen Operativo */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-purple-800 flex items-center">
                <Percent size={16} className="mr-1" />
                Margen Operativo
              </h3>
              
              <div className={`flex items-center ${getTrendColor(kpis.margenOperativo)}`}>
                {getTrendIcon(kpis.margenOperativo)}
                <span className="text-xs">
                  {kpis.margenOperativo >= 0 ? 'Positivo' : 'Negativo'}
                </span>
              </div>
            </div>
            
            <p className="text-2xl font-bold text-purple-900 mb-1">
              {formatPercent(kpis.margenOperativo)}
            </p>
            
            <div className="text-xs flex items-center">
              <div title="Ayuda" className="text-purple-700 cursor-help">
                <HelpCircle size={12} />
              </div>
              <span className="ml-1 text-purple-700">
                (Ingresos - Egresos) / Ingresos
              </span>
            </div>
          </div>
          
          {/* Crecimiento de Ingresos */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-amber-800 flex items-center">
                <TrendingUp size={16} className="mr-1" />
                Crecimiento de Ingresos
              </h3>
              
              <div className={`flex items-center ${getTrendColor(kpis.crecimientoIngresos)}`}>
                {getTrendIcon(kpis.crecimientoIngresos)}
                <span className="text-xs">
                  {kpis.crecimientoIngresos >= 0 ? 'Positivo' : 'Negativo'}
                </span>
              </div>
            </div>
            
            <p className="text-2xl font-bold text-amber-900 mb-1">
              {formatPercent(kpis.crecimientoIngresos)}
            </p>
            
            <div className="text-xs flex items-center">
              <div title="Ayuda" className="text-amber-700 cursor-help">
                <HelpCircle size={12} />
              </div>
              <span className="ml-1 text-amber-700">
                Comparado con el período anterior
              </span>
            </div>
          </div>
          
          {/* Días de Cobro */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-red-800 flex items-center">
                <Calendar size={16} className="mr-1" />
                Días Promedio de Cobro
              </h3>
              
              <div className={`flex items-center ${
                kpis.diasCxC <= 30 ? 'text-emerald-600' : 
                kpis.diasCxC <= 60 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {kpis.diasCxC <= 30 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                <span className="text-xs">
                  {kpis.diasCxC <= 30 ? 'Óptimo' : 
                   kpis.diasCxC <= 60 ? 'Aceptable' : 'Alto'}
                </span>
              </div>
            </div>
            
            <p className="text-2xl font-bold text-red-900 mb-1">
              {Math.round(kpis.diasCxC)} días
            </p>
            
            <div className="text-xs flex items-center">
              <div title="Ayuda" className="text-red-700 cursor-help">
                <HelpCircle size={12} />
              </div>
              <span className="ml-1 text-red-700">
                (CxC / Ventas anuales) * 365
              </span>
            </div>
          </div>
          
          {/* Días de Pago */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-indigo-800 flex items-center">
                <Calendar size={16} className="mr-1" />
                Días Promedio de Pago
              </h3>
              
              <div className={`flex items-center ${
                kpis.diasCxP >= 45 ? 'text-emerald-600' : 
                kpis.diasCxP >= 30 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {kpis.diasCxP >= 45 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span className="text-xs">
                  {kpis.diasCxP >= 45 ? 'Óptimo' : 
                   kpis.diasCxP >= 30 ? 'Aceptable' : 'Bajo'}
                </span>
              </div>
            </div>
            
            <p className="text-2xl font-bold text-indigo-900 mb-1">
              {Math.round(kpis.diasCxP)} días
            </p>
            
            <div className="text-xs flex items-center">
              <div title="Ayuda" className="text-indigo-700 cursor-help">
                <HelpCircle size={12} />
              </div>
              <span className="ml-1 text-indigo-700">
                (CxP / Compras anuales) * 365
              </span>
            </div>
          </div>
          
          {/* Rotación de CxC */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-blue-800 flex items-center">
                <TrendingUp size={16} className="mr-1" />
                Rotación de Cuentas por Cobrar
              </h3>
              
              <div className={`flex items-center ${
                kpis.rotacionCxC >= 12 ? 'text-emerald-600' : 
                kpis.rotacionCxC >= 6 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {kpis.rotacionCxC >= 12 ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span className="text-xs">
                  {kpis.rotacionCxC >= 12 ? 'Alto' : 
                   kpis.rotacionCxC >= 6 ? 'Medio' : 'Bajo'}
                </span>
              </div>
            </div>
            
            <p className="text-2xl font-bold text-blue-900 mb-1">
              {kpis.rotacionCxC.toFixed(2)}
            </p>
            
            <div className="text-xs flex items-center">
              <div title="Ayuda" className="text-blue-700 cursor-help">
                <HelpCircle size={12} />
              </div>
              <span className="ml-1 text-blue-700">
                Ventas anuales / CxC promedio
              </span>
            </div>
          </div>
          
          {/* Rotación de CxP */}
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-emerald-800 flex items-center">
                <TrendingDown size={16} className="mr-1" />
                Rotación de Cuentas por Pagar
              </h3>
              
              <div className={`flex items-center ${
                kpis.rotacionCxP <= 8 ? 'text-emerald-600' : 
                kpis.rotacionCxP <= 12 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {kpis.rotacionCxP <= 8 ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                <span className="text-xs">
                  {kpis.rotacionCxP <= 8 ? 'Óptimo' : 
                   kpis.rotacionCxP <= 12 ? 'Aceptable' : 'Alto'}
                </span>
              </div>
            </div>
            
            <p className="text-2xl font-bold text-emerald-900 mb-1">
              {kpis.rotacionCxP.toFixed(2)}
            </p>
            
            <div className="text-xs flex items-center">
              <div title="Ayuda" className="text-emerald-700 cursor-help">
                <HelpCircle size={12} />
              </div>
              <span className="ml-1 text-emerald-700">
                Compras anuales / CxP promedio
              </span>
            </div>
          </div>
        </div>
        
        {/* Selectores de gráficos */}
        <div className="mb-4 border-b pb-4">
          <div className="flex space-x-2">
            <button
              className={`flex items-center text-sm py-1 px-3 rounded ${
                selectedChart === 'ingresos_vs_egresos' 
                  ? 'bg-blue-100 text-blue-800 font-medium' 
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedChart('ingresos_vs_egresos')}
            >
              <BarChart2 size={16} className="mr-1" />
              Ingresos vs Egresos
            </button>
            
            <button
              className={`flex items-center text-sm py-1 px-3 rounded ${
                selectedChart === 'distribucion_cxc' 
                  ? 'bg-blue-100 text-blue-800 font-medium' 
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedChart('distribucion_cxc')}
            >
              <PieChart size={16} className="mr-1" />
              Distribución CxC
            </button>
          </div>
        </div>
        
        {/* Gráficos */}
        <div className="h-80">
          {selectedChart === 'ingresos_vs_egresos' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={prepareIngresosVsEgresosData()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Intl.NumberFormat('es-CL', { 
                    notation: 'compact', 
                    compactDisplay: 'short' 
                  }).format(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" />
                <Bar dataKey="egresos" name="Egresos" fill="#EF4444" />
                <Bar dataKey="flujoNeto" name="Flujo Neto" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          )}
          
          {selectedChart === 'distribucion_cxc' && (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={prepareCxCDistribucionData()}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {prepareCxCDistribucionData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(name) => `${name}`}
                />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialKPIDashboard;
