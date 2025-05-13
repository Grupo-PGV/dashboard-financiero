// chipaxAdapter.js
/**
 * Adaptadores para transformar los datos de Chipax al formato requerido por el dashboard
 */

/**
 * Adapta los datos de saldos bancarios
 * @param {Array|Object} data - Datos de saldos bancarios de Chipax
 * @returns {Array} - Datos adaptados para el dashboard
 */
export const adaptSaldosBancarios = (data) => {
  // Verificar formato de entrada
  if (!data || (!Array.isArray(data) && !data.items)) {
    console.warn('adaptSaldosBancarios: Input no válido', data);
    return [];
  }

  // Determinar si estamos usando el formato de items o el formato de array directo
  const items = Array.isArray(data) ? data : (data.items || []);
  
  return items.map(cuenta => ({
    id: cuenta.id || String(Math.random()),
    nombre: cuenta.nombre || cuenta.description || 'Cuenta sin nombre',
    banco: cuenta.banco || cuenta.bank || 'Banco no especificado',
    tipoCuenta: cuenta.tipo || cuenta.accountType || 'No especificado',
    saldo: parseFloat(cuenta.saldo || cuenta.balance || 0),
    moneda: cuenta.moneda || cuenta.currency || 'CLP',
    ultimoMovimiento: cuenta.ultimo_movimiento || cuenta.lastMovement || new Date().toISOString(),
    responsable: cuenta.responsable || cuenta.owner || 'No asignado'
  }));
};

/**
 * Adapta los datos de bancos
 * @param {Array|Object} data - Datos de bancos desde Chipax
 * @returns {Array} - Datos de bancos adaptados
 */
export const adaptBancos = (data) => {
  // Verificar formato de entrada
  if (!data || (!Array.isArray(data) && !data.items)) {
    console.warn('adaptBancos: Input no válido', data);
    return [];
  }

  // Determinar si estamos usando el formato de items o el formato de array directo
  const items = Array.isArray(data) ? data : (data.items || []);
  
  // Extraer bancos únicos
  const bancosSet = new Set();
  
  items.forEach(cuenta => {
    const nombreBanco = cuenta.banco || cuenta.bank || 'Banco no especificado';
    bancosSet.add(nombreBanco);
  });
  
  // Convertir Set a array de objetos
  return Array.from(bancosSet).map(banco => ({
    id: String(Math.random()),
    nombre: banco,
    cuentas: items.filter(cuenta => (cuenta.banco || cuenta.bank) === banco).length,
    saldoTotal: items
      .filter(cuenta => (cuenta.banco || cuenta.bank) === banco)
      .reduce((total, cuenta) => total + parseFloat(cuenta.saldo || cuenta.balance || 0), 0)
  }));
};

/**
 * Adapta los datos de cuentas por cobrar
 * @param {Array|Object} data - Datos de facturas por cobrar desde Chipax
 * @returns {Array} - Datos de cuentas por cobrar adaptados
 */
export const adaptCuentasPendientes = (data) => {
  // Verificar formato de entrada
  if (!data) {
    console.warn('adaptCuentasPendientes: Input no válido', data);
    return [];
  }

  // Determinar si estamos usando el formato de items o el formato de array directo
  const items = Array.isArray(data) ? data : (data.items || []);
  
  if (!items || !Array.isArray(items)) {
    console.warn('adaptCuentasPendientes: Input no válido', data);
    return [];
  }
  
  return items.map(factura => ({
    id: factura.id || String(Math.random()),
    folio: factura.folio || factura.invoice_number || 'Sin folio',
    cliente: factura.cliente || factura.cliente_nombre || factura.customer || 'Cliente no especificado',
    rutCliente: factura.rut_cliente || factura.customer_id || 'Sin RUT',
    monto: parseFloat(factura.monto || factura.total || factura.amount || 0),
    fecha: factura.fecha || factura.date || new Date().toISOString(),
    fechaVencimiento: factura.fecha_vencimiento || factura.due_date || '',
    estado: factura.estado || factura.status || 'Pendiente',
    diasVencidos: calcularDiasVencidos(factura.fecha_vencimiento || factura.due_date),
    moneda: factura.moneda || factura.currency || 'CLP'
  }));
};

