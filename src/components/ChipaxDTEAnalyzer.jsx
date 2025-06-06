// ChipaxDTEAnalyzer.jsx - Analiza los tipos de DTEs disponibles
import React, { useState } from 'react';
import { Search, FileText, AlertCircle } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxDTEAnalyzer = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const analyzeDTEs = async () => {
    setAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      // Obtener todos los DTEs
      const data = await chipaxService.obtenerTodosDTEs();
      
      if (!data.items || data.items.length === 0) {
        setError('No se encontraron DTEs');
        return;
      }

      // Analizar por tipo
      const analysis = {
        total: data.items.length,
        tipos: {},
        porCobrar: 0,
        porPagar: 0,
        ejemplos: {}
      };

      data.items.forEach(dte => {
        const tipo = dte.tipo || dte.tipo_dte;
        
        if (!analysis.tipos[tipo]) {
          analysis.tipos[tipo] = {
            count: 0,
            nombre: getNombreTipo(tipo),
            pagados: 0,
            pendientes: 0,
            montoTotal: 0,
            montoPendiente: 0
          };
          // Guardar un ejemplo de cada tipo
          analysis.ejemplos[tipo] = dte;
        }

        analysis.tipos[tipo].count++;
        
        const estaPagado = dte.pagado === true || dte.fecha_pago_interna != null;
        const saldo = dte.Saldo?.saldoDeudor || 0;
        const monto = dte.montoTotal || 0;

        if (estaPagado) {
          analysis.tipos[tipo].pagados++;
        } else {
          analysis.tipos[tipo].pendientes++;
          analysis.tipos[tipo].montoPendiente += saldo > 0 ? saldo : monto;
        }
        
        analysis.tipos[tipo].montoTotal += monto;

        // Determinar si es por cobrar o por pagar
        if (esFacturaVenta(tipo)) {
          if (!estaPagado) analysis.porCobrar++;
        } else if (esFacturaCompra(tipo)) {
          if (!estaPagado) analysis.porPagar++;
        }
      });

      setResults(analysis);
    } catch (err) {
      console.error('Error analizando DTEs:', err);
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const getNombreTipo = (tipo) => {
    const tipos = {
      33: 'Factura Electrónica',
      34: 'Factura No Afecta o Exenta',
      46: 'Factura de Compra',
      52: 'Guía de Despacho',
      56: 'Nota de Débito',
      61: 'Nota de Crédito',
      39: 'Boleta Electrónica',
      41: 'Boleta No Afecta o Exenta'
    };
    return tipos[tipo] || `Tipo ${tipo}`;
  };

  const esFacturaVenta = (tipo) => [33, 34, 39, 41].includes(parseInt(tipo));
  const esFacturaCompra = (tipo) => [46].includes(parseInt(tipo));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <FileText className="w-6 h-6 mr-2 text-indigo-600" />
          Analizador de DTEs
        </h2>
        <button
          onClick={analyzeDTEs}
          disabled={analyzing}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 flex items-center"
        >
          <Search className="w-4 h-4 mr-2" />
          {analyzing ? 'Analizando...' : 'Analizar DTEs'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-lg mb-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error:</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {/* Resumen General */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total DTEs</p>
              <p className="text-2xl font-bold text-gray-800">{results.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-sm text-green-600">Por Cobrar (pendientes)</p>
              <p className="text-2xl font-bold text-green-800">{results.porCobrar}</p>
            </div>
            <div className="bg-red-50 p-4 rounded">
              <p className="text-sm text-red-600">Por Pagar (pendientes)</p>
              <p className="text-2xl font-bold text-red-800">{results.porPagar}</p>
            </div>
          </div>

          {/* Análisis por Tipo */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Análisis por Tipo de DTE</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pagados</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pendientes</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto Pendiente</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(results.tipos).map(([tipo, data]) => (
                    <tr key={tipo} className={esFacturaCompra(parseInt(tipo)) ? 'bg-red-50' : esFacturaVenta(parseInt(tipo)) ? 'bg-green-50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tipo}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {data.nombre}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                        {data.count}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-green-600">
                        {data.pagados}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-red-600">
                        {data.pendientes}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        ${data.montoPendiente.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ejemplos de DTEs */}
          <details className="cursor-pointer">
            <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
              Ver ejemplos de cada tipo de DTE
            </summary>
            <div className="mt-4 space-y-4">
              {Object.entries(results.ejemplos).map(([tipo, ejemplo]) => (
                <div key={tipo} className="p-4 bg-gray-50 rounded">
                  <h4 className="font-medium text-gray-800 mb-2">
                    Tipo {tipo} - {getNombreTipo(tipo)}
                  </h4>
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(ejemplo, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default ChipaxDTEAnalyzer;
