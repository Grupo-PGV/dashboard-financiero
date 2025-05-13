// chipaxAdapter.js
const adaptSaldosBancarios = (response) => {
  console.log('🔄 adaptSaldosBancarios - Iniciando adaptación');
  
  if (!response || !response.arrFlujoCaja) {
    console.warn('⚠️ No se encontraron datos de flujo de caja en la respuesta');
    return [];
  }

  const cuentasBancarias = [];
  
  response.arrFlujoCaja.forEach(flujo => {
    if (flujo.idCuentaCorriente) {
      cuentasBancarias.push({
        id: flujo.idCuentaCorriente,
        banco: flujo.nombreCuenta || `Cuenta ${flujo.idCuentaCorriente}`,
        numeroCuenta: flujo.idCuentaCorriente.toString(),
        tipo: 'cuenta_corriente',
        moneda: 'CLP',
        saldo: flujo.saldoPeriodo || 0,
        disponible: flujo.saldoPeriodo || 0,
      });
    }
  });

  console.log(`✅ Cuentas bancarias adaptadas: ${cuentasBancarias.length}`);
  return cuentasBancarias;
};

const adaptCuentasPendientes = (facturas) => {
  console.log('🔄 adaptCuentasPendientes - Datos recibidos:', facturas);
  
  if (!facturas || !facturas.items) {
    console.warn('⚠️ No se recibieron facturas para adaptar');
    return [];
  }

  console.log('🔄 Items a procesar:', facturas.items.length);
  
  return facturas.items.map(factura => {
    const montoPorCobrar = factura.montoTotal - (factura.montoPagado || 0);
    
    return {
      id: factura.id,
      cliente: {
        rut: factura.rutReceptor,
        nombre: factura.razonSocial || factura.cliente || 'Cliente sin nombre'
      },
      numeroFactura: factura.folio,
      fechaEmision: factura.fechaEmision,
      fechaVencimiento: factura.fechaVencimiento || factura.fechaEmision,
      montoTotal: factura.montoTotal || 0,
      saldo: montoPorCobrar > 0 ? montoPorCobrar : 0,
      estado: factura.estado || 'pendiente',
      diasVencido: calcularDiasVencido(factura.fechaVencimiento || factura.fechaEmision)
    };
  }).filter(cuenta => cuenta.saldo > 0);
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
  
  // Limpiar horas para comparar solo fechas
  hoy.setHours(0, 0, 0, 0);
  fechaVenc.setHours(0, 0, 0, 0);
  
  // Calcula la diferencia en días
  const diffTime = hoy.getTime() - fechaVenc.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};
