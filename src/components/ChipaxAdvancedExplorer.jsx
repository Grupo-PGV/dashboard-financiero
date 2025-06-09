import React, { useState } from 'react';
import { Search, Target, CheckCircle, XCircle, Eye, Zap } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxAdvancedExplorer = () => {
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);
  const [currentEndpoint, setCurrentEndpoint] = useState('');
  const [foundTarget, setFoundTarget] = useState(null);

  const TARGET_AMOUNT = 186648977;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Lista exhaustiva de endpoints avanzados
  const endpointsAvanzados = [
    // Endpoints de flujo de caja y movimientos
    { path: '/flujo-caja', name: 'Flujo de Caja', category: 'high' },
    { path: '/flujo-caja/cartolas', name: 'Cartolas', category: 'high' },
    { path: '/flujo-caja/resumen', name: 'Resumen Flujo', category: 'high' },
    { path: '/cartolas', name: 'Cartolas Direct', category: 'high' },
    { path: '/movimientos', name: 'Movimientos', category: 'high' },
    { path: '/movimientos-bancarios', name: 'Movimientos Bancarios', category: 'high' },
    { path: '/transacciones', name: 'Transacciones', category: 'high' },
    
    // Endpoints de estados de cuenta
    { path: '/estados-cuenta', name: 'Estados de Cuenta', category: 'high' },
    { path: '/extractos', name: 'Extractos', category: 'high' },
    { path: '/extractos-bancarios', name: 'Extractos Bancarios', category: 'high' },
    
    // Endpoints de compañía/empresa
    { path: '/empresa', name: 'Empresa', category: 'medium' },
    { path: '/empresa/saldos', name: 'Empresa Saldos', category: 'medium' },
    { path: '/empresa/finanzas', name: 'Empresa Finanzas', category: 'medium' },
    { path: '/compania', name: 'Compañía', category: 'medium' },
    { path: '/compania/balance', name: 'Compañía Balance', category: 'medium' },
    
    // Endpoints de contabilidad
    { path: '/contabilidad', name: 'Contabilidad', category: 'medium' },
    { path: '/contabilidad/saldos', name: 'Contabilidad Saldos', category: 'medium' },
    { path: '/libro-mayor', name: 'Libro Mayor', category: 'medium' },
    { path: '/libro-diario', name: 'Libro Diario', category: 'medium' },
    { path: '/plan-cuentas', name: 'Plan de Cuentas', category: 'medium' },
    
    // Endpoints de análisis financiero
    { path: '/analisis', name: 'Análisis', category: 'medium' },
    { path: '/analisis/financiero', name: 'Análisis Financiero', category: 'medium' },
    { path: '/indicadores', name: 'Indicadores', category: 'medium' },
    { path: '/indicadores/financieros', name: 'Indicadores Financieros', category: 'medium' },
    { path: '/kpis', name: 'KPIs', category: 'medium' },
    { path: '/metricas', name: 'Métricas', category: 'medium' },
    
    // Endpoints de períodos/fechas
    { path: '/periodo-actual', name: 'Período Actual', category: 'medium' },
    { path: '/balance-periodo', name: 'Balance Período', category: 'medium' },
    { path: '/cierre', name: 'Cierre', category: 'medium' },
    { path: '/cierre/mensual', name: 'Cierre Mensual', category: 'medium' },
    
    // Endpoints con parámetros de fecha
    { path: '/saldos?fecha=2024-12-01', name: 'Saldos con Fecha', category: 'medium' },
    { path: '/balance?fecha=2024-12-01', name: 'Balance con Fecha', category: 'medium' },
    { path: '/cuentas-corrientes?fecha=2024-12-01', name: 'Cuentas con Fecha', category: 'medium' },
    
    // Endpoints de configuración
    { path: '/configuracion', name: 'Configuración', category: 'low' },
    { path: '/configuracion/empresa', name: 'Config Empresa', category: 'low' },
    { path: '/settings', name: 'Settings', category: 'low' },
    { path: '/preferences', name: 'Preferences', category: 'low' },
    
    // Endpoints de usuario
    { path: '/usuario', name: 'Usuario', category: 'low' },
    { path: '/perfil', name: 'Perfil', category: 'low' },
    { path: '/cuenta', name: 'Cuenta', category: 'low' },
    
    // Endpoints menos comunes pero posibles
    { path: '/liquidez', name: 'Liquidez', category: 'low' },
    { path: '/disponible', name: 'Disponible', category: 'low' },
    { path: '/capital-trabajo', name: 'Capital de Trabajo', category: 'low' },
    { path: '/activo-circulante', name: 'Activo Circulante', category: 'low' },
    { path: '/pasivo-circulante', name: 'Pasivo Circulante', category: 'low' },
    
    // Endpoints con diferentes métodos o formatos
    { path: '/api/saldos', name: 'API Saldos', category: 'low' },
    { path: '/v1/saldos', name: 'V1 Saldos', category: 'low' },
    { path: '/v3/saldos', name: 'V3 Saldos', category: 'low' },
    { path: '/admin/saldos', name: 'Admin Saldos', category: 'low' },
    
    // Endpoints específicos de bancos
    { path: '/bci', name: 'BCI', category: 'low' },
    { path: '/santander', name: 'Santander', category: 'low' },
    { path: '/bancoestado', name: 'Banco Estado', category: 'low' },
    { path: '/chile', name: 'Banco de Chile', category: 'low' },
    
    // Endpoints de moneda y conversión
    { path: '/monedas', name: 'Monedas', category: 'low' },
    { path: '/tipos-cambio', name: 'Tipos de Cambio', category: 'low' },
    { path: '/conversiones', name: 'Conversiones', category: 'low' }
  ];

  const buscarValorExacto = (data, path = '') => {
    const resultados = [];
    
    if (typeof data === 'number') {
      const diferencia = Math.abs(data - TARGET_AMOUNT);
      if (diferencia < 10000) { // Buscar valores muy cercanos
        resultados.push({
          path,
          valor: data,
          diferencia,
          porcentaje: (diferencia / TARGET_AMOUNT) * 100,
          esExacto: diferencia < 1000
        });
      }
    } else if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        // Buscar en arrays
        data.forEach((item, index) => {
          resultados.push(...buscarValorExacto(item, `${path}[${index}]`));
        });
        
        // Buscar sumas en arrays
        if (data.length > 0 && typeof data[0] === 'object') {
          const camposNumericos = new Set();
          data.forEach(item => {
            Object.keys(item || {}).forEach(key => {
              if (typeof item[key] === 'number') {
                camposNumericos.add(key);
              }
            });
          });
          
          camposNumericos.forEach(campo => {
            const suma = data.reduce((total, item) => {
              return total + (typeof item[campo] === 'number' ? item[campo] : 0);
            }, 0);
            
            const diferencia = Math.abs(suma - TARGET_AMOUNT);
            if (diferencia < 10000) {
              resultados.push({
                path: `SUM(${campo})`,
                valor: suma,
                diferencia,
                porcentaje: (diferencia / TARGET_AMOUNT) * 100,
                esExacto: diferencia < 1000,
                esSuma: true
              });
            }
          });
        }
      } else {
        // Buscar en objetos
        Object.keys(data).forEach(key => {
          resultados.push(...buscarValorExacto(data[key], path ? `${path}.${key}` : key));
        });
      }
    }
    
    return resultados;
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
          resultados: []
        };
      }

      const resultados = buscarValorExacto(data, endpoint.name);
      const exactos = resultados.filter(r => r.esExacto);
      
      let status = 'success';
      let message = 'Datos obtenidos';
      
      if (exactos.length > 0) {
        status = 'target_found';
        message = `🎯 ¡OBJETIVO ENCONTRADO! ${exactos.length} coincidencia(s)`;
        
        // Marcar como encontrado
        if (!foundTarget) {
          setFoundTarget({
            endpoint: endpoint.path,
            resultados: exactos,
            data
          });
        }
      } else if (resultados.length > 0) {
        const cercanos = resultados.filter(r => r.porcentaje < 5);
        if (cercanos.length > 0) {
          status = 'close';
          message = `🟡 Valores cercanos: ${cercanos.length}`;
        } else {
          status = 'far';
          message = `📊 Valores lejanos: ${resultados.length}`;
        }
      }

      return {
        ...endpoint,
        status,
        message,
        resultados: resultados.slice(0, 3), // Top 3
        dataStructure: Array.isArray(data) ? `Array[${data.length}]` : 
                      typeof data === 'object' ? `Object{${Object.keys(data).length}}` : 
                      String(data),
        rawData: data
      };
      
    } catch (error) {
      return {
        ...endpoint,
        status: 'error',
        message: error.message,
        resultados: []
      };
    }
  };

  const ejecutarExploracionAvanzada = async () => {
    setTesting(true);
    setResults([]);
    setCurrentEndpoint('');
    setFoundTarget(null);

    const resultados = [];

    // Agrupar por categoría
    const porCategoria = {
      high: endpointsAvanzados.filter(e => e.category === 'high'),
      medium: endpointsAvanzados.filter(e => e.category === 'medium'),
      low: endpointsAvanzados.filter(e => e.category === 'low')
    };

    for (const categoria of ['high', 'medium', 'low']) {
      console.log(`🔍 Explorando endpoints de categoría ${categoria}...`);
      
      for (const endpoint of porCategoria[categoria]) {
        const resultado = await probarEndpoint(endpoint);
        resultados.push(resultado);
        setResults([...resultados]);

        // Si encontramos el objetivo, podemos parar
        if (resultado.status === 'target_found') {
          console.log(`🎯 ¡OBJETIVO ENCONTRADO en ${endpoint.path}!`);
          break;
        }

        // Pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // Si ya encontramos el objetivo, parar
      if (foundTarget) break;
    }

    setTesting(false);
    setCurrentEndpoint('');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'target_found':
        return <Target className="w-5 h-5 text-green-500" />;
      case 'close':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'far':
        return <Eye className="w-5 h-5 text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'empty':
        return <Search className="w-5 h-5 text-gray-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Search className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'target_found':
        return 'bg-green-50 border-green-300';
      case 'close':
        return 'bg-yellow-50 border-yellow-300';
      case 'far':
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
      'target_found': 0, 
      'close': 1, 
      'far': 2, 
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
          <Search className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Explorador Avanzado - Búsqueda Exhaustiva
          </h3>
        </div>
        <button
          onClick={ejecutarExploracionAvanzada}
          disabled={testing}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            testing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4" />
            <span>{testing ? 'Explorando...' : 'Búsqueda Exhaustiva'}</span>
          </div>
        </button>
      </div>

      {/* Target Info */}
      <div className="mb-6 p-4 bg-purple-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Target className="w-5 h-5 text-purple-600" />
          <span className="font-medium text-purple-800">Búsqueda Exhaustiva</span>
        </div>
        <p className="text-purple-700">
          Buscando en toda la API: <span className="font-bold">{formatCurrency(TARGET_AMOUNT)}</span>
        </p>
        <p className="text-purple-600 text-sm mt-1">
          Se explorarán {endpointsAvanzados.length} endpoints avanzados y ocultos
        </p>
      </div>

      {/* Found Target */}
      {foundTarget && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <Target className="w-6 h-6 text-green-500" />
            <span className="font-bold text-green-800 text-lg">🎯 ¡OBJETIVO ENCONTRADO!</span>
          </div>
          <div className="space-y-3">
            <p className="font-medium">
              Endpoint: <code className="bg-green-100 px-2 py-1 rounded text-sm">{foundTarget.endpoint}</code>
            </p>
            
            {foundTarget.resultados.map((resultado, index) => (
              <div key={index} className="p-3 bg-green-100 rounded">
                <div className="font-mono text-sm font-medium">
                  {resultado.path}
                </div>
                <div className="text-xl font-bold text-green-800">
                  {formatCurrency(resultado.valor)}
                </div>
                <div className="text-sm text-green-700">
                  Diferencia: {formatCurrency(resultado.diferencia)} ({resultado.porcentaje.toFixed(3)}%)
                </div>
                
                <div className="mt-2 p-2 bg-white rounded">
                  <div className="text-xs font-medium text-green-800">Implementación:</div>
                  <code className="text-xs block mt-1">
                    {resultado.esSuma ? 
                      `// Endpoint: ${foundTarget.endpoint}\n// Calcular suma del campo: ${resultado.path.replace('SUM(', '').replace(')', '')}\nconst total = data.reduce((sum, item) => sum + (item.${resultado.path.replace('SUM(', '').replace(')', '')} || 0), 0);` :
                      `// Endpoint: ${foundTarget.endpoint}\n// Campo directo: ${resultado.path}\nconst saldo = data.${resultado.path};`
                    }
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Status */}
      {testing && currentEndpoint && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 animate-pulse text-yellow-600" />
            <span className="text-yellow-800">
              Explorando: <code className="bg-yellow-100 px-1 rounded">{currentEndpoint}</code>
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900">
            Resultados ({results.length}/{endpointsAvanzados.length})
          </h4>
          
          {resultadosOrdenados.slice(0, 10).map((resultado, index) => (
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
                    {resultado.category}
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-700 mb-2">
                {resultado.message}
              </div>

              {resultado.dataStructure && (
                <div className="text-xs text-gray-600 mb-2">
                  Estructura: {resultado.dataStructure}
                </div>
              )}

              {/* Resultados encontrados */}
              {resultado.resultados.length > 0 && (
                <div className="mt-3 space-y-1">
                  {resultado.resultados.map((res, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-sm ${
                        res.esExacto ? 'bg-green-100 text-green-800' :
                        res.porcentaje < 5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-mono text-xs">{res.path}</span>
                        <span className="font-bold">{formatCurrency(res.valor)}</span>
                      </div>
                      <div className="text-xs">
                        Error: {res.porcentaje.toFixed(2)}%
                        {res.esExacto && <span className="ml-2 font-bold">🎯 EXACTO!</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {results.length > 0 && !testing && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-800 mb-2">Resumen de Exploración Avanzada</div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <div className="text-center">
              <div className="font-bold text-green-600">
                {results.filter(r => r.status === 'target_found').length}
              </div>
              <div>Objetivos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-yellow-600">
                {results.filter(r => r.status === 'close').length}
              </div>
              <div>Cercanos</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-600">
                {results.filter(r => r.status === 'far').length}
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
          
          {!foundTarget && results.length > 0 && (
            <div className="mt-3 p-3 bg-orange-100 rounded border border-orange-300">
              <div className="text-orange-800 text-sm">
                <strong>⚠️ Valor objetivo no encontrado.</strong> Es posible que:
                <ul className="mt-1 list-disc list-inside text-xs">
                  <li>El valor esté en un endpoint no estándar</li>
                  <li>Se requiera autenticación especial</li>
                  <li>Los datos estén en múltiples endpoints que deben combinarse</li>
                  <li>El valor $186.648.977 se calcule dinámicamente en el frontend de Chipax</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChipaxAdvancedExplorer;
