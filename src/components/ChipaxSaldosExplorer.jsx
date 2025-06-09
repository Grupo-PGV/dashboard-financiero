import React, { useState } from 'react';
import { Search, Target, CheckCircle, XCircle, Globe, Eye, AlertTriangle } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxSaldosExplorer = () => {
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState('');

  const TARGET_AMOUNT = 186648977;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Endpoints específicos para buscar saldos bancarios
  const endpointsParaSaldos = [
    // Endpoints de saldos directos
    { path: '/saldos', name: 'Saldos', priority: 'high' },
    { path: '/saldos-bancarios', name: 'Saldos Bancarios', priority: 'high' },
    { path: '/balance', name: 'Balance', priority: 'high' },
    { path: '/balances', name: 'Balances', priority: 'high' },
    { path: '/bank-balance', name: 'Bank Balance', priority: 'high' },
    { path: '/bank-balances', name: 'Bank Balances', priority: 'high' },
    
    // Endpoints de cuentas con parámetros para incluir saldos
    { path: '/cuentas-corrientes?incluirSaldos=true', name: 'Cuentas + Saldos', priority: 'high' },
    { path: '/cuentas-corrientes?withBalance=1', name: 'Cuentas + Balance', priority: 'high' },
    { path: '/cuentas-corrientes?expand=saldo', name: 'Cuentas Expand Saldo', priority: 'high' },
    { path: '/cuentas-corrientes?include=balance', name: 'Cuentas Include Balance', priority: 'high' },
    { path: '/cuentas-corrientes?fields=*,saldo', name: 'Cuentas All Fields', priority: 'high' },
    
    // Endpoints financieros
    { path: '/finanzas', name: 'Finanzas', priority: 'medium' },
    { path: '/finance', name: 'Finance', priority: 'medium' },
    { path: '/tesoreria', name: 'Tesorería', priority: 'medium' },
    { path: '/treasury', name: 'Treasury', priority: 'medium' },
    { path: '/cash', name: 'Cash', priority: 'medium' },
    { path: '/cash-position', name: 'Cash Position', priority: 'medium' },
    
    // Endpoints de resumen/dashboard
    { path: '/dashboard', name: 'Dashboard', priority: 'medium' },
    { path: '/dashboard/financiero', name: 'Dashboard Financiero', priority: 'medium' },
    { path: '/resumen', name: 'Resumen', priority: 'medium' },
    { path: '/resumen-financiero', name: 'Resumen Financiero', priority: 'medium' },
    { path: '/summary', name: 'Summary', priority: 'medium' },
    { path: '/financial-summary', name: 'Financial Summary', priority: 'medium' },
    
    // Endpoints de bancos
    { path: '/bancos', name: 'Bancos', priority: 'medium' },
    { path: '/bancos?incluirSaldos=true', name: 'Bancos + Saldos', priority: 'medium' },
    { path: '/banks', name: 'Banks', priority: 'medium' },
    { path: '/bank-accounts', name: 'Bank Accounts', priority: 'medium' },
    { path: '/cuentas-bancarias', name: 'Cuentas Bancarias', priority: 'medium' },
    
    // Endpoints de estados financieros
    { path: '/balance-general', name: 'Balance General', priority: 'low' },
    { path: '/estado-situacion', name: 'Estado de Situación', priority: 'low' },
    { path: '/estado-financiero', name: 'Estado Financiero', priority: 'low' },
    { path: '/financial-statement', name: 'Financial Statement', priority: 'low' },
    
    // Endpoints de reportes
    { path: '/reportes', name: 'Reportes', priority: 'low' },
    { path: '/reportes/saldos', name: 'Reportes Saldos', priority: 'low' },
    { path: '/reports', name: 'Reports', priority: 'low' },
    { path: '/reports/balances', name: 'Reports Balances', priority: 'low' },
    
    // Otros endpoints posibles
    { path: '/caja', name: 'Caja', priority: 'low' },
    { path: '/arqueo', name: 'Arqueo', priority: 'low' },
    { path: '/posicion-financiera', name: 'Posición Financiera', priority: 'low' },
    { path: '/activos', name: 'Activos', priority: 'low' },
    { path: '/assets', name: 'Assets', priority: 'low' }
  ];

  const buscarNumerosCercanos = (data, endpointName) => {
    const encontrarNumeros = (obj, path = '') => {
      const resultados = [];
      
      if (typeof obj === 'number') {
        const diferencia = Math.abs(obj - TARGET_AMOUNT);
        const porcentaje = (diferencia / TARGET_AMOUNT) * 100;
        
        // Buscar números que estén dentro del 50% del objetivo
        if (diferencia < TARGET_AMOUNT * 0.5) {
          resultados.push({
            path,
            valor: obj,
            diferencia,
            porcentaje,
            esExacto: diferencia < 1000,
            esCercano: diferencia < TARGET_AMOUNT * 0.1 // Dentro del 10%
          });
        }
      } else if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
        Object.keys(obj).forEach(key => {
          resultados.push(...encontrarNumeros(obj[key], path ? `${path}.${key}` : key));
        });
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          resultados.push(...encontrarNumeros(item, `${path}[${index}]`));
        });
      }
      
      return resultados;
    };

    const numerosEncontrados = encontrarNumeros(data, endpointName);
    
    // También buscar sumas de arrays si hay campos numéricos
    if (Array.isArray(data)) {
      const camposNumericos = new Set();
      data.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(key => {
            if (typeof item[key] === 'number') {
              camposNumericos.add(key);
            }
          });
        }
      });
      
      // Calcular sumas por campo
      Array.from(camposNumericos).forEach(campo => {
        const suma = data.reduce((total, item) => {
          return total + (typeof item[campo] === 'number' ? item[campo] : 0);
        }, 0);
        
        const diferencia = Math.abs(suma - TARGET_AMOUNT);
        const porcentaje = (diferencia / TARGET_AMOUNT) * 100;
        
        if (diferencia < TARGET_AMOUNT * 0.5) {
          numerosEncontrados.push({
            path: `SUM(${campo})`,
            valor: suma,
            diferencia,
            porcentaje,
            esExacto: diferencia < 1000,
            esCercano: diferencia < TARGET_AMOUNT * 0.1
          });
        }
      });
    }
    
    return numerosEncontrados.sort((a, b) => a.diferencia - b.diferencia);
  };

  const probarEndpoint = async (endpoint) => {
    try {
      setCurrentEndpoint(endpoint.path);
      
      const data = await chipaxService.fetchFromChipax(endpoint.path);
      
      if (!data) {
        return {
          ...endpoint,
          status: 'empty',
          message: 'Sin datos',
          data: null,
          numerosCercanos: []
        };
      }

      const numerosCercanos = buscarNumerosCercanos(data, endpoint.name);
      
      let status = 'success';
      let message = 'Datos obtenidos';
      
      if (numerosCercanos.length > 0) {
        const exactos = numerosCercanos.filter(n => n.esExacto);
        const cercanos = numerosCercanos.filter(n => n.esCercano);
        
        if (exactos.length > 0) {
          status = 'exact_match';
          message = `🎯 ¡EXACTO! ${exactos.length} coincidencia(s)`;
        } else if (cercanos.length > 0) {
          status = 'close_match';
          message = `🟡 Cercano: ${cercanos.length} resultado(s)`;
        } else {
          status = 'far_match';
          message = `📊 ${numerosCercanos.length} número(s) encontrado(s)`;
        }
      }

      return {
        ...endpoint,
        status,
        message,
        data: Array.isArray(data) ? `Array[${data.length}]` : 
              typeof data === 'object' ? `Object{${Object.keys(data).length}}` : 
              String(data),
        numerosCercanos,
        rawData: data
      };
      
    } catch (error) {
      return {
        ...endpoint,
        status: 'error',
        message: error.message,
        data: null,
        numerosCercanos: []
      };
    }
  };

  const ejecutarExploracion = async () => {
    setTesting(true);
    setResults([]);
    setCurrentEndpoint('');

    const resultados = [];

    // Agrupar por prioridad
    const porPrioridad = {
      high: endpointsParaSaldos.filter(e => e.priority === 'high'),
      medium: endpointsParaSaldos.filter(e => e.priority === 'medium'),
      low: endpointsParaSaldos.filter(e => e.priority === 'low')
    };

    for (const prioridad of ['high', 'medium', 'low']) {
      console.log(`🔍 Probando endpoints de prioridad ${prioridad}...`);
      
      for (const endpoint of porPrioridad[prioridad]) {
        const resultado = await probarEndpoint(endpoint);
        resultados.push(resultado);
        setResults([...resultados]);

        // Si encontramos una coincidencia exacta, podemos parar
        if (resultado.status === 'exact_match') {
          console.log(`🎯 ¡Coincidencia exacta encontrada en ${endpoint.path}!`);
          break;
        }

        // Pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Si ya encontramos algo exacto, no seguir
      const tieneExacto = resultados.some(r => r.status === 'exact_match');
      if (tieneExacto) break;
    }

    setTesting(false);
    setCurrentEndpoint('');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'exact_match':
        return <Target className="w-5 h-5 text-green-500" />;
      case 'close_match':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'far_match':
        return <Eye className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'empty':
        return <Globe className="w-5 h-5 text-gray-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Search className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'exact_match':
        return 'bg-green-50 border-green-300';
      case 'close_match':
        return 'bg-yellow-50 border-yellow-300';
      case 'far_match':
        return 'bg-blue-50 border-blue-300';
      case 'success':
        return 'bg-blue-50 border-blue-200';
      case 'empty':
        return 'bg-gray-50 border-gray-300';
      case 'error':
        return 'bg-red-50 border-red-300';
      default:
        return 'bg-white border-gray-200';
    }
  };

  // Ordenar resultados por relevancia
  const resultadosOrdenados = [...results].sort((a, b) => {
    const orderMap = { 
      'exact_match': 0, 
      'close_match': 1, 
      'far_match': 2, 
      'success': 3, 
      'empty': 4, 
      'error': 5 
    };
    return orderMap[a.status] - orderMap[b.status];
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Search className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Explorador de Saldos - Chipax
          </h3>
        </div>
        <button
          onClick={ejecutarExploracion}
          disabled={testing}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            testing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>{testing ? 'Explorando...' : 'Buscar Saldos'}</span>
          </div>
        </button>
      </div>

      {/* Target Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Target className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-blue-800">Búsqueda</span>
        </div>
        <p className="text-blue-700">
          Buscando endpoint que contenga: <span className="font-bold">{formatCurrency(TARGET_AMOUNT)}</span>
        </p>
        <p className="text-blue-600 text-sm mt-1">
          Se explorarán {endpointsParaSaldos.length} endpoints específicos de saldos
        </p>
      </div>

      {/* Current Status */}
      {testing && currentEndpoint && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-yellow-600" />
            <span className="text-yellow-800">
              Probando: <code className="bg-yellow-100 px-1 rounded">{currentEndpoint}</code>
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">
            Resultados ({results.length}/{endpointsParaSaldos.length})
          </h4>
          
          {resultadosOrdenados.map((resultado, index) => (
            <div
              key={`${resultado.path}-${index}`}
              className={`p-4 rounded-lg border ${getStatusColor(resultado.status)}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(resultado.status)}
                  <div>
                    <div className="font-medium text-gray-900">
                      {resultado.name}
                    </div>
                    <code className="text-sm text-gray-600">
                      {resultado.path}
                    </code>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {resultado.status.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-600">
                    {resultado.priority} priority
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-700 mb-2">
                {resultado.message}
              </div>

              {resultado.data && (
                <div className="text-xs text-gray-600 mb-2">
                  Estructura: {resultado.data}
                </div>
              )}

              {/* Números cercanos encontrados */}
              {resultado.numerosCercanos.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium text-gray-800">
                    Números encontrados:
                  </div>
                  {resultado.numerosCercanos.slice(0, 5).map((numero, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-sm ${
                        numero.esExacto ? 'bg-green-100 text-green-800' :
                        numero.esCercano ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-mono">{numero.path}</span>
                        <span className="font-bold">{formatCurrency(numero.valor)}</span>
                      </div>
                      <div className="text-xs">
                        Error: {numero.porcentaje.toFixed(2)}%
                        {numero.esExacto && <span className="ml-2 font-bold">🎯 EXACTO!</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mostrar datos raw si es una coincidencia exacta */}
              {resultado.status === 'exact_match' && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Ver datos completos
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono overflow-auto max-h-64">
                    <pre>{JSON.stringify(resultado.rawData, null, 2)}</pre>
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {results.length > 0 && !testing && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-800 mb-2">Resumen de Exploración</div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <div className="text-center">
              <div className="font-bold text-green-600">
                {results.filter(r => r.status === 'exact_match').length}
              </div>
              <div>Exactos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-yellow-600">
                {results.filter(r => r.status === 'close_match').length}
              </div>
              <div>Cercanos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-600">
                {results.filter(r => r.status === 'far_match').length}
              </div>
              <div>Lejanos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-400">
                {results.filter(r => r.status === 'success').length}
              </div>
              <div>Exitosos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-600">
                {results.filter(r => r.status === 'empty').length}
              </div>
              <div>Vacíos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-red-600">
                {results.filter(r => r.status === 'error').length}
              </div>
              <div>Errores</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChipaxSaldosExplorer;