/**
 * Adapta los datos de cuentas por pagar
 * @param {Array|Object} data - Datos de facturas por pagar desde Chipax
 * @returns {Array} - Datos de cuentas por pagar adaptados
 */
export const adaptCuentasPorPagar = (data) => {
  // Verificar formato de entrada
  if (!data) {
    console.warn('adaptCuentasPorPagar: Input no válido', data);
    return [];
  }

  // Determinar si estamos usando el formato de items o el formato de array directo
  const items = Array.isArray(data) ? data : (data.items || []);
  
  if (!items || !Array.isArray(items)) {
    console.warn('adaptCuentasPorPagar: Input no válido', data);
    return [];
  }
  
  return items.map(factura => ({
    id: factura.id || String(Math.random()),
    folio: factura.folio || factura.invoice_number || 'Sin folio',
    proveedor: factura.proveedor || factura.proveedor_nombre || factura.vendor || 'Proveedor no especificado',
    rutProveedor: factura.rut_proveedor || factura.vendor_id || 'Sin RUT',
    monto: parseFloat(factura.monto || factura.total || factura.amount || 0),
    fecha: factura.fecha || factura.date || new Date().toISOString(),
    fechaVencimiento: factura.fecha_vencimiento || factura.due_date || '',
    estado: factura.estado || factura.status || 'Pendiente',
    diasVencidos: calcularDiasVencidos(factura.fecha_vencimiento || factura.due_date),
    moneda: factura.moneda || factura.currency || 'CLP'
  }));
};

/**
 * Adapta los datos de facturas pendientes de aprobación
 * @param {Array|Object} data - Datos de facturas pendientes desde Chipax
 * @returns {Array} - Datos de facturas pendientes adaptados
 */
export const adaptFacturasPendientesAprobacion = (data) => {
  // Si hay error 404, retornar array vacío
  if (!data) {
    return [];
  }

  // Determinar si estamos usando el formato de items o el formato de array directo
  const items = Array.isArray(data) ? data : (data.items || []);
  
  if (!items || !Array.isArray(items)) {
    return [];
  }
  
  return items.map(factura => ({
    id: factura.id || String(Math.random()),
    folio: factura.folio || factura.invoice_number || 'Sin folio',
    proveedor: factura.proveedor || factura.proveedor_nombre || factura.vendor || 'Proveedor no especificado',
    rutProveedor: factura.rut_proveedor || factura.vendor_id || 'Sin RUT',
    monto: parseFloat(factura.monto || factura.total || factura.amount || 0),
    fecha: factura.fecha || factura.date || new Date().toISOString(),
    estado: factura.estado || factura.status || 'Pendiente de aprobación',
    solicitante: factura.solicitante || factura.requester || 'No especificado',
    aprobador: factura.aprobador || factura.approver || 'No asignado',
    moneda: factura.moneda || factura.currency || 'CLP'
  }));
};

/**
 * Adapta los datos de flujo de caja
 * @param {Object} data - Datos de flujo de caja desde Chipax
 * @param {number} saldoInicial - Saldo inicial para el cálculo
 * @returns {Object} - Datos de flujo de caja adaptados
 */
