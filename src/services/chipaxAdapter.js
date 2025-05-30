// chipaxAdapter.js - Versión mejorada con mejor manejo de datos paginados
console.log('🔧 Cargando chipaxAdapter mejorado...');

/**
 * 🏦 Adapta datos de saldos bancarios desde el flujo de caja
 */
const adaptSaldosBancarios = (response) => {
  console.log('🔄 adaptSaldosBancarios - Iniciando adaptación');
  console.log('📊 Datos recibidos:', response);
  
  if (!response || !response.arrFlujoCaja) {
    console.warn('⚠️ No se encontraron datos de flujo de caja en la respuesta');
    return [];
  }

  const cuentasBancarias = [];
  
  response.arrFlujoCaja.forEach((flujo, index) => {
    if (flujo.idCuentaCorriente) {
      const cuenta = {
        id: flujo.idCuentaCorriente,
        nombre: flujo.nombreCuenta || `Cuenta ${flujo.idCuentaCorriente}`,
        banco: flujo.nombreBanco || flujo.nombreCuenta || `Banco ${flujo.idCuentaCorriente}`,
        numeroCuenta: flujo.idCuentaCorriente.toString(),
        tipo: 'cuenta_corriente',
        moneda: 'CLP',
        saldo: flujo.saldoPeriodo || 0,
        disponible: flujo.saldoPeriodo || 0,
        ultimoMovimiento: flujo.fechaUltimoMovimiento || new Date().toISOString()
      };
      
      cuentasBancarias.push(cuenta);
      console.log(`✅ Cuenta ${index + 1}: ${cuenta.nombre} - ${cuenta.saldo.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
    }
  });

  console.log(`✅ Saldos bancarios adaptados: ${cuentasBancarias.length} cuentas`);
  console.log(`💰 Total en saldos: ${cuentasBancarias.reduce((sum, c) => sum + c.saldo, 0).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
  
  return cuentasBancarias;
};

/**
 * 📋 Adapta cuentas por cobrar desde facturas de venta
 */
const adaptCuentasPendientes = (facturas) => {
  console.log('🔄 adaptCuentasPendientes - Iniciando adaptación');
  console.log('📊 Tipo de datos recibidos:', typeof facturas, Array.isArray(facturas));
  
  if (!facturas) {
    console.warn('⚠️ No se recibieron datos para adaptar');
    return [];
  }

  // Manejar diferentes formatos de respuesta
  let items = [];
  if (Array.isArray(facturas)) {
    items = facturas;
  } else if (facturas.items && Array.isArray(facturas.items)) {
    items = facturas.items;
    console.log('📄 Información de paginación detectada:', facturas.paginationInfo);
  } else if (facturas.data && Array.isArray(facturas.data)) {
    items = facturas.data;
  } else {
    console.warn('⚠️ Formato de datos no reconocido:', facturas);
    return [];
  }

  console.log(`📊 Items a procesar: ${items.length}`);
  
  if (items.length === 0) {
    console.warn('⚠️ No hay facturas para procesar');
    return [];
  }

  // Mostrar estructura de la primera factura para debugging
  if (items.length > 0) {
    console.log('🔍 Estructura de primera factura:', JSON.stringify(items[0], null, 2));
  }

  const cuentasAdaptadas = items.map((factura, index) => {
    try {
      // Extraer información del cliente de manera flexible
      const clienteInfo = {
        rut: factura.rutReceptor || 
             factura.rut_receptor || 
             factura.cliente?.rut || 
             factura.rut_cliente || 
             'Sin RUT',
        nombre: factura.razonSocial || 
                factura.razon_social || 
                factura.cliente?.nombre || 
                factura.nombre_cliente || 
                factura.cliente || 
                'Cliente sin nombre'
      };

      // Calcular montos de manera flexible
      const montoTotal = parseFloat(factura.montoTotal || 
                                  factura.monto_total || 
                                  factura.total || 
                                  factura.monto || 
                                  0);

      const montoPagado = parseFloat(factura.montoPagado || 
                                   factura.monto_pagado || 
                                   factura.pagado || 
                                   0);

      const saldoPendiente = montoTotal - montoPagado;

      // Obtener fechas
      const fechaEmision = factura.fechaEmision || 
                          factura.fecha_emision || 
                          factura.fecha || 
                          factura.created_at;

      const fechaVencimiento = factura.fechaVencimiento || 
                              factura.fecha_vencimiento || 
                              factura.due_date || 
                              fechaEmision;

      const cuentaAdaptada = {
        id: factura.id || factura._id || `cxc_${index}`,
        cliente: clienteInfo,
        folio: factura.folio || factura.numero || factura.numeroFactura || 'Sin folio',
        fechaEmision: fechaEmision,
        fechaVencimiento: fechaVencimiento,
        monto: montoTotal,
        saldo: saldoPendiente > 0 ? saldoPendiente : 0,
        moneda: factura.moneda || factura.currency || 'CLP',
        estado: factura.estado || factura.status || 'pendiente',
        diasVencidos: calcularDiasVencidos(fechaVencimiento),
        // Campos adicionales para debugging
        _originalData: {
          hasMontoTotal: !!factura.montoTotal,
          hasMontoPagado: !!factura.montoPagado,
          originalMonto: factura.montoTotal || factura.total,
          originalPagado: factura.montoPagado || factura.pagado
        }
      };

      return cuentaAdaptada;
    } catch (error) {
      console.error(`❌ Error adaptando factura ${index}:`, error, factura);
      return null;
    }
  }).filter(cuenta => cuenta !== null && cuenta.saldo > 0); // Solo cuentas con saldo pendiente

  // Estadísticas de adaptación
  console.log(`✅ Cuentas por cobrar adaptadas: ${cuentasAdaptadas.length}/${items.length}`);
  
  if (cuentasAdaptadas.length > 0) {
    const totalPorCobrar = cuentasAdaptadas.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    const vencidas = cuentasAdaptadas.filter(c => c.diasVencidos > 0).length;
    
    console.log(`💰 Total por cobrar: ${totalPorCobrar.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
    console.log(`⚠️ Facturas vencidas: ${vencidas}/${cuentasAdaptadas.length}`);
    
    // Mostrar distribución por rangos de días
    const rangos = {
      'Al día': 0,
      '1-30 días': 0,
      '31-60 días': 0,
      'Más de 60 días': 0
    };
    
    cuentasAdaptadas.forEach(cuenta => {
      const dias = cuenta.diasVencidos;
      if (dias <= 0) rangos['Al día']++;
      else if (dias <= 30) rangos['1-30 días']++;
      else if (dias <= 60) rangos['31-60 días']++;
      else rangos['Más de 60 días']++;
    });
    
    console.log('📊 Distribución por vencimiento:', rangos);
  }
  
  return cuentasAdaptadas;
};

/**
 * 🛒 Adapta cuentas por pagar desde facturas de compra (MEJORADO)
 */
const adaptCuentasPorPagar = (facturas) => {
  console.log('🔄 adaptCuentasPorPagar - Iniciando adaptación mejorada');
  console.log('📊 Tipo de datos recibidos:', typeof facturas, Array.isArray(facturas));

  if (!facturas) {
    console.warn('⚠️ No se recibieron datos para adaptar');
    return [];
  }

  // Manejar diferentes formatos de respuesta (igual que en cuentas por cobrar)
  let items = [];
  if (Array.isArray(facturas)) {
    items = facturas;
  } else if (facturas.items && Array.isArray(facturas.items)) {
    items = facturas.items;
    console.log('📄 Información de paginación detectada:', facturas.paginationInfo);
    
    // Mostrar info detallada de paginación
    if (facturas.paginationInfo) {
      console.log(`📊 Paginación - Páginas: ${facturas.paginationInfo.totalPagesLoaded}/${facturas.paginationInfo.totalPagesRequested}`);
      console.log(`📈 Completitud: ${facturas.paginationInfo.completenessPercent.toFixed(1)}%`);
      console.log(`📋 Items esperados vs obtenidos: ${facturas.paginationInfo.totalItemsExpected} vs ${facturas.paginationInfo.totalItemsLoaded}`);
    }
  } else if (facturas.data && Array.isArray(facturas.data)) {
    items = facturas.data;
  } else {
    console.warn('⚠️ Formato de datos no reconocido:', facturas);
    return [];
  }

  console.log(`📊 Facturas de compra a procesar: ${items.length}`);
  
  if (items.length === 0) {
    console.warn('⚠️ No hay facturas de compra para procesar');
    return [];
  }

  // Debugging: mostrar estructura de primera factura
  if (items.length > 0) {
    console.log('🔍 Estructura de primera factura de compra:');
    const first = items[0];
    console.log('   ID:', first.id);
    console.log('   Folio:', first.folio);
    console.log('   Estado:', first.estado);
    console.log('   Estado pago:', first.estado_pago);
    console.log('   Total:', first.total);
    console.log('   Saldo:', first.saldo);
    console.log('   Proveedor:', first.proveedor);
    console.log('   RUT proveedor:', first.rut_proveedor);
  }

  // Adaptar cada factura con manejo robusto de errores
  const facturasAdaptadas = items.map((factura, index) => {
    try {
      // 1. Obtener monto total de manera flexible
      const montoTotal = parseFloat(factura.total || 
                                  factura.monto_total || 
                                  factura.montoTotal || 
                                  factura.monto || 
                                  factura.totalFacturado || 
                                  0);

      // 2. Calcular saldo pendiente
      let saldoPendiente;
      if (factura.saldo !== undefined && factura.saldo !== null) {
        saldoPendiente = parseFloat(factura.saldo);
      } else if (factura.monto_por_pagar !== undefined) {
        saldoPendiente = parseFloat(factura.monto_por_pagar);
      } else if (factura.montoPorPagar !== undefined) {
        saldoPendiente = parseFloat(factura.montoPorPagar);
      } else {
        // Si no hay campo específico de saldo, asumir que es el total
        // A menos que esté marcada como pagada
        const estaPagada = factura.pagada === true || 
                          factura.pagado === true || 
                          factura.estado_pago === 'pagado' ||
                          factura.estado_pago === 'Pagado';
        
        saldoPendiente = estaPagada ? 0 : montoTotal;
      }

      // 3. Obtener información del proveedor de manera flexible
      let nombreProveedor = 'Proveedor no especificado';
      let rutProveedor = 'Sin RUT';

      if (factura.proveedor) {
        if (typeof factura.proveedor === 'string') {
          nombreProveedor = factura.proveedor;
        } else if (typeof factura.proveedor === 'object') {
          nombreProveedor = factura.proveedor.nombre || factura.proveedor.razonSocial || 'Proveedor sin nombre';
          rutProveedor = factura.proveedor.rut || 'Sin RUT';
        }
      } else if (factura.nombre_proveedor) {
        nombreProveedor = factura.nombre_proveedor;
      } else if (factura.razon_social) {
        nombreProveedor = factura.razon_social;
      }

      if (rutProveedor === 'Sin RUT') {
        rutProveedor = factura.rut_proveedor || 
                      factura.rutProveedor || 
                      factura.proveedor_rut || 
                      'Sin RUT';
      }

      // 4. Obtener fechas
      const fechaEmision = factura.fecha_emision || 
                          factura.fechaEmision || 
                          factura.fecha || 
                          factura.created_at || 
                          new Date().toISOString();

      const fechaVencimiento = factura.fecha_vencimiento || 
                              factura.fechaVencimiento || 
                              factura.due_date || 
                              null;

      // 5. Crear objeto adaptado
      const facturaAdaptada = {
        id: factura.id || factura._id || `cxp_${index}`,
        folio: factura.folio || factura.numero || factura.numeroFactura || 'Sin folio',
        proveedor: {
          nombre: nombreProveedor,
          rut: rutProveedor
        },
        monto: montoTotal,
        saldo: Math.max(0, saldoPendiente), // Asegurar que no sea negativo
        moneda: factura.moneda || factura.currency || 'CLP',
        fechaEmision: fechaEmision,
        fechaVencimiento: fechaVencimiento,
        fechaPago: factura.fechaPagoInterna || factura.fecha_pago || null,
        diasVencidos: calcularDiasVencidos(fechaVencimiento),
        estado: factura.estado || factura.status || 'Pendiente',
        estadoPago: factura.estado_pago || factura.estadoPago || 'Pendiente',
        observaciones: factura.observaciones || factura.notas || '',
        // Campos para debugging
        _debug: {
          originalTotal: factura.total,
          originalSaldo: factura.saldo,
          originalEstado: factura.estado,
          originalEstadoPago: factura.estado_pago,
          hasExplicitSaldo: factura.saldo !== undefined
        }
      };

      return facturaAdaptada;
    } catch (error) {
      console.error(`❌ Error adaptando factura de compra ${index}:`, error, factura);
      return null;
    }
  }).filter(factura => factura !== null);

  // 6. Filtrar solo facturas con saldo pendiente
  const facturasPendientes = facturasAdaptadas.filter(factura => factura.saldo > 0);

  // 7. Estadísticas finales
  console.log(`✅ Facturas de compra procesadas:`);
  console.log(`   📊 Total procesadas: ${facturasAdaptadas.length}/${items.length}`);
  console.log(`   💰 Con saldo pendiente: ${facturasPendientes.length}`);
  
  if (facturasPendientes.length > 0) {
    const totalPorPagar = facturasPendientes.reduce((sum, f) => sum + f.saldo, 0);
    const vencidas = facturasPendientes.filter(f => f.diasVencidos > 0).length;
    
    console.log(`   💸 Total por pagar: ${totalPorPagar.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
    console.log(`   ⚠️ Facturas vencidas: ${vencidas}/${facturasPendientes.length}`);
    
    // Mostrar distribución de estados
    const estadosCount = {};
    facturasPendientes.forEach(f => {
      const estado = f.estado || 'sin_estado';
      estadosCount[estado] = (estadosCount[estado] || 0) + 1;
    });
    console.log('   📈 Distribución por estado:', estadosCount);
  }

  return facturasPendientes;
};

/**
 * ⏳ Adapta facturas pendientes de aprobación
 */
const adaptFacturasPendientesAprobacion = (facturas) => {
  console.log('🔄 adaptFacturasPendientesAprobacion - Iniciando adaptación');
  
  if (!facturas || !Array.isArray(facturas)) {
    console.warn('⚠️ No se recibieron facturas pendientes para adaptar');
    return [];
  }

  const facturasAdaptadas = facturas.map((factura, index) => {
    try {
      return {
        id: factura.id || `pendiente_${index}`,
        folio: factura.folio || factura.numero || 'Sin folio',
        proveedor: {
          nombre: factura.razonSocial || factura.proveedor || 'Proveedor sin nombre',
          rut: factura.rutProveedor || factura.rut_proveedor || 'Sin RUT'
        },
        fechaEmision: factura.fechaEmision || factura.fecha || new Date().toISOString(),
        fechaRecepcion: factura.fechaRecepcion || factura.fecha_recepcion || new Date().toISOString(),
        monto: parseFloat(factura.montoTotal || factura.monto || 0),
        moneda: factura.moneda || 'CLP',
        estado: factura.estado || 'pendiente_aprobacion',
        responsableAprobacion: factura.responsable || 'Sin asignar',
        diasEnEspera: calcularDiasEnEspera(factura.fechaRecepcion || factura.fecha_recepcion),
        tipo: factura.tipo || 'compra'
      };
    } catch (error) {
      console.error(`❌ Error adaptando factura pendiente ${index}:`, error);
      return null;
    }
  }).filter(factura => factura !== null);

  console.log(`✅ Facturas pendientes de aprobación adaptadas: ${facturasAdaptadas.length}`);
  return facturasAdaptadas;
};

/**
 * 📈 Adapta datos de flujo de caja
 */
const adaptFlujoCaja = (response, saldoInicial = 0) => {
  console.log('🔄 adaptFlujoCaja - Iniciando adaptación');
  console.log('📊 Datos recibidos:', response);
  
  if (!response || !response.arrFlujoCaja) {
    console.warn('⚠️ No se encontraron datos de flujo de caja');
    return {
      saldoInicial: saldoInicial,
      saldoFinal: saldoInicial,
      periodos: []
    };
  }

  const periodos = [];
  let saldoAcumulado = saldoInicial;

  response.arrFlujoCaja.forEach((flujo, index) => {
    const ingresos = parseFloat(flujo.ingresos || 0);
    const egresos = parseFloat(flujo.egresos || 0);
    const flujoNeto = ingresos - egresos;
    
    saldoAcumulado += flujoNeto;
    
    const periodo = {
      fecha: flujo.fecha || flujo.periodo || new Date().toISOString(),
      mes: flujo.mes,
      anio: flujo.anio,
      ingresos: ingresos,
      egresos: egresos,
      flujoNeto: flujoNeto,
      saldoAcumulado: saldoAcumulado,
      descripcion: flujo.descripcion || `Período ${index + 1}`
    };
    
    periodos.push(periodo);
  });

  const flujoAdaptado = {
    saldoInicial: saldoInicial,
    saldoFinal: saldoAcumulado,
    periodos: periodos,
    resumen: {
      totalIngresos: periodos.reduce((sum, p) => sum + p.ingresos, 0),
      totalEgresos: periodos.reduce((sum, p) => sum + p.egresos, 0),
      flujoNetoTotal: periodos.reduce((sum, p) => sum + p.flujoNeto, 0)
    }
  };

  console.log(`✅ Flujo de caja adaptado: ${periodos.length} períodos`);
  console.log(`💰 Saldo inicial: ${saldoInicial.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
  console.log(`💰 Saldo final: ${saldoAcumulado.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);

  return flujoAdaptado;
};

/**
 * 📅 Adapta egresos programados
 */
const adaptEgresosProgramados = (pagos) => {
  console.log('🔄 adaptEgresosProgramados - Iniciando adaptación');
  
  if (!pagos || !Array.isArray(pagos)) {
    console.warn('⚠️ No se recibieron pagos programados para adaptar');
    return [];
  }

  const egresosAdaptados = pagos.map((pago, index) => {
    try {
      const fechaPago = pago.fechaProgramada || pago.fecha || new Date().toISOString();
      
      return {
        id: pago.id || `egreso_${index}`,
        fechaPago: fechaPago,
        diasParaPago: calcularDiasParaPago(fechaPago),
        beneficiario: {
          nombre: pago.razonSocial || pago.proveedor || pago.beneficiario || 'Beneficiario sin nombre',
          rut: pago.rutBeneficiario || pago.rut_beneficiario || 'Sin RUT'
        },
        concepto: pago.descripcion || pago.concepto || `Pago a ${pago.razonSocial || pago.proveedor}`,
        monto: parseFloat(pago.monto || 0),
        moneda: pago.moneda || 'CLP',
        estado: pago.estado || 'programado',
        categoria: pago.categoria || pago.tipo || 'pago_proveedor',
        referencia: pago.referencia || pago.folio
      };
    } catch (error) {
      console.error(`❌ Error adaptando egreso programado ${index}:`, error);
      return null;
    }
  }).filter(egreso => egreso !== null);

  console.log(`✅ Egresos programados adaptados: ${egresosAdaptados.length}`);
  
  if (egresosAdaptados.length > 0) {
    const totalEgresos = egresosAdaptados.reduce((sum, e) => sum + e.monto, 0);
    console.log(`💸 Total en egresos programados: ${totalEgresos.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
  }

  return egresosAdaptados;
};

/**
 * 🏦 Adapta información de bancos
 */
const adaptBancos = (response) => {
  console.log('🔄 adaptBancos - Iniciando adaptación');
  
  if (!response || !response.arrFlujoCaja) {
    console.warn('⚠️ No hay datos de flujo de caja para extraer bancos');
    return [];
  }

  const bancosUnicos = new Map();
  
  response.arrFlujoCaja.forEach(flujo => {
    if (flujo.idCuentaCorriente && flujo.nombreCuenta) {
      const id = flujo.idCuentaCorriente;
      
      if (!bancosUnicos.has(id)) {
        bancosUnicos.set(id, {
          id: id,
          nombre: flujo.nombreCuenta,
          nombreBanco: flujo.nombreBanco || flujo.nombreCuenta,
          tipo: 'cuenta_corriente',
          moneda: 'CLP'
        });
      }
    }
  });

  const bancos = Array.from(bancosUnicos.values());
  console.log(`✅ Bancos únicos identificados: ${bancos.length}`);
  
  return bancos;
};

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Calcula los días vencidos desde una fecha
 */
const calcularDiasVencidos = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaVenc = new Date(fechaVencimiento);
    fechaVenc.setHours(0, 0, 0, 0);
    
    const diffTime = hoy.getTime() - fechaVenc.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays; // Positivo = vencido, Negativo = por vencer
  } catch (error) {
    console.warn('⚠️ Error calculando días vencidos:', error);
    return 0;
  }
};

/**
 * Calcula los días hasta el pago programado
 */
const calcularDiasParaPago = (fechaPago) => {
  if (!fechaPago) return null;
  
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaPagoDate = new Date(fechaPago);
    fechaPagoDate.setHours(0, 0, 0, 0);
    
    const diffTime = fechaPagoDate.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays; // Positivo = días restantes, Negativo = días pasados
  } catch (error) {
    console.warn('⚠️ Error calculando días para pago:', error);
    return null;
  }
};

/**
 * Calcula los días que una factura ha estado en espera
 */
const calcularDiasEnEspera = (fechaRecepcion) => {
  if (!fechaRecepcion) return 0;
  
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaRecep = new Date(fechaRecepcion);
    fechaRecep.setHours(0, 0, 0, 0);
    
    const diffTime = hoy.getTime() - fechaRecep.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays); // Solo valores positivos
  } catch (error) {
    console.warn('⚠️ Error calculando días en espera:', error);
    return 0;
  }
};

/**
 * Valida y limpia un valor numérico
 */
const sanitizeNumber = (value, defaultValue = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Valida y formatea una fecha
 */
const sanitizeDate = (dateValue, defaultValue = null) => {
  if (!dateValue) return defaultValue;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return defaultValue;
    return date.toISOString();
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Obtiene información del cliente/proveedor de manera robusta
 */
const extractEntityInfo = (entity, fallbackName = 'Sin nombre') => {
  if (!entity) {
    return { nombre: fallbackName, rut: 'Sin RUT' };
  }
  
  if (typeof entity === 'string') {
    return { nombre: entity, rut: 'Sin RUT' };
  }
  
  if (typeof entity === 'object') {
    return {
      nombre: entity.nombre || entity.razonSocial || entity.razon_social || fallbackName,
      rut: entity.rut || entity.rut_cliente || entity.rut_proveedor || 'Sin RUT'
    };
  }
  
  return { nombre: fallbackName, rut: 'Sin RUT' };
};

// ==================== EXPORTACIONES ====================

console.log('✅ chipaxAdapter mejorado cargado correctamente');

export default {
  adaptSaldosBancarios,
  adaptCuentasPendientes,
  adaptCuentasPorPagar,
  adaptFacturasPendientesAprobacion,
  adaptFlujoCaja,
  adaptEgresosProgramados,
  adaptBancos,
  // Funciones auxiliares también exportadas para testing
  calcularDiasVencidos,
  calcularDiasParaPago,
  calcularDiasEnEspera,
  sanitizeNumber,
  sanitizeDate,
  extractEntityInfo
};