const adaptCuentasPorPagar = (facturas) => {
  // Verificar formato de entrada
  if (!facturas) {
    console.warn('adaptCuentasPorPagar: Input no válido', facturas);
    return [];
  }

  // Determinar si estamos usando el formato de items o el formato de array directo
  const items = Array.isArray(facturas) ? facturas : (facturas.items || []);
  
  if (!items || !Array.isArray(items)) {
    console.warn('adaptCuentasPorPagar: No se encontraron facturas válidas');
    return [];
  }
  
  console.log(`🔄 Adaptando ${items.length} facturas por pagar`);
  
  // Adaptar cada factura con campos más flexibles
  const facturasAdaptadas = items.map(factura => {
    // Calcular el monto total de manera flexible
    const montoTotal = factura.total || 
                      factura.monto_total || 
                      factura.montoTotal || 
                      factura.monto || 
                      factura.totalFacturado || 
                      0;
    
    // Para el saldo, si no existe campo específico, asumir que es el total
    const saldoPendiente = factura.saldo || 
                          factura.monto_por_pagar || 
                          factura.montoPorPagar ||
                          factura.saldoPendiente ||
                          montoTotal; // Si no hay campo de saldo, usar el total
    
    // Obtener proveedor de manera flexible
    const nombreProveedor = factura.proveedor?.nombre || 
                           factura.proveedor || 
                           factura.nombre_proveedor || 
                           factura.nombreProveedor ||
                           'Proveedor no especificado';
                           
    const rutProveedor = factura.proveedor?.rut || 
                        factura.rut_proveedor || 
                        factura.rutProveedor ||
                        factura.proveedor_rut ||
                        'Sin RUT';
    
    return {
      id: factura.id || factura._id || String(Math.random()),
      folio: factura.folio || factura.numero || factura.numeroFactura || 'Sin folio',
      proveedor: {
        nombre: nombreProveedor,
        rut: rutProveedor
      },
      montoTotal: parseFloat(montoTotal),
      saldo: parseFloat(saldoPendiente),
      moneda: factura.moneda || factura.currency || 'CLP',
      fechaEmision: factura.fecha_emision || factura.fechaEmision || factura.fecha || factura.created_at || new Date().toISOString(),
      fechaVencimiento: factura.fecha_vencimiento || factura.fechaVencimiento || factura.due_date || null,
      fechaPago: factura.fechaPagoInterna || factura.fecha_pago || null,
      diasVencidos: calcularDiasVencidos(factura.fecha_vencimiento || factura.fechaVencimiento || factura.due_date),
      estado: factura.estado || factura.status || 'Pendiente',
      estadoPago: factura.estado_pago || factura.estadoPago || 'Pendiente',
      observaciones: factura.observaciones || factura.notas || ''
    };
  });
  
  console.log(`✅ Facturas adaptadas: ${facturasAdaptadas.length}`);
  
  // Mostrar resumen
  const totalPorPagar = facturasAdaptadas.reduce((sum, f) => sum + f.saldo, 0);
  console.log(`💰 Total por pagar: ${totalPorPagar.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
  
  return facturasAdaptadas;
};

const adaptFacturasPendientesAprobacion = (facturas) => {
  console.log('🔄 adaptFacturasPendientesAprobacion - Datos recibidos:', facturas);
  
  if (!facturas || !Array.isArray(facturas)) {
    console.warn('⚠️ No se recibieron facturas pendientes para adaptar');
    return [];
  }

  return facturas.map(factura => ({
    id: factura.id,
    folio: factura.folio,
    proveedor: factura.razonSocial || factura.proveedor,
    fecha: factura.fechaEmision || factura.fecha,
    monto: factura.montoTotal || factura.monto || 0,
    estado: factura.estado || 'pendiente_aprobacion',
    tipo: factura.tipo || 'compra'
  }));
};

const adaptFlujoCaja = (response, saldoInicial = 0) => {
  console.log('🔄 adaptFlujoCaja - Datos recibidos:', response);
  
  if (!response || !response.arrFlujoCaja) {
    console.warn('⚠️ No se encontraron datos de flujo de caja');
    return [];
  }

  const flujoCaja = [];
  let saldoAcumulado = saldoInicial;

  response.arrFlujoCaja.forEach(flujo => {
    saldoAcumulado += (flujo.ingresos || 0) - (flujo.egresos || 0);
    
    flujoCaja.push({
      fecha: flujo.fecha || flujo.periodo,
      ingresos: flujo.ingresos || 0,
      egresos: flujo.egresos || 0,
      saldo: saldoAcumulado,
      descripcion: flujo.descripcion || ''
    });
  });

  return flujoCaja;
};

const adaptEgresosProgramados = (pagos) => {
  console.log('🔄 adaptEgresosProgramados - Datos recibidos:', pagos);
  
  if (!pagos || !Array.isArray(pagos)) {
    console.warn('⚠️ No se recibieron pagos programados para adaptar');
    return [];
  }

  return pagos.map(pago => ({
    id: pago.id,
    fecha: pago.fechaProgramada || pago.fecha,
    proveedor: pago.razonSocial || pago.proveedor,
    descripcion: pago.descripcion || `Pago a ${pago.razonSocial || pago.proveedor}`,
    monto: pago.monto || 0,
    estado: pago.estado || 'programado',
    tipo: pago.tipo || 'pago_proveedor'
  }));
};

const adaptBancos = (response) => {
  console.log('🔄 adaptBancos - Iniciando adaptación de bancos');
  
  if (!response || !response.arrFlujoCaja) {
    return [];
  }

  const bancosUnicos = {};
  
  response.arrFlujoCaja.forEach(flujo => {
    if (flujo.idCuentaCorriente && flujo.nombreCuenta) {
      bancosUnicos[flujo.idCuentaCorriente] = {
        id: flujo.idCuentaCorriente,
        nombre: flujo.nombreCuenta,
        tipo: 'cuenta_corriente'
      };
    }
  });

  return Object.values(bancosUnicos);
};

// Funciones auxiliares
const calcularDiasVencido = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diferencia = hoy - vencimiento;
  
  return Math.floor(diferencia / (1000 * 60 * 60 * 24));
};

// Exportar todas las funciones
export default {
  adaptSaldosBancarios,
  adaptCuentasPendientes,
  adaptCuentasPorPagar,
  adaptFacturasPendientesAprobacion,
  adaptFlujoCaja,
  adaptEgresosProgramados,
  adaptBancos
};


