// ChipaxSyncMonitor.jsx - Monitor de sincronización en tiempo real
import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, Loader, XCircle } from 'lucide-react';

const ChipaxSyncMonitor = ({ isActive = false, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    activeRequests: []
  });

  useEffect(() => {
    if (!isActive) return;

    // Interceptar console.log para capturar logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog(...args);
      const message = args.join(' ');
      if (message.includes('Chipax') || message.includes('📊') || message.includes('🔍') || message.includes('✅') || message.includes('❌')) {
        addLog('info', message);
      }
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args.join(' '));
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warning', args.join(' '));
    };

    // Interceptar fetch para monitorear peticiones
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options] = args;
      const requestId = Date.now();
      const startTime = Date.now();
      
      // Solo monitorear peticiones a Chipax
      if (url.includes('chipax.com') || url.includes('/v2/')) {
        updateActiveRequests(requestId, url, 'start');
      }

      try {
        const response = await originalFetch(...args);
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (url.includes('chipax.com') || url.includes('/v2/')) {
          updateActiveRequests(requestId, url, 'end', response.ok, duration);
          updateStats(response.ok, duration);
        }

        return response;
      } catch (error) {
        if (url.includes('chipax.com') || url.includes('/v2/')) {
          updateActiveRequests(requestId, url, 'error');
          updateStats(false, Date.now() - startTime);
        }
        throw error;
      }
    };

    // Restaurar al desmontar
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      window.fetch = originalFetch;
    };
  }, [isActive]);

  const addLog = (type, message) => {
    setLogs(prev => [...prev.slice(-50), {
      id: Date.now(),
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const updateActiveRequests = (id, url, status, success = true, duration = 0) => {
    setStats(prev => {
      const updated = { ...prev };
      
      if (status === 'start') {
        updated.activeRequests = [...updated.activeRequests, {
          id,
          url: url.replace('https://api.chipax.com', ''),
          startTime: Date.now(),
          status: 'active'
        }];
      } else {
        updated.activeRequests = updated.activeRequests.map(req => 
          req.id === id 
            ? { ...req, status, duration, success }
            : req
        ).filter(req => req.status === 'active' || Date.now() - req.startTime < 5000);
      }
      
      return updated;
    });
  };

  const updateStats = (success, duration) => {
    setStats(prev => ({
      ...prev,
      totalRequests: prev.totalRequests + 1,
      successfulRequests: success ? prev.successfulRequests + 1 : prev.successfulRequests,
      failedRequests: !success ? prev.failedRequests + 1 : prev.failedRequests,
      averageResponseTime: Math.round(
        (prev.averageResponseTime * prev.totalRequests + duration) / (prev.totalRequests + 1)
      )
    }));
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Activity className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-700 bg-red-50';
      case 'warning': return 'text-yellow-700 bg-yellow-50';
      case 'success': return 'text-green-700 bg-green-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed bottom-0 right-0 w-96 h-96 bg-white shadow-2xl rounded-tl-lg border-l border-t border-gray-200 flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-600" />
          Monitor de Sincronización
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      {/* Estadísticas */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total peticiones:</span>
            <span className="ml-2 font-medium">{stats.totalRequests}</span>
          </div>
          <div>
            <span className="text-gray-600">Tiempo promedio:</span>
            <span className="ml-2 font-medium">{stats.averageResponseTime}ms</span>
          </div>
          <div>
            <span className="text-green-600">Exitosas:</span>
            <span className="ml-2 font-medium">{stats.successfulRequests}</span>
          </div>
          <div>
            <span className="text-red-600">Fallidas:</span>
            <span className="ml-2 font-medium">{stats.failedRequests}</span>
          </div>
        </div>
      </div>

      {/* Peticiones activas */}
      {stats.activeRequests.length > 0 && (
        <div className="p-3 border-b border-gray-200 bg-blue-50">
          <p className="text-sm font-medium text-blue-800 mb-2">Peticiones activas:</p>
          <div className="space-y-1">
            {stats.activeRequests.map(req => (
              <div key={req.id} className="flex items-center text-xs">
                <Loader className="w-3 h-3 mr-2 animate-spin text-blue-600" />
                <span className="truncate">{req.url}</span>
                <span className="ml-auto text-gray-500">
                  {Math.round((Date.now() - req.startTime) / 1000)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {logs.map(log => (
          <div
            key={log.id}
            className={`flex items-start space-x-2 p-2 rounded text-xs ${getLogColor(log.type)}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getLogIcon(log.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="break-words">{log.message}</p>
              <p className="text-gray-500 mt-1">{log.timestamp}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Indicador de actividad */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Estado:</span>
          <span className="flex items-center">
            {stats.activeRequests.length > 0 ? (
              <>
                <Activity className="w-4 h-4 mr-1 text-green-500 animate-pulse" />
                <span className="text-green-600">Sincronizando...</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 mr-1 text-gray-400" />
                <span className="text-gray-600">En espera</span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChipaxSyncMonitor;
