import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Loader, Database, Eye } from 'lucide-react';

const ChipaxSaldosDebugger = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

  // Configuración de la API
  const CHIPAX_API_URL = 'https://api.chipax.com/v2';
  const APP_ID = '605e0aa5-ca0c-4513-b6ef-0030ac1f0849';
  const SECRET_KEY = 'f01974df-86e1-45a0-924f-75961ea926fc';

  // Función para obtener el token
  const getChipaxToken = async () => {
    try {
      const response = await fetch(`${CHIPAX_API_URL}/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          app_id: APP_ID, 
          secret_key: SECRET_KEY 
        })
      });

      if (!response.ok) {
        throw new Error(`Error de autenticación: ${response.status}`);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      throw error;
    }
  };

  // Función para hacer peticiones a la API
  const fetchFromChipax = async (endpoint) => {
    const token = await getChipaxToken();
    const url = endpoint.startsWith('http') ? endpoint : `${CHIPAX_API_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `JWT ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  };

  // Función para obtener todas las páginas
  const fetchAllPaginatedData = async (endpoint) => {
    let allItems = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const separator = endpoint.includes('?') ? '&' : '?';
      const paginatedEndpoint = `${endpoint}${separator}page=${page}&limit=50`;
      
      const data = await fetchFromChipax(paginatedEndpoint);
      
      if (data.items && Array.isArray(data.items)) {
        allItems = [...allItems, ...data.items];
        
        if (data.paginationAttributes) {
          hasMore = data.paginationAttributes.currentPage < data.paginationAttributes.totalPages;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      
      page++;
      if (page > 10) break; // Límite de seguridad
    }
    
    return { items: allItems };
  };

  // Función para analizar la estructura de los datos
  const analizarEstructuraCuentas = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('🔍 Iniciando análisis de estructura de cuentas corrientes...');
      
      // 1. Obtener datos crudos del endpoint
      const response = await fetchAllPaginatedData('/cuentas-corrientes');
      setRawData(response);
      
      if (!response.items || response.items.length === 0) {
        setResults({
          error: 'No se encontraron cuentas corrientes',
          totalCuentas: 0
        });
        return;
      }

      // 2. Analizar la estructura de la primera cuenta
      const primeraCuenta = response.items[0];
      const camposDisponibles = Object.keys(primeraCuenta);
      
      // 3. Buscar campos que podrían contener saldos
      const posiblesCamposSaldo = camposDisponibles.filter(campo => 
        campo.toLowerCase().includes('saldo') ||
        campo.toLowerCase().includes('balance') ||
        campo.toLowerCase().includes('monto') ||
        campo.toLowerCase().includes('total') ||
        campo.toLowerCase().includes('amount')
      );

      // 4. Verificar si hay objetos anidados
      const objetosAnidados = {};
      camposDisponibles.forEach(campo => {
        if (typeof primeraCuenta[campo] === 'object' && primeraCuenta[campo] !== null && !Array.isArray(primeraCuenta[campo])) {
          objetosAnidados[campo] = Object.keys(primeraCuenta[campo]);
        }
      });

      // 5. Intentar obtener saldos de diferentes fuentes
      const cuentasConSaldos = response.items.map(cuenta => {
        let saldoEncontrado = null;
        let fuenteSaldo = 'No encontrado';

        // Buscar en campos directos
        if (cuenta.saldo !== undefined && cuenta.saldo !== null) {
          saldoEncontrado = cuenta.saldo;
          fuenteSaldo = 'campo: saldo';
        } else if (cuenta.saldoContable !== undefined && cuenta.saldoContable !== null) {
          saldoEncontrado = cuenta.saldoContable;
          fuenteSaldo = 'campo: saldoContable';
        } else if (cuenta.saldoDisponible !== undefined && cuenta.saldoDisponible !== null) {
          saldoEncontrado = cuenta.saldoDisponible;
          fuenteSaldo = 'campo: saldoDisponible';
        } else if (cuenta.balance !== undefined && cuenta.balance !== null) {
          saldoEncontrado = cuenta.balance;
          fuenteSaldo = 'campo: balance';
        }

        // Buscar en objetos anidados
        if (saldoEncontrado === null && cuenta.Saldo) {
          if (typeof cuenta.Saldo === 'object') {
            saldoEncontrado = cuenta.Saldo.saldo || cuenta.Saldo.monto || cuenta.Saldo.valor;
            fuenteSaldo = 'objeto: Saldo';
          } else {
            saldoEncontrado = cuenta.Saldo;
            fuenteSaldo = 'campo: Saldo';
          }
        }

        return {
          id: cuenta.id,
          numeroCuenta: cuenta.numeroCuenta || cuenta.numero || 'Sin número',
          banco: cuenta.banco || cuenta.Banco?.nombre || 'Sin banco',
          saldoEncontrado,
          fuenteSaldo,
          camposOriginales: Object.keys(cuenta).length
        };
      });

      // 6. Preparar resultados del análisis
      setResults({
        totalCuentas: response.items.length,
        camposDisponibles,
        posiblesCamposSaldo,
        objetosAnidados,
        cuentasConSaldos,
        ejemploCuentaCompleta: primeraCuenta
      });

    } catch (error) {
      console.error('❌ Error en análisis:', error);
      setResults({
        error: error.message,
        totalCuentas: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para probar endpoints alternativos
  const probarEndpointsAlternativos = async () => {
    setLoading(true);
    const endpointsParaProbar = [
      '/cuentas-corrientes?incluirSaldo=true',
      '/cuentas-corrientes?withBalance=true',
      '/cuentas-corrientes/saldos',
      '/saldos-bancarios',
      '/bancos/saldos',
      '/flujo-caja/saldos',
      '/cartolas/saldos-actuales'
    ];

    const resultadosPruebas = [];

    for (const endpoint of endpointsParaProbar) {
      try {
        console.log(`🔍 Probando: ${endpoint}`);
        const response = await fetchFromChipax(endpoint);
        resultadosPruebas.push({
          endpoint,
          status: 'success',
          data: response
        });
      } catch (error) {
        resultadosPruebas.push({
          endpoint,
          status: 'error',
          error: error.message
        });
      }
    }

    setResults(prev => ({
      ...prev,
      pruebasEndpoints: resultadosPruebas
    }));
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <Database className="mr-2" />
          Debug: Saldos Bancarios Chipax
        </h2>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={analizarEstructuraCuentas}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
          >
            {loading ? <Loader className="animate-spin mr-2" size={16} /> : <Search className="mr-2" size={16} />}
            Analizar Estructura de Cuentas
          </button>

          <button
            onClick={probarEndpointsAlternativos}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
          >
            Probar Endpoints Alternativos
          </button>
        </div>

        {results && (
          <div className="space-y-6">
            {/* Resumen general */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">📊 Resumen del Análisis</h3>
              {results.error ? (
                <p className="text-red-600">Error: {results.error}</p>
              ) : (
                <div className="space-y-2 text-sm">
                  <p>✅ Total de cuentas encontradas: <strong>{results.totalCuentas}</strong></p>
                  <p>📋 Campos disponibles: <strong>{results.camposDisponibles?.length || 0}</strong></p>
                  <p>💰 Posibles campos de saldo: <strong>{results.posiblesCamposSaldo?.join(', ') || 'Ninguno'}</strong></p>
                </div>
              )}
            </div>

            {/* Análisis de saldos por cuenta */}
            {results.cuentasConSaldos && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">💳 Análisis de Saldos por Cuenta</h3>
                <div className="space-y-2">
                  {results.cuentasConSaldos.map((cuenta, index) => (
                    <div key={cuenta.id} className="bg-white p-3 rounded border">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{cuenta.numeroCuenta}</p>
                          <p className="text-sm text-gray-600">{cuenta.banco}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {cuenta.saldoEncontrado !== null 
                              ? `$${cuenta.saldoEncontrado.toLocaleString('es-CL')}`
                              : '❌ Sin saldo'
                            }
                          </p>
                          <p className="text-xs text-gray-500">{cuenta.fuenteSaldo}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Objetos anidados */}
            {results.objetosAnidados && Object.keys(results.objetosAnidados).length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">🔍 Objetos Anidados Encontrados</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(results.objetosAnidados).map(([objeto, campos]) => (
                    <div key={objeto} className="bg-white p-2 rounded">
                      <p className="font-medium">{objeto}:</p>
                      <p className="text-gray-600 ml-4">{campos.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ejemplo de cuenta completa */}
            {results.ejemploCuentaCompleta && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">📄 Estructura Completa de una Cuenta (ejemplo)</h3>
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === 'ejemplo' ? null : 'ejemplo')}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Eye size={20} />
                  </button>
                </div>
                {expandedIndex === 'ejemplo' && (
                  <pre className="bg-gray-800 text-white p-4 rounded text-xs overflow-x-auto">
                    {JSON.stringify(results.ejemploCuentaCompleta, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* Resultados de endpoints alternativos */}
            {results.pruebasEndpoints && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">🧪 Pruebas de Endpoints Alternativos</h3>
                <div className="space-y-2">
                  {results.pruebasEndpoints.map((prueba, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="text-sm font-mono">{prueba.endpoint}</span>
                      {prueba.status === 'success' ? (
                        <CheckCircle className="text-green-500" size={20} />
                      ) : (
                        <XCircle className="text-red-500" size={20} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChipaxSaldosDebugger;
