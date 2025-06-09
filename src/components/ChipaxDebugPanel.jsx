import React, { useState } from 'react';
import { Bug, Play, Copy, AlertCircle } from 'lucide-react';
import chipaxService from '../services/chipaxService';

const ChipaxDebugPanel = () => {
  const [debugLog, setDebugLog] = useState('');
  const [testing, setTesting] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const runDebugTest = async () => {
    setTesting(true);
    setDebugLog('🚀 Iniciando test de debug...\n\n');
    
    // Capturar logs de consola
    const originalLog = console.log;
    const originalError = console.error;
    const logs = [];
    
    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      logs.push(message);
      originalLog(...args);
    };
    
    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      logs.push('❌ ' + message);
      originalError(...args);
    };
    
    try {
      // Información del entorno
      logs.push('📱 === INFORMACIÓN DEL ENTORNO ===');
      logs.push(`🌐 URL actual: ${window.location.href}`);
      logs.push(`🌐 Origen: ${window.location.origin}`);
      logs.push(`📅 Fecha/Hora: ${new Date().toLocaleString()}`);
      logs.push(`🖥️ User Agent: ${navigator.userAgent}`);
      logs.push('');
      
      // Test de conexión
      await chipaxService.testConnection();
      
    } catch (error) {
      logs.push(`\n❌ ERROR GENERAL: ${error.message}`);
    } finally {
      // Restaurar console
      console.log = originalLog;
      console.error = originalError;
      
      // Actualizar log
      setDebugLog(logs.join('\n'));
      setTesting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(debugLog);
    alert('Log copiado al portapapeles');
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="fixed bottom-4 right-4 bg-orange-500 text-white p-3 rounded-full shadow-lg hover:bg-orange-600 z-50"
        title="Abrir panel de debug"
      >
        <Bug size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[600px] bg-white rounded-lg shadow-2xl border z-50">
      <div className="p-4 border-b flex justify-between items-center bg-orange-50">
        <h3 className="font-semibold flex items-center gap-2">
          <Bug size={20} />
          Debug Chipax API
        </h3>
        <button
          onClick={() => setShowPanel(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="p-4">
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
            <div className="text-sm">
              <p className="font-medium text-yellow-800">Instrucciones:</p>
              <ol className="text-yellow-700 mt-1 list-decimal list-inside">
                <li>Abre la consola del navegador (F12)</li>
                <li>Ve a la pestaña "Console"</li>
                <li>Haz clic en "Ejecutar Test"</li>
                <li>Copia el log y compártelo para debug</li>
              </ol>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mb-4">
          <button
            onClick={runDebugTest}
            disabled={testing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            <Play size={16} />
            {testing ? 'Ejecutando...' : 'Ejecutar Test'}
          </button>
          <button
            onClick={copyToClipboard}
            disabled={!debugLog}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
          >
            <Copy size={16} />
            Copiar
          </button>
        </div>
        
        {debugLog && (
          <div className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-auto max-h-80">
            <pre className="text-xs font-mono whitespace-pre-wrap">{debugLog}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChipaxDebugPanel;
