// AccountsReceivableTable.jsx
import React, { useState, useEffect } from 'react';
import { CalendarDays, Filter, Download, ArrowUp, ArrowDown, Clock, AlertCircle, CheckCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Componente para mostrar y gestionar las cuentas por cobrar
 * 
 * @param {Object} props
 * @param {Array} props.cuentas - Lista de cuentas por cobrar
 * @param {boolean} props.loading - Indica si está cargando los datos
 * @param {Function} props.onExportData - Función para exportar datos
 * @param {Function} props.onFilterChange - Función al cambiar el filtro
 */
const AccountsReceivableTable = ({ 
  cuentas = [], 
  loading = false, 
  onExportData,
  onFilterChange
}) => {
  // Estados para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('fechaVencimiento');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredCuentas, setFilteredCuentas] = useState([]);
  
  // Items por página
  const itemsPerPage = 10;
  
  // Formatear moneda
  const formatCurrency = (amount, currency = 'CLP') => {
    if (!amount && amount !== 0) return '$0';
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
  
  // Calcular días restantes
  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  // Obtener estado visual
  const getStatusClass = (dueDate) => {
    const days = getDaysRemaining(dueDate);
    if (days < -30) return 'text-red-600';
    if (days < 0) return 'text-orange-600';
    if (days < 7) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  const getStatusIcon = (dueDate) => {
    const days = getDaysRemaining(dueDate);
    if (days < 0) return <AlertCircle size={16} />;
    if (days < 7) return <Clock size={16} />;
    return <CheckCircle size={16} />;
  };
  
  const getStatusText = (dueDate) => {
    const days = getDaysRemaining(dueDate);
    if (days < -30) return `Vencida hace ${Math.abs(days)} días`;
    if (days < 0) return `Vencida hace ${Math.abs(days)} días`;
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `Vence en ${days} días`;
  };
  
  // Manejar ordenamiento
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Efecto para filtrar y ordenar
  useEffect(() => {
    if (loading) return;
    
    let filtered = [...cuentas];
    
    // Aplicar filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(cuenta => 
        cuenta.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cuenta.folio?.toString().includes(searchTerm) ||
        cuenta.clienteInfo?.rut?.includes(searchTerm)
      );
    }
    
    // Aplicar filtro de estado
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        filtered = filtered.filter(cuenta => getDaysRemaining(cuenta.fechaVencimiento) < 0);
      } else if (statusFilter === 'upcoming') {
        filtered = filtered.filter(cuenta => getDaysRemaining(cuenta.fechaVencimiento) >= 0);
      }
    }
    
    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      let valueA = a[sortField];
      let valueB = b[sortField];
      
      // Manejar valores nulos
      if (valueA === null || valueA === undefined) valueA = '';
      if (valueB === null || valueB === undefined) valueB = '';
      
      // Convertir fechas para comparación
      if (sortField === 'fechaVencimiento' || sortField === 'fechaEmision') {
        valueA = new Date(valueA).getTime();
        valueB = new Date(valueB).getTime();
      }
      
      // Realizar comparación
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredCuentas(filtered);
    
    // Volver a la primera página al cambiar los filtros
    setCurrentPage(1);
  }, [cuentas, sortField, sortDirection, searchTerm, statusFilter, loading]);
  
  // Calcular paginación
  const totalPages = Math.ceil(filteredCuentas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredCuentas.slice(startIndex, endIndex);
  
  // Cambiar página
  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  
  // Calcular total de cuentas por cobrar
  const totalPorCobrar = filteredCuentas.reduce((sum, cuenta) => sum + (cuenta.saldo || 0), 0);
  
  // Calcular número de cuentas vencidas
  const cuentasVencidas = filteredCuentas.filter(cuenta => getDaysRemaining(cuenta.fechaVencimiento) < 0).length;
  
  // Generar array de páginas a mostrar
  const getPaginationItems = () => {
    const items = [];
    const maxPages = 5; // Número máximo de páginas a mostrar
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(i);
    }
    
    return items;
  };
  
  // Manejar cambio de filtro de estado
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    if (onFilterChange) {
      onFilterChange({ status, search: searchTerm });
    }
  };
  
  // Manejar cambio de búsqueda
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    if (onFilterChange) {
      onFilterChange({ status: statusFilter, search: e.target.value });
    }
  };
  
  // Renderizar tabla de cuentas por cobrar
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
        <div className="h-64 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <CalendarDays size={20} className="mr-2 text-blue-600" />
              Cuentas por Cobrar
            </h2>
            <p className="text-sm text-gray-500">
              Gestiona tus facturas y cuentas pendientes de cobro
            </p>
          </div>
          
          {onExportData && (
            <button 
              className="flex items-center text-sm py-1 px-3 border border-gray-300 rounded hover:bg-gray-50 mt-2 md:mt-0"
              onClick={onExportData}
            >
              <Download size={16} className="mr-1" />
              Exportar
            </button>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row justify-between space-y-2 md:space-y-0">
          {/* Estadísticas */}
          <div className="flex space-x-4">
            <div className="text-center px-3 py-1 bg-blue-50 rounded border border-blue-100">
              <p className="text-xs text-blue-700">Total</p>
              <p className="font-medium text-blue-900">{formatCurrency(totalPorCobrar)}</p>
            </div>
            <div className="text-center px-3 py-1 bg-red-50 rounded border border-red-100">
              <p className="text-xs text-red-700">Vencidas</p>
              <p className="font-medium text-red-900">{cuentasVencidas}</p>
            </div>
          </div>
          
          {/* Filtros */}
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
            <div className="relative">
              <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-8 pr-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-3 py-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="overdue">Vencidas</option>
              <option value="upcoming">Por vencer</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Folio
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Cliente
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">
                Monto
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">
                Saldo
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Emisión
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Vencimiento
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {currentItems.length > 0 ? (
              currentItems.map((cuenta, index) => (
                <tr key={cuenta.id || index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {cuenta.folio || cuenta.numeroFactura || 'Sin folio'}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {cuenta.cliente || 'Cliente desconocido'}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {cuenta.clienteInfo?.rut || 'Sin RUT'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(cuenta.monto || cuenta.montoTotal, cuenta.moneda)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(cuenta.saldo, cuenta.moneda)}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(cuenta.fechaEmision)}
                  </td>
                  <td className="px-4 py-3">
                    {formatDate(cuenta.fechaVencimiento)}
                  </td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center ${getStatusClass(cuenta.fechaVencimiento)}`}>
                      {getStatusIcon(cuenta.fechaVencimiento)}
                      <span className="ml-1">{getStatusText(cuenta.fechaVencimiento)}</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-4 py-6 text-center text-gray-500">
                  No hay cuentas por cobrar que coincidan con los filtros seleccionados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Paginación */}
      {filteredCuentas.length > 0 && (
        <div className="px-4 py-3 flex items-center justify-between border-t">
          <div className="text-xs text-gray-500">
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredCuentas.length)} de {filteredCuentas.length} resultados
          </div>
          
          <div className="flex space-x-1">
            <button
              className={`p-1 rounded ${
                currentPage === 1 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </button>
            
            {getPaginationItems().map(page => (
              <button
                key={page}
                className={`px-2 py-1 rounded text-sm ${
                  currentPage === page
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}
            
            <button
              className={`p-1 rounded ${
                currentPage === totalPages 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsReceivableTable;
