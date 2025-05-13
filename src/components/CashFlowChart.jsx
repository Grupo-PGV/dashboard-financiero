// CashFlowChart.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Download, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * Componente para visualizar el flujo de caja
 * 
 * @param {Object} props
 * @param {Object} props.data - Datos de flujo de caja
 * @param {number} props.data.saldoInicial - Saldo inicial
 * @param {number} props.data.saldoFinal - Saldo final
 * @param {Array} props.data.periodos - Periodos del flujo de caja
 * @param {boolean} props.loading - Indica si está cargando los datos
 * @param {Function} props.onExportData - Función para exportar datos
 * @param {Function} props.onPeriodChange - Función al cambiar el periodo
 * @param {string} props.periodo - Periodo seleccionado (mensual, trimestral, anual)
 */
const CashFlowChart = ({ 
  data, 
  loading = false, 
  onExportData, 
  onPeriodChange,
  periodo = 'mensual'
}) => {
  const [chartData, setChartData] = useState([]);
  const [statistics, setStatistics] = useState({
    ingresoTotal: 0,
    egresoTotal: 0,
    flujoNetoTotal: 0,
    tendencia: 'neutral'
  });

  // Formatear datos para el gráfico
  useEffect(() => {
    if (!data || !data.periodos || loading) {
      setChartData([]);
      return;
    }

    // Función para agrupar periodos según el periodo seleccionado
    const groupPeriods = (periodos, tipoPeriodo) => {
      if (tipoPeriodo === 'mensual') return periodos;

      const grouped = periodos.reduce((acc, periodo) => {
        let key;
        if (tipoPeriodo === 'trimestral') {
          // Determinar el trimestre basado en el mes
          const month = new Date(periodo.fecha).getMonth();
          const trimestre = Math.floor(month / 3) + 1;
          const year = new Date(periodo.fecha).getFullYear();
          key = `T${trimestre} ${year}`;
        } else if (tipoPeriodo === 'anual') {
          key = new Date(periodo.fecha).getFullYear().toString();
        }

        if (!acc[key]) {
          acc[key] = {
            fecha: periodo.fecha,
            etiqueta: key,
            ingresos: 0,
            egresos: 0,
            flujoNeto: 0,
            saldoAcumulado: 0
          };
        }

        acc[key].ingresos += periodo.ingresos;
        acc[key].egresos += periodo.egresos;
        acc[key].flujoNeto += periodo.flujoNeto;
        acc[key].saldoAcumulado = periodo.saldoAcumulado; // Tomamos el último valor acumulado
        
        return acc;
      }, {});

      return Object.values(grouped);
    };

    const periodosAgrupados = groupPeriods(data.periodos, periodo);

    // Formatear periodos para el gráfico
    const formattedData = periodosAgrupados.map(periodo => {
      const date = new Date(periodo.fecha);
      
      let formattedLabel;
      if (periodo.etiqueta) {
        formattedLabel = periodo.etiqueta;
      } else if (periodo === 'mensual') {
        formattedLabel = date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
      } else {
        formattedLabel = date.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
      }
      
      return {
        fecha: date,
        etiqueta: formattedLabel,
        ingresos: periodo.ingresos,
        egresos: periodo.egresos,
        flujoNeto: periodo.flujoNeto,
        saldoAcumulado: periodo.saldoAcumulado
      };
    });

    setChartData(formattedData);

    // Calcular estadísticas
    const ingresoTotal = formattedData.reduce((sum, item) => sum + item.ingresos, 0);
    const egresoTotal = formattedData.reduce((sum, item) => sum + item.egresos, 0);
    const flujoNetoTotal = ingresoTotal - egresoTotal;

    // Determinar tendencia
    let tendencia = 'neutral';
    if (formattedData.length > 1) {
      const firstHalf = formattedData.slice(0, Math.floor(formattedData.length / 2));
      const secondHalf = formattedData.slice(Math.floor(formattedData.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.flujoNeto, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.flujoNeto, 0) / secondHalf.length;

      tendencia = secondHalfAvg > firstHalfAvg ? 'positiva' : secondHalfAvg < firstHalfAvg ? 'negativa' : 'neutral';
    }

    setStatistics({
      ingresoTotal,
      egresoTotal,
      flujoNetoTotal,
      tendencia
    });
  }, [data, loading, periodo]);

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Tooltip personalizado para el gráfico
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow rounded border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-green-600">
            Ingresos: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-red-600">
            Egresos: {formatCurrency(payload[1].value)}
          </p>
          <p className={`font-medium ${payload[2].value >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            Flujo neto: {formatCurrency(payload[2].value)}
          </p>
          <p className={`font-medium ${payload[3].value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Saldo: {formatCurrency(payload[3].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp size={20} className="mr-2 text-blue-600" />
            Flujo de Caja
          </h2>
          <p className="text-sm text-gray-500">
            Evolución del flujo de efectivo a lo largo del tiempo
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="border border-gray-300 rounded overflow-hidden">
            <select 
              className="py-1 px-3 bg-white focus:outline-none text-sm"
              value={periodo}
              onChange={(e) => onPeriodChange && onPeriodChange(e.target.value)}
            >
              <option value="mensual">Mensual</option>
              <option value="trimestral">Trimestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>
          
          {onExportData && (
            <button 
              className="flex items-center text-sm py-1 px-3 border border-gray-300 rounded hover:bg-gray-50"
              onClick={onExportData}
            >
              <Download size={16} className="mr-1" />
              Exportar
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-blue-700">Saldo inicial</p>
              <p className="text-lg font-semibold text-blue-900">{formatCurrency(data?.saldoInicial || 0)}</p>
            </div>
            <Calendar size={20} className="text-blue-500" />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-green-700">Ingresos totales</p>
              <p className="text-lg font-semibold text-green-900">{formatCurrency(statistics.ingresoTotal)}</p>
            </div>
            <ArrowUpRight size={20} className="text-green-500" />
          </div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-red-700">Egresos totales</p>
              <p className="text-lg font-semibold text-red-900">{formatCurrency(statistics.egresoTotal)}</p>
            </div>
            <ArrowDownRight size={20} className="text-red-500" />
          </div>
        </div>
        
        <div className={`rounded-lg p-3 border ${statistics.flujoNetoTotal >= 0 
            ? 'bg-emerald-50 border-emerald-100' 
            : 'bg-red-50 border-red-100'}`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className={`text-sm ${statistics.flujoNetoTotal >= 0 
                  ? 'text-emerald-700' 
                  : 'text-red-700'}`}
              >
                Saldo final
              </p>
              <p className={`text-lg font-semibold ${statistics.flujoNetoTotal >= 0 
                  ? 'text-emerald-900' 
                  : 'text-red-900'}`}
              >
                {formatCurrency(data?.saldoFinal || 0)}
              </p>
            </div>
            {statistics.flujoNetoTotal >= 0 
              ? <TrendingUp size={20} className="text-emerald-500" />
              : <TrendingDown size={20} className="text-red-500" />
            }
          </div>
        </div>
      </div>

      {/* Gráfico */}
      {chartData.length > 0 ? (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="etiqueta" 
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Intl.NumberFormat('es-CL', { 
                  notation: 'compact', 
                  compactDisplay: 'short' 
                }).format(value)}
                domain={['auto', 'auto']}
                tickMargin={10}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => new Intl.NumberFormat('es-CL', { 
                  notation: 'compact', 
                  compactDisplay: 'short' 
                }).format(value)}
                domain={['auto', 'auto']}
                tickMargin={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <ReferenceLine y={0} stroke="#666" />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="ingresos" 
                name="Ingresos" 
                stroke="#10B981" 
                activeDot={{ r: 6 }} 
                strokeWidth={2}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="egresos" 
                name="Egresos" 
                stroke="#EF4444" 
                activeDot={{ r: 6 }} 
                strokeWidth={2}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="flujoNeto" 
                name="Flujo neto" 
                stroke="#3B82F6" 
                activeDot={{ r: 6 }} 
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="saldoAcumulado" 
                name="Saldo acumulado" 
                stroke="#8B5CF6" 
                strokeDasharray="5 5"
                activeDot={{ r: 6 }} 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-80 w-full flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <div className="text-center">
            <TrendingUp size={40} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No hay datos disponibles para mostrar</p>
            <p className="text-gray-400 text-sm">Sincronice con Chipax para ver el flujo de caja</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlowChart;