export const adaptFlujoCaja = (data, saldoInicial = 0) => {
  if (!data || !data.items) {
    return {
      saldoInicial,
      saldoFinal: saldoInicial,
      periodos: [],
      ingresos: [],
      egresos: []
    };
  }
  
  // Extracción de datos
  const periodos = data.periodos || [];
  const ingresos = data.ingresos || [];
  const egresos = data.egresos || [];
  
  // Cálculo de saldo final
  let saldoFinal = saldoInicial;
  
  // Sumar todos los ingresos
  for (const ingreso of ingresos) {
    saldoFinal += parseFloat(ingreso.monto || 0);
  }
  
  // Restar todos los egresos
  for (const egreso of egresos) {
    saldoFinal -= parseFloat(egreso.monto || 0);
  }
  
  return {
    saldoInicial,
    saldoFinal,
    periodos: periodos.map(periodo => ({
      id: periodo.id || String(Math.random()),
      nombre: periodo.nombre || 'Periodo sin nombre',
      fechaInicio: periodo.fecha_inicio || new Date().toISOString(),
      fechaFin: periodo.fecha_fin || new Date().toISOString(),
      ingresos: parseFloat(periodo.ingresos || 0),
      egresos: parseFloat(periodo.egresos || 0),
      saldo: parseFloat(periodo.saldo || 0)
    })),
    ingresos: ingresos.map(ingreso => ({
      id: ingreso.id || String(Math.random()),
      concepto: ingreso.concepto || 'Ingreso sin concepto',
      categoria: ingreso.categoria || 'Sin categoría',
      monto: parseFloat(ingreso.monto || 0),
      fecha: ingreso.fecha || new Date().toISOString(),
      estado: ingreso.estado || 'Pendiente',
      cliente: ingreso.cliente || 'No especificado',
      moneda: ingreso.moneda || 'CLP'
    })),
    egresos: egresos.map(egreso => ({
      id: egreso.id || String(Math.random()),
      concepto: egreso.concepto || 'Egreso sin concepto',
      categoria: egreso.categoria || 'Sin categoría',
      monto: parseFloat(egreso.monto || 0),
      fecha: egreso.fecha || new Date().toISOString(),
      estado: egreso.estado || 'Pendiente',
      proveedor: egreso.proveedor || 'No especificado',
      moneda: egreso.moneda || 'CLP'
    }))
  };
};

/**
 * Adapta los datos de egresos programados
 * @param {Array|Object} data - Datos de egresos programados desde Chipax
 * @returns {Array} - Datos de egresos programados adaptados
 */
export const adaptEgresosProgramados = (data) => {
  // Si hay error 404, retornar array vacío
  if (!data) {
    return [];
  }

  // Determinar si estamos usando el formato de items o el formato de array directo
  const items = Array.isArray(data) ? data : (data.items || []);
  
  if (!items || !Array.isArray(items)) {
    return [];
  }
  
  return items.map(egreso => ({
    id: egreso.id || String(Math.random()),
    concepto: egreso.concepto || egreso.description || 'Egreso sin concepto',
    categoria: egreso.categoria || egreso.category || 'Sin categoría',
    monto: parseFloat(egreso.monto || egreso.amount || 0),
    fecha: egreso.fecha || egreso.date || new Date().toISOString(),
    fechaPago: egreso.fecha_pago || egreso.payment_date || '',
    estado: egreso.estado || egreso.status || 'Programado',
    proveedor: egreso.proveedor || egreso.vendor || 'No especificado',
    responsable: egreso.responsable || egreso.responsible || 'No asignado',
    moneda: egreso.moneda || egreso.currency || 'CLP'
  }));
};

/**
 * Calcula los días vencidos de una factura
 * @param {string} fechaVencimiento - Fecha de vencimiento en formato ISO
 * @returns {number} - Días vencidos (negativo si aún no vence)
 */
const calcularDiasVencidos = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  
  const hoy = new Date();
  const fechaVenc = new Date(fechaVencimiento);
  
  // Calcula la diferencia en días
  const diffTime = hoy.getTime() - fechaVenc.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

export default {
  adaptSaldosBancarios,
  adaptBancos,
  adaptCuentasPendientes,
  adaptCuentasPorPagar,
  adaptFacturasPendientesAprobacion,
  adaptFlujoCaja,
  adaptEgresosProgramados
};
