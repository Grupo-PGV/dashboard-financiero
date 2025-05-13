// excelExportService.js
/**
 * Servicio para exportar datos a Excel
 * Utiliza la biblioteca SheetJS (xlsx)
 */

/**
 * Exporta datos a un archivo Excel
 * @param {Array} data - Datos a exportar
 * @param {string} filename - Nombre del archivo
 * @param {Object} options - Opciones adicionales
 */
export const exportToExcel = (data, filename, options = {}) => {
  // Importación dinámica de la biblioteca SheetJS
  import('xlsx').then(XLSX => {
    // Validar datos
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('Datos no válidos para exportar a Excel');
      return;
    }

    // Formatear el nombre del archivo
    const formattedFilename = filename || 'export';
    const fullFilename = formattedFilename.endsWith('.xlsx') 
      ? formattedFilename 
      : `${formattedFilename}.xlsx`;

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new();
    
    // Opciones de formato
    const defaultOptions = {
      sheetName: 'Datos',
      includeHeaders: true,
      dateFormat: 'dd/mm/yyyy'
    };
    
    const mergedOptions = { ...defaultOptions, ...options };

    // Procesamiento especial para fechas
    const processedData = data.map(item => {
      const newItem = { ...item };
      Object.keys(newItem).forEach(key => {
        if (newItem[key] instanceof Date) {
          newItem[key] = formatDate(newItem[key], mergedOptions.dateFormat);
        }
      });
      return newItem;
    });

    // Crear hoja de trabajo
    const worksheet = XLSX.utils.json_to_sheet(processedData, {
      header: Object.keys(processedData[0] || {}),
      skipHeader: !mergedOptions.includeHeaders
    });

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, mergedOptions.sheetName);

    // Guardar archivo
    XLSX.writeFile(workbook, fullFilename);
  }).catch(error => {
    console.error('Error al cargar la biblioteca SheetJS:', error);
  });
};

/**
 * Exporta saldos bancarios a Excel
 * @param {Array} saldosBancarios - Datos de saldos bancarios
 * @param {string} filename - Nombre del archivo (opcional)
 */
export const exportSaldosBancarios = (saldosBancarios, filename = 'saldos_bancarios') => {
  // Preparar datos para exportación
  const dataToExport = saldosBancarios.map(cuenta => ({
    'Cuenta': cuenta.nombre,
    'Banco': cuenta.banco,
    'Tipo': cuenta.tipo,
    'Saldo': cuenta.saldo,
    'Moneda': cuenta.moneda,
    'Último Movimiento': cuenta.ultimoMovimiento
  }));
  
  // Exportar a Excel
  exportToExcel(dataToExport, filename, {
    sheetName: 'Saldos Bancarios'
  });
};

/**
 * Exporta cuentas por cobrar a Excel
 * @param {Array} cuentasPendientes - Datos de cuentas por cobrar
 * @param {string} filename - Nombre del archivo (opcional)
 */
export const exportCuentasPendientes = (cuentasPendientes, filename = 'cuentas_por_cobrar') => {
  // Calcular días vencidos
  const getDiasVencidos = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);
    
    const diffTime = hoy - vencimiento;
    return diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
  };
  
  // Preparar datos para exportación
  const dataToExport = cuentasPendientes.map(cuenta => ({
    'Folio': cuenta.folio,
    'Cliente': cuenta.cliente.nombre,
    'RUT Cliente': cuenta.cliente.rut,
    'Monto Total': cuenta.monto,
    'Saldo Pendiente': cuenta.saldo,
    'Moneda': cuenta.moneda,
    'Fecha Emisión': cuenta.fechaEmision,
    'Fecha Vencimiento': cuenta.fechaVencimiento,
    'Días Vencidos': getDiasVencidos(cuenta.fechaVencimiento),
    'Estado': cuenta.estado
  }));
  
  // Exportar a Excel
  exportToExcel(dataToExport, filename, {
    sheetName: 'Cuentas por Cobrar'
  });
};

/**
 * Exporta cuentas por pagar a Excel
 * @param {Array} cuentasPorPagar - Datos de cuentas por pagar
 * @param {string} filename - Nombre del archivo (opcional)
 */
export const exportCuentasPorPagar = (cuentasPorPagar, filename = 'cuentas_por_pagar') => {
  // Calcular días para vencimiento
  const getDiasParaVencimiento = (fechaVencimiento) => {
    if (!fechaVencimiento) return null;
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);
    
    const diffTime = vencimiento - hoy;
    return diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
  };
  
  // Preparar datos para exportación
  const dataToExport = cuentasPorPagar.map(cuenta => ({
    'Folio': cuenta.folio,
    'Proveedor': cuenta.proveedor.nombre,
    'RUT Proveedor': cuenta.proveedor.rut,
    'Monto Total': cuenta.monto,
    'Saldo Pendiente': cuenta.saldo,
    'Moneda': cuenta.moneda,
    'Fecha Emisión': cuenta.fechaEmision,
    'Fecha Vencimiento': cuenta.fechaVencimiento,
    'Días para Vencimiento': getDiasParaVencimiento(cuenta.fechaVencimiento),
    'Estado': cuenta.estado
  }));
  
  // Exportar a Excel
  exportToExcel(dataToExport, filename, {
    sheetName: 'Cuentas por Pagar'
  });
};

