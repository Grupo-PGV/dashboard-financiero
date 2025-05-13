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
  
  // Calcular días restantes a partir de la fecha de vencimiento
  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const vencimiento = new Date(dueDate);
    vencimiento.setHours(0, 0, 0, 0);
    
    const diffTime = vencimiento - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Obtener clase de estilo según los días restantes
  const getStatusClass = (vencimiento) => {
    const days = getDaysRemaining(vencimiento);
    
    if (days === null) return 'text-gray-500';
    if (days < 0) return 'text-red-600';
    if (days <= 5) return 'text-amber-600';
    if (days <= 15) return 'text-blue-600';
    return 'text-green-600';
  };
  
  // Obtener texto de estado según los días restantes
  const getStatusText = (vencimiento) => {
    const days = getDaysRemaining(vencimiento);
    
    if (days === null) return 'Sin fecha';
    if (days < 0) return `Vencido (${Math.abs(days)} días)`;
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `Vence en ${days} días`;
  };
  
  // Obtener icono de estado
  const getStatusIcon = (vencimiento) => {
    const days = getDaysRemaining(vencimiento);
    
    if (days === null) return <Clock size={16} className="text-gray-500" />;
    if (days < 0) return <AlertCircle size={16} className="text-red-600" />;
    if (days <= 5) return <Clock size={16} className="text-amber-600" />;
    if (days <= 15) return <Clock size={16} className="text-blue-600" />;
    return <CheckCircle size={16} className="text-green-600" />;
  };
  
  // Cambiar orden de la tabla
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Render de la flecha de ordenamiento
  const renderSortArrow = (field) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' 
      ? <ArrowUp size={14} className="ml-1" /> 
      : <ArrowDown size={14} className="ml-1" />;
  };
  
  // Filtrar y ordenar cuentas
  useEffect(() => {
    if (loading) return;
    
    let filtered = [...cuentas];
    
    // Aplicar filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(cuenta => 
        cuenta.cliente.nombre.toLowerCase().includes(term) ||
        cuenta.cliente.rut.toLowerCase().includes(term) ||
        cuenta.folio.toString().toLowerCase().includes(term)
      );
    }
    
    // Aplicar filtro de estado
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        filtered = filtered.filter(cuenta => getDaysRemaining(cuenta.fechaVencimiento) < 0);
      } else if (statusFilter === 'due-soon') {
        filtered = filtered.filter(cuenta => {
          const days = getDaysRemaining(cuenta.fechaVencimiento);
          return days >= 0 && days <= 5;
        });
      } else if (statusFilter === 'upcoming') {
        filtered = filtered.filter(cuenta => {
          const days = getDaysRemaining(cuenta.fechaVencimiento);
          return days > 5;
        });
      }
    }
    
    // Ordenar las cuentas
    filtered.sort((a, b) => {
      let valueA, valueB;
      
      // Determinar los valores a comparar según el campo
      switch (sortField) {
        case 'fechaVencimiento':
          valueA = a.fechaVencimiento ? new Date(a.fechaVencimiento).getTime() : Infinity;
          valueB = b.fechaVencimiento ? new Date(b.fechaVencimiento).getTime() : Infinity;
          break;
        case 'cliente':
          valueA = a.cliente.nombre.toLowerCase();
          valueB = b.cliente.nombre.toLowerCase();
          break;
        case 'folio':
          valueA = parseInt(a.folio) || 0;
          valueB = parseInt(b.folio) || 0;
          break;
        case 'monto':
          valueA = a.monto || 0;
          valueB = b.monto || 0;
          break;
        case 'saldo':
          valueA = a.saldo || 0;
          valueB = b.saldo || 0;
          break;
        default:
          valueA = a[sortField];
          valueB = b[sortField];
      }
      
      // Comparar según la dirección de ordenamiento
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
  const totalPorCobrar = filteredCuentas.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
  
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
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-8 pr-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-full"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <Search size={16} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            <div className="relative">
              <select
                className="pl-7 pr-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="overdue">Vencidos</option>
                <option value="due-soon">Vencimiento próximo</option>
                <option value="upcoming">Próximos</option>
              </select>
              <Filter size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-700 text-sm">
            <tr>
              <th 
                className="px-4 py-2 text-left font-medium cursor-pointer hover:text-blue-600"
                onClick={() => handleSort('folio')}
              >
                <div className="flex items-center">
                  Folio
                  {renderSortArrow('folio')}
                </div>
              </th>
              <th 
                className="px-4 py-2 text-left font-medium cursor-pointer hover:text-blue-600"
                onClick={() => handleSort('cliente')}
              >
                <div className="flex items-center">
                  Cliente
                  {renderSortArrow('cliente')}
                </div>
              </th>
              <th 
                className="px-4 py-2 text-right font-medium cursor-pointer hover:text-blue-600"
                onClick={() => handleSort('monto')}
              >
                <div className="flex items-center justify-end">
                  Monto
                  {renderSortArrow('monto')}
                </div>
              </th>
              <th 
                className="px-4 py-2 text-right font-medium cursor-pointer hover:text-blue-600"
                onClick={() => handleSort('saldo')}
              >
                <div className="flex items-center justify-end">
                  Saldo
                  {renderSortArrow('saldo')}
                </div>
              </th>
              <th 
                className="px-4 py-2 text-left font-medium cursor-pointer hover:text-blue-600"
                onClick={() => handleSort('fechaEmision')}
              >
                <div className="flex items-center">
                  Emisión
                  {renderSortArrow('fechaEmision')}
                </div>
              </th>
              <th 
                className="px-4 py-2 text-left font-medium cursor-pointer hover:text-blue-600"
                onClick={() => handleSort('fechaVencimiento')}
              >
                <div className="flex items-center">
                  Vencimiento
                  {renderSortArrow('fechaVencimiento')}
                </div>
              </th>
              <th className="px-4 py-2 text-left font-medium">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm divide-y divide-gray-100">
            {currentItems.length > 0 ? (
              currentItems.map((cuenta) => (
                <tr key={cuenta.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{cuenta.folio}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{cuenta.cliente.nombre}</p>
                      <p className="text-gray-500 text-xs">{cuenta.cliente.rut}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(cuenta.monto, cuenta.moneda)}
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
