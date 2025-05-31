// chipaxAdapter.js - Adaptado para datos REALES de Chipax
console.log('🔧 Cargando chipaxAdapter para datos reales de Chipax...');

/**
 * 🏦 Adapta datos de cuentas corrientes (endpoint real /cuentas_corrientes)
 */
const adaptSaldosBancarios = (response) => {
  console.log('🔄 adaptSaldosBancarios - Adaptando datos reales');
  console.log('📊 Datos recibidos:', response);
  
  if (!response) {
    console.warn('⚠️ No se encontraron datos de cuentas corrientes');
    return [];
  }

  // Manejar respuesta directa o con items
  let cuentas = [];
  if (Array.isArray(response)) {
    cuentas = response;
  } else if (response.items && Array.isArray(response.items)) {
    cuentas = response.items;
  } else {
    console.warn('⚠️ Formato de respuesta no reconocido');
    return [];
  }

  const cuentasBancarias = cuentas.map((cuenta, index) => {
    try {
      return {
        id: cuenta.id || `cuenta_${index}`,
        nombre: cuenta.nombre || cuenta.nombre_cuenta || `Cuenta ${cuenta.id || index}`,
        banco: cuenta.banco || cuenta.nombre_banco || 'Banco no especificado',
        numeroCuenta: cuenta.numero_cuenta || cuenta.numero || cuenta.id?.toString() || '',
        tipo: cuenta.tipo || cuenta.tipo_cuenta || 'cuenta_corriente',
        moneda: cuenta.moneda || 'CLP',
        saldo: parseFloat(cuenta.saldo || cuenta.saldo_actual || cuenta.balance || 0),
        disponible: parseFloat(cuenta.saldo_disponible || cuenta.saldo || cuenta.balance || 0),
        ultimoMovimiento: cuenta.fecha_ultimo_movimiento || cuenta.updated_at || new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Error adaptando cuenta ${index}:`, error);
      return null;
    }
  }).filter(cuenta => cuenta !== null);

  console.log(`✅ Saldos bancarios adaptados: ${cuentasBancarias.length} cuentas`);
  if (cuentasBancarias.length > 0) {
    const saldoTotal = cuentasBancarias.reduce((sum, c) => sum + c.saldo, 0);
    console.log(`💰 Total en saldos: ${saldoTotal.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
  }
  
  return cuentasBancarias;
};

/**
 * 📋 Adapta cuentas por cobrar desde DTEs o ventas
 */
const adaptCuentasPendientes = (facturas) => {
  console.log('🔄 adaptCuentasPendientes - Adaptando datos reales');
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
    console.log('🔍 Estructura de primera factura:');
    const first = items[0];
    console.log('   - ID:', first.id);
    console.log('   - Folio:', first.folio);
    console.log('   - Razón social:', first.razon_social);
    console.log('   - RUT emisor:', first.rut_emisor);
    console.log('   - RUT receptor:', first.rut_receptor);
    console.log('   - Monto total:', first.monto_total || first.total);
    console.log('   - Fecha emisión:', first.fecha_emision);
    console.log('   - Fecha vencimiento:', first.fecha_vencimiento);
    console.log('   - Pagado:', first.pagado);
    console.log('   - Fecha pago:', first.fecha_pago_interna);
  }

  const cuentasAdaptadas = items.map((factura, index) => {
    try {
      // Para facturas por cobrar, el cliente es el receptor
      const clienteInfo = {
        rut: factura.rut_receptor || 'Sin RUT',
        nombre: factura.razon_social_receptor || factura.razon_social || 'Cliente sin nombre'
      };

      // Calcular montos
      const montoTotal = parseFloat(factura.monto_total || factura.total || 0);
      const montoPagado = parseFloat(factura.monto_pagado || 0);
      const saldoPendiente = montoTotal - montoPagado;

      // Fechas
      const fechaEmision = factura.fecha_emision || factura.created_at;
      const fechaVencimiento = factura.fecha_vencimiento || fechaEmision;

      const cuentaAdaptada = {
        id: factura.id || `cxc_${index}`,
        cliente: clienteInfo,
        folio: factura.folio || 'Sin folio',
        fechaEmision: fechaEmision,
        fechaVencimiento: fechaVencimiento,
        monto: montoTotal,
        saldo: saldoPendiente > 0 ? saldoPendiente : montoTotal, // Si no hay monto pagado, usar total
        moneda: factura.moneda || 'CLP',
        estado: factura.estado || 'pendiente',
        diasVencidos: calcularDiasVencidos(fechaVencimiento),
        tipo: factura.tipo || 'factura',
        // Campos adicionales para debugging
        _originalData: {
          pagado: factura.pagado,
          fecha_pago_interna: factura.fecha_pago_interna,
          originalMonto: factura.monto_total || factura.total,
          originalPagado: factura.monto_pagado
        }
      };

      return cuentaAdaptada;
    } catch (error) {
      console.error(`❌ Error adaptando factura ${index}:`, error, factura);
      return null;
    }
  }).filter(cuenta => cuenta !== null && cuenta.saldo > 0);

  // Estadísticas de adaptación
  console.log(`✅ Cuentas por cobrar adaptadas: ${cuentasAdaptadas.length}/${items.length}`);
  
  if (cuentasAdaptadas.length > 0) {
    const totalPorCobrar = cuentasAdaptadas.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
    const vencidas = cuentasAdaptadas.filter(c => c.diasVencidos > 0).length;
    
    console.log(`💰 Total por cobrar: ${totalPorCobrar.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
    console.log(`⚠️ Facturas vencidas: ${vencidas}/${cuentasAdaptadas.length}`);
  }
  
  return cuentasAdaptadas;
};

/**
 * 🛒 Adapta cuentas por pagar desde compras (endpoint real /compras)
 */
const adaptCuentasPorPagar = (facturas) => {
  console.log('🔄 adaptCuentasPorPagar - Adaptando datos reales de compras');
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
    const first = items[0];
    console.log('🔍 Estructura de primera factura de compra:');
    console.log('   - ID:', first.id);
    console.log('   - Folio:', first.folio);
    console.log('   - Razón social (proveedor):', first.razon_social);
    console.log('   - RUT emisor:', first.rut_emisor);
    console.log('   - Monto total:', first.monto_total || first.total);
    console.log('   - Pagado:', first.pagado);
    console.log('   - Fecha pago:', first.fecha_pago_interna);
    console.log('   - Estado:', first.estado);
    console.log('   - Fecha emisión:', first.fecha_emision);
    console.log('   - Fecha vencimiento:', first.fecha_vencimiento);
  }

  // Adaptar cada factura
  const facturasAdaptadas = items.map((factura, index) => {
    try {
      // Monto total
      const montoTotal = parseFloat(factura.monto_total || factura.total || 0);

      // Para compras, el saldo pendiente es el total si no está pagada
      const estaPagada = factura.pagado === true || factura.fecha_pago_interna !== null;
      const saldoPendiente = estaPagada ? 0 : montoTotal;

      // Información del proveedor (emisor en este caso)
      const proveedorInfo = {
        nombre: factura.razon_social || 'Proveedor no especificado',
        rut: factura.rut_emisor || 'Sin RUT'
      };

      // Fechas
      const fechaEmision = factura.fecha_emision || factura.created_at || new Date().toISOString();
      const fechaVencimiento = factura.fecha_vencimiento || null;

      const facturaAdaptada = {
        id: factura.id || `cxp_${index}`,
        folio: factura.folio || 'Sin folio',
        proveedor: proveedorInfo,
        monto: montoTotal,
        saldo: saldoPendiente,
        moneda: factura.moneda || 'CLP',
        fechaEmision: fechaEmision,
        fechaVencimiento: fechaVencimiento,
        fechaPago: factura.fecha_pago_interna || null,
        diasVencidos: calcularDiasVencidos(fechaVencimiento),
        estado: factura.estado || 'Pendiente',
        estadoPago: estaPagada ? 'Pagado' : 'Pendiente',
        tipo: factura.tipo || 'compra',
        // Campos para debugging
        _debug: {
          originalTotal: factura.monto_total || factura.total,
          originalPagado: factura.pagado,
          originalFechaPago: factura.fecha_pago_interna,
          originalEstado: factura.estado
        }
      };

      return facturaAdaptada;
    } catch (error) {
      console.error(`❌ Error adaptando factura de compra ${index}:`, error, factura);
      return null;
    }
  }).filter(factura => factura !== null);

  // Filtrar solo facturas con saldo pendiente
  const facturasPendientes = facturasAdaptadas.filter(factura => factura.saldo > 0);

  // Estadísticas finales
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
 * ⏳ Adapta facturas pendientes de aprobación (datos simulados o reales si están disponibles)
 */
const adaptFacturasPendientesAprobacion = (facturas) => {
  console.log('🔄 adaptFacturasPendientesAprobacion - Adaptando datos');
  
  if (!facturas || !Array.isArray(facturas)) {
    console.warn('⚠️ No se recibieron facturas pendientes para adaptar');
    return [];
  }

  const facturasAdaptadas = facturas.map((factura, index) => {
    try {
      return {
        id: factura.id || `pendiente_${index}`,
        folio: factura.folio || 'Sin folio',
        proveedor: {
          nombre: factura.razon_social || factura.proveedor || 'Proveedor sin nombre',
          rut: factura.rut_emisor || factura.rut_proveedor || 'Sin RUT'
        },
        fechaEmision: factura.fecha_emision || new Date().toISOString(),
        fechaRecepcion: factura.fecha_recepcion || factura.created_at || new Date().toISOString(),
        monto: parseFloat(factura.monto_total || factura.total || 0),
        moneda: factura.moneda || 'CLP',
        estado: factura.estado || 'pendiente_aprobacion',
        responsableAprobacion: factura.responsable || 'Sin asignar',
        diasEnEspera: calcularDiasEnEspera(factura.fecha_recepcion || factura.created_at),
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
 * 📈 Adapta datos de KPIs o proyecciones como flujo de caja
 */
const adaptFlujoCaja = (response, saldoInicial = 0) => {
  console.log('🔄 adaptFlujoCaja - Adaptando datos reales');
  console.log('📊 Datos recibidos:', response);
  
  if (!response) {
    console.warn('⚠️ No se encontraron datos de KPIs/proyecciones');
    return {
      saldoInicial: saldoInicial,
      saldoFinal: saldoInicial,
      periodos: []
    };
  }

  // Intentar extraer datos de flujo de caja desde KPIs o proyecciones
  let periodos = [];
  let saldoAcumulado = saldoInicial;

  // Si hay datos de proyecciones, adaptarlos como flujo de caja
  if (response.proyecciones && Array.isArray(response.proyecciones)) {
    periodos = response.proyecciones.map((proyeccion, index) => {
      const ingresos = parseFloat(proyeccion.ingresos || proyeccion.ventas || 0);
      const egresos = parseFloat(proyeccion.egresos || proyeccion.gastos || 0);
      const flujoNeto = ingresos - egresos;
      
      saldoAcumulado += flujoNeto;
      
      return {
        fecha: proyeccion.fecha || proyeccion.periodo || new Date().toISOString(),
        mes: proyeccion.mes,
        anio: proyeccion.anio,
        ingresos: ingresos,
        egresos: egresos,
        flujoNeto: flujoNeto,
        saldoAcumulado: saldoAcumulado,
        descripcion: proyeccion.descripcion || `Período ${index + 1}`
      };
    });
  } else {
    // Si no hay datos específicos, crear períodos simulados basados en saldo inicial
    console.log('ℹ️ No hay datos de flujo específicos, creando período único');
    periodos = [{
      fecha: new Date().toISOString(),
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      ingresos: 0,
      egresos: 0,
      flujoNeto: 0,
      saldoAcumulado: saldoInicial,
      descripcion: 'Período actual'
    }];
    saldoAcumulado = saldoInicial;
  }

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
 * 📅 Adapta pagos programados
 */
const adaptEgresosProgramados = (pagos) => {
  console.log('🔄 adaptEgresosProgramados - Adaptando datos reales');
  
  if (!pagos) {
    console.warn('⚠️ No se recibieron datos de pagos');
    return [];
  }

  // Manejar respuesta directa o con items
  let items = [];
  if (Array.isArray(pagos)) {
    items = pagos;
  } else if (pagos.items && Array.isArray(pagos.items)) {
    items = pagos.items;
  } else {
    console.warn('⚠️ Formato de datos de pagos no reconocido');
    return [];
  }

  const egresosAdaptados = items.map((pago, index) => {
    try {
      const fechaPago = pago.fecha_pago || pago.fecha_programada || pago.fecha || new Date().toISOString();
      
      return {
        id: pago.id || `egreso_${index}`,
        fechaPago: fechaPago,
        diasParaPago: calcularDiasParaPago(fechaPago),
        beneficiario: {
          nombre: pago.beneficiario || pago.razon_social || pago.proveedor || 'Beneficiario sin nombre',
          rut: pago.rut_beneficiario || pago.rut_proveedor || 'Sin RUT'
        },
        concepto: pago.concepto || pago.descripcion || `Pago a ${pago.beneficiario || pago.razon_social}`,
        monto: parseFloat(pago.monto || pago.total || 0),
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
 * 🏦 Adapta información de bancos desde cuentas corrientes
 */
const adaptBancos = (response) => {
  console.log('🔄 adaptBancos - Adaptando datos reales');
  
  if (!response) {
    console.warn('⚠️ No hay datos de cuentas corrientes para extraer bancos');
    return [];
  }

  // Manejar respuesta directa o con items
  let cuentas = [];
  if (Array.isArray(response)) {
    cuentas = response;
  } else if (response.items && Array.isArray(response.items)) {
    cuentas = response.items;
  } else {
    return [];
  }

  const bancosUnicos = new Map();
  
  cuentas.forEach(cuenta => {
    if (cuenta.banco && cuenta.id) {
      const bancoKey = cuenta.banco;
      
      if (!bancosUnicos.has(bancoKey)) {
        bancosUnicos.set(bancoKey, {
          id: cuenta.banco_id || bancoKey,
          nombre: cuenta.banco,
          nombreCompleto: cuenta.nombre_banco || cuenta.banco,
          tipo: 'banco',
          moneda: cuenta.moneda || 'CLP'
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

// ==================== EXPORTACIONES ====================

console.log('✅ chipaxAdapter para datos reales cargado correctamente');

export default {
  adaptSaldosBancarios,
  adaptCuentasPendientes,
  adaptCuentasPorPagar,
  adaptFacturasPendientesAprobacion,
  adaptFlujoCaja,
  adaptEgresosProgramados,
  adaptBancos,
  // Funciones auxiliares
  calcularDiasVencidos,
  calcularDiasParaPago,
  calcularDiasEnEspera
};