/**
 * Exporta facturas pendientes a Excel
 * @param {Array} facturasPendientes - Datos de facturas pendientes
 * @param {string} filename - Nombre del archivo (opcional)
 */
export const exportFacturasPendientes = (facturasPendientes, filename = 'facturas_pendientes') => {
  // Preparar datos para exportación
  const dataToExport = facturasPendientes.map(factura => ({
    'Folio': factura.folio,
    'Proveedor': factura.proveedor.nombre,
    'RUT Proveedor': factura.proveedor.rut,
    'Monto': factura.monto,
    'Moneda': factura.moneda,
    'Fecha Emisión': factura.fechaEmision,
    'Fecha Recepción': factura.fechaRecepcion,
    'Días en Espera': factura.diasEnEspera,
    'Responsable': factura.responsableAprobacion,
    'Estado': factura.estado
  }));
  
  // Exportar a Excel
  exportToExcel(dataToExport, filename, {
    sheetName: 'Facturas Pendientes'
  });
};

/**
 * Exporta flujo de caja a Excel
 * @param {Object} flujoCaja - Datos de flujo de caja
 * @param {string} filename - Nombre del archivo (opcional)
 */
export const exportFlujoCaja = (flujoCaja, filename = 'flujo_de_caja') => {
  if (!flujoCaja || !flujoCaja.periodos || !Array.isArray(flujoCaja.periodos)) {
    console.error('Datos de flujo de caja no válidos');
    return;
  }
  
  // Preparar datos para exportación
  const dataToExport = flujoCaja.periodos.map(periodo => ({
    'Período': periodo.mes ? `${periodo.mes} ${periodo.anio}` : formatDate(periodo.fecha, 'mm/yyyy'),
    'Ingresos': periodo.ingresos,
    'Egresos': periodo.egresos,
    'Flujo Neto': periodo.flujoNeto,
    'Saldo Acumulado': periodo.saldoAcumulado
  }));
  
  // Agregar fila con totales
  const totalIngresos = flujoCaja.periodos.reduce((sum, p) => sum + p.ingresos, 0);
  const totalEgresos = flujoCaja.periodos.reduce((sum, p) => sum + p.egresos, 0);
  
  dataToExport.push({
    'Período': 'TOTAL',
    'Ingresos': totalIngresos,
    'Egresos': totalEgresos,
    'Flujo Neto': totalIngresos - totalEgresos,
    'Saldo Acumulado': flujoCaja.saldoFinal
  });
  
  // Exportar a Excel
  exportToExcel(dataToExport, filename, {
    sheetName: 'Flujo de Caja'
  });
};

/**
 * Exporta egresos programados a Excel
 * @param {Array} egresosProgramados - Datos de egresos programados
 * @param {string} filename - Nombre del archivo (opcional)
 */
export const exportEgresosProgramados = (egresosProgramados, filename = 'egresos_programados') => {
  // Preparar datos para exportación
  const dataToExport = egresosProgramados.map(egreso => ({
    'Concepto': egreso.concepto,
    'Beneficiario': egreso.beneficiario.nombre,
    'Monto': egreso.monto,
    'Moneda': egreso.moneda,
    'Fecha de Pago': egreso.fechaPago,
    'Días para Pago': egreso.diasParaPago,
    'Categoría': egreso.categoria,
    'Estado': egreso.estado
  }));
  
  // Exportar a Excel
  exportToExcel(dataToExport, filename, {
    sheetName: 'Egresos Programados'
  });
};

/**
 * Formatea una fecha en diferentes formatos
 * @param {Date} date - Fecha a formatear
 * @param {string} format - Formato deseado (dd/mm/yyyy, mm/yyyy, yyyy)
 * @returns {string} - Fecha formateada
 */
const formatDate = (date, format = 'dd/mm/yyyy') => {
  if (!date) return '';
  
  const d = new Date(date);
  
  // Si la fecha no es válida
  if (isNaN(d.getTime())) return '';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format.toLowerCase()) {
    case 'dd/mm/yyyy':
      return `${day}/${month}/${year}`;
    case 'mm/yyyy':
      return `${month}/${year}`;
    case 'yyyy':
      return `${year}`;
    default:
      return `${day}/${month}/${year}`;
  }
};

// Exportaciones principales
export default {
  exportToExcel,
  exportSaldosBancarios,
  exportCuentasPendientes,
  exportCuentasPorPagar,
  exportFacturasPendientes,
  exportFlujoCaja,
  exportEgresosProgramados
};
