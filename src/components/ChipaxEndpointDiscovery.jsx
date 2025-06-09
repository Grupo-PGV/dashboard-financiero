import React, { useState } from 'react';
import { Search, CheckCircle, XCircle, Loader } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxEndpointDiscovery = () => {
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);

  // Lista de posibles endpoints a probar
  const endpointsToTest = [
    // Endpoints más comunes en APIs financieras
    { path: '/bancos', name: 'Bancos' },
    { path: '/banco', name: 'Banco (singular)' },
    { path: '/banks', name: 'Banks (inglés)' },
    { path: '/cuentas_bancarias', name: 'Cuentas Bancarias' },
    { path: '/cuentas-bancarias', name: 'Cuentas Bancarias (guión)' },
    { path: '/cuentas_corrientes', name: 'Cuentas Corrientes' },
    { path: '/bank_accounts', name: 'Bank Accounts' },
    { path: '/accounts', name: 'Accounts' },
    { path: '/saldos', name: 'Saldos' },
    { path: '/balances', name: 'Balances' },
    
    // Facturas y documentos
    { path: '/facturas', name: 'Facturas' },
    { path: '/invoices', name: 'Invoices' },
    { path: '/ventas', name: 'Ventas' },
    { path: '/sales', name: 'Sales' },
    { path: '/compras', name: 'Compras' },
    { path: '/purchases', name: 'Purchases' },
    { path: '/documentos', name: 'Documentos' },
    { path: '/documents', name: 'Documents' },
    { path: '/dtes', name: 'DTEs' },
    { path: '/dte', name: 'DTE (singular)' },
    
    // Clientes y proveedores
    { path: '/clientes', name: 'Clientes' },
    { path: '/customers', name: 'Customers' },
    { path: '/proveedores', name: 'Proveedores' },
    { path: '/suppliers', name: 'Suppliers' },
    { path: '/vendors', name: 'Vendors' },
    
    // Otros posibles
    { path: '/empresa', name: 'Empresa' },
    { path: '/company', name: 'Company' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/resumen', name: 'Resumen' },
    { path: '/summary', name: 'Summary' },
    { path: '/reports', name: 'Reports' },
    { path: '/movimientos', name: 'Movimientos' },
    { path: '/transactions', name: 'Transactions' },
    { path: '/flujo_caja', name: 'Flujo de Caja' },
    { path: '/cash_flow', name: 'Cash Flow' },
    
    // Endpoints que podrían devolver información de la API
    { path: '/', name: 'Raíz' },
    { path: '/api', name: 'API Info' },
    { path: '/endpoints', name: 'Endpoints' },
    { path: '/help', name: 'Help' },
    { path: '/docs', name: 'Docs' }
  ];

  const testEndpoints = async () => {
    setTesting(true);
    setResults([]);
    
    console.log('🔍 Iniciando descubrimiento de endpoints...');
    
    for (const endpoint of endpointsToTest) {
      try {
        setResults(prev => [...prev, { ...endpoint, status: 'testing' }]);
        
        const response = await chipaxService.fetchFromChipax(
          endpoint.path + '?limit=1', 
          {}, 
          false // No mostrar logs detallados
        );
        
        // Si llegamos aquí, el endpoint existe
        setResults(prev => 
          prev.map(r => 
            r.path === endpoint.path 
              ? { 
                  ...r, 
                  status: 'success', 
                  response: response,
                  hasData: Array.isArray(response) || response.items || response.data
                } 
              : r
          )
        );
        
        console.log(`✅ ${endpoint.path} - ENCONTRADO`);
        
      } catch (error) {
        // El endpoint no existe o hay otro error
        const errorStatus = error.message.includes('404') ? 'not_found' : 'error';
        
        setResults(prev => 
          prev.map(r => 
            r.path === endpoint.path 
              ? { ...r, status: errorStatus, error: error.message } 
              : r
          )
        );
        
        if (errorStatus !== 'not_found') {
          console.log(`❌ ${endpoint.path} - ERROR: ${error.message}`);
        }
      }
      
      // Pequeña pausa para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setTesting(false);
    console.log('✅ Descubrimiento completado');
  };

  const successfulEndpoints = results.filter(r => r.status === 'success');

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Descubrimiento de Endpoints Chipax</h2>
        <button
          onClick={testEndpoints}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {testing ? (
            <>
              <Loader className="animate-spin" size={16} />
              Probando...
            </>
          ) : (
            <>
              <Search size={16} />
              Iniciar Búsqueda
            </>
          )}
        </button>
      </div>

      {testing && (
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <p className="text-sm text-blue-700">
            Probando {results.length} de {endpointsToTest.length} endpoints...
          </p>
        </div>
      )}

      {successfulEndpoints.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 rounded">
          <h3 className="font-medium text-green-800 mb-2">
            ✅ Endpoints encontrados: {successfulEndpoints.length}
          </h3>
          <div className="space-y-2">
            {successfulEndpoints.map(endpoint => (
              <div key={endpoint.path} className="text-sm">
                <span className="font-mono bg-green-100 px-2 py-1 rounded">
                  {endpoint.path}
                </span>
                <span className="ml-2 text-green-700">{endpoint.name}</span>
                {endpoint.hasData && (
                  <span className="ml-2 text-xs text-green-600">(contiene datos)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {results.map(result => (
          <div 
            key={result.path}
            className={`flex items-center justify-between p-2 rounded ${
              result.status === 'success' ? 'bg-green-50' :
              result.status === 'testing' ? 'bg-blue-50' :
              result.status === 'not_found' ? 'bg-gray-50' :
              'bg-red-50'
            }`}
          >
            <div className="flex items-center gap-2">
              {result.status === 'success' && <CheckCircle className="text-green-500" size={16} />}
              {result.status === 'testing' && <Loader className="text-blue-500 animate-spin" size={16} />}
              {result.status === 'not_found' && <XCircle className="text-gray-400" size={16} />}
              {result.status === 'error' && <XCircle className="text-red-500" size={16} />}
              
              <span className="font-mono text-sm">{result.path}</span>
              <span className="text-sm text-gray-600">- {result.name}</span>
            </div>
            
            <span className={`text-xs ${
              result.status === 'success' ? 'text-green-600' :
              result.status === 'not_found' ? 'text-gray-500' :
              result.status === 'error' ? 'text-red-600' :
              'text-blue-600'
            }`}>
              {result.status === 'success' ? 'Encontrado' :
               result.status === 'testing' ? 'Probando...' :
               result.status === 'not_found' ? '404' :
               'Error'}
            </span>
          </div>
        ))}
      </div>

      {!testing && results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Haz clic en "Iniciar Búsqueda" para descubrir los endpoints disponibles</p>
        </div>
      )}
    </div>
  );
};

export default ChipaxEndpointDiscovery;
