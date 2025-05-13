// PendingInvoicesComponent.jsx
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, FileText, User, Calendar, DollarSign, Search } from 'lucide-react';

/**
 * Componente para mostrar y gestionar las facturas pendientes de aprobación
 * 
 * @param {Object} props
 * @param {Array} props.facturas - Lista de facturas pendientes
 * @param {boolean} props.loading - Indica si está cargando los datos
 * @param {Function} props.onApprove - Función al aprobar una factura
 * @param {Function} props.onReject - Función al rechazar una factura
 */
const PendingInvoicesComponent = ({ 
  facturas = [], 
  loading = false,
  onApprove,
  onReject
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFactura, setSelectedFactura] = useState(null);
  
  // Filtrar facturas según término de búsqueda
  const filteredFacturas = facturas.filter(factura => 
    factura.proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    factura.folio.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Formatear moneda
  const formatCurrency = (amount, currency = 'CLP') => {
    return new Intl.NumberFormat('es-CL', { 
      style: 'currency', 
      currency,
      maximumFractionDigits: currency === 'CLP' ? 0 : 2
    }).format(amount);
  };
  
  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CL');
  };
  
  // Abrir detalle de factura
  const handleVerDetalle = (factura) => {
    setSelectedFactura(factura);
  };
  
  // Cerrar detalle de factura
  const handleCerrarDetalle = () => {
    setSelectedFactura(null);
  };
  
  // Aprobar factura
  const handleAprobar = (facturaId) => {
    if (onApprove) {
      onApprove(facturaId);
    }
    handleCerrarDetalle();
  };
  
  // Rechazar factura
  const handleRechazar = (facturaId) => {
    if (onReject) {
      onReject(facturaId);
    }
    handleCerrarDetalle();
  };
  
  // Obtener color para días de espera
  const getDiasEsperaColor = (dias) => {
    if (dias > 5) return 'text-red-600';
    if (dias > 3) return 'text-amber-600';
    return 'text-gray-500';
  };
  
  // Render de skeleton durante carga
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(index => (
            <div key={index} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText size={20} className="mr-2 text-blue-600" />
              Facturas Pendientes de Aprobación
            </h2>
            <p className="text-sm text-gray-500">
              Gestiona las facturas que requieren tu aprobación
            </p>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-8 pr-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>
      
      {filteredFacturas.length > 0 ? (
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredFacturas.map((factura) => (
              <div 
                key={factura.id} 
                className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer"
                onClick={() => handleVerDetalle(factura)}
              >
                <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                  <div className="font-medium text-gray-900 flex items-center">
                    <FileText size={16} className="mr-2 text-blue-600" />
                    Factura #{factura.folio}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    factura.diasEnEspera > 5 
                      ? 'bg-red-100 text-red-800' 
                      : factura.diasEnEspera > 3 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-gray-100 text-gray-800'
                  }`}>
                    {factura.diasEnEspera} días
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="mb-2 flex items-start">
                    <User size={16} className="mr-2 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{factura.proveedor.nombre}</p>
                      <p className="text-xs text-gray-500">{factura.proveedor.rut}</p>
                    </div>
                  </div>
                  
                  <div className="mb-2 flex items-center">
                    <Calendar size={16} className="mr-2 text-gray-400" />
                    <div className="text-sm">
                      {formatDate(factura.fechaEmision)}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <DollarSign size={16} className="mr-2 text-gray-400" />
                    <div className="text-sm font-medium">
                      {formatCurrency(factura.monto, factura.moneda)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
            <FileText size={24} className="text-gray-400" />
          </div>
          <h3 className="text-gray-900 font-medium mb-1">No hay facturas pendientes</h3>
          <p className="text-gray-500 text-sm">
            Todas las facturas han sido procesadas o no hay facturas que coincidan con tu búsqueda.
          </p>
        </div>
      )}
      
      {/* Modal de detalle de factura */}
      {selectedFactura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg overflow-hidden">
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">
                Detalle de Factura #{selectedFactura.folio}
              </h3>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={handleCerrarDetalle}
              >
                &times;
              </button>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Proveedor</p>
                  <p className="font-medium">{selectedFactura.proveedor.nombre}</p>
                  <p className="text-sm text-gray-600">{selectedFactura.proveedor.rut}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Monto</p>
                  <p className="font-medium">{formatCurrency(selectedFactura.monto, selectedFactura.moneda)}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fecha de emisión</p>
                  <p className="font-medium">{formatDate(selectedFactura.fechaEmision)}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fecha de recepción</p>
                  <p className="font-medium">{formatDate(selectedFactura.fechaRecepcion)}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Responsable</p>
                  <p className="font-medium">{selectedFactura.responsableAprobacion}</p>
                </div>
                
                <div>
                  <p className="text-xs text-gray-500 mb-1">Estado</p>
                  <p className="font-medium">{selectedFactura.estado}</p>
                </div>
              </div>
              
              <div className="flex items-center mb-4">
                <Clock size={16} className={`mr-1 ${getDiasEsperaColor(selectedFactura.diasEnEspera)}`} />
                <span className={`text-sm ${getDiasEsperaColor(selectedFactura.diasEnEspera)}`}>
                  {selectedFactura.diasEnEspera} días en espera de aprobación
                </span>
              </div>
              
              <div className="flex justify-end space-x-2 border-t pt-4 mt-2">
                <button
                  className="px-4 py-2 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                  onClick={() => handleRechazar(selectedFactura.id)}
                >
                  <AlertTriangle size={16} className="mr-1 text-red-500" />
                  Rechazar
                </button>
                
                <button
                  className="px-4 py-2 bg-blue-600 rounded text-sm text-white hover:bg-blue-700 flex items-center"
                  onClick={() => handleAprobar(selectedFactura.id)}
                >
                  <CheckCircle2 size={16} className="mr-1" />
                  Aprobar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingInvoicesComponent;
