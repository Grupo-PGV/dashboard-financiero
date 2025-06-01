// chipaxAdapter.js - Adaptador completo para datos reales de Chipax

/**
 * Calcula los días vencidos desde una fecha
 * @param {string} fecha - Fecha en formato ISO
 * @returns {number} Días vencidos (positivo) o por vencer (negativo)
 */
const calcularDiasVencidos = (fecha) => {
  if (!fecha) return 0;
  
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaVencimiento = new Date(fecha);
    fechaVencimiento.setHours(0, 0, 0, 0);
    
    const diffTime = hoy - fechaVencimiento;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.error('Error calculando días vencidos:', error);
    return 0;
  }
};

/**
 * Adapta las cuentas corrientes de Chipax a saldos bancarios
 * @param {object} response - Respuesta de /cuentas_corrientes
 * @returns {array} Saldos bancarios adaptados
 */
const adaptSaldosBancarios = (response) => {
  console.log('🔄 adaptSaldosBancarios - Iniciando adaptación');
  
  // Manejar diferentes formatos de respuesta
  let cuentas = [];
  
  if (response && response.items && Array.isArray(response.items)) {
    cuentas = response.items;
  } else if (Array.isArray(response)) {
    cuentas = response;
  } else {
    console.warn('⚠️ Formato de respuesta no reconocido para cuentas corrientes');
    return [];
  }

  const cuentasBancarias = cuentas.map(cuenta => ({
    id: cuenta.id,
    nombre: cuenta.nombre || cuenta.descripcion || `Cuenta ${cuenta.numero || cuenta.id}`,
    banco: cuenta.banco?.nombre || cuenta.nombre_banco || cuenta.institucion || 'Banco no especificado',
    numeroCuenta: cuenta.numero || cuenta.numero_cuenta || '',
    tipo: cuenta.tipo || 'cuenta_corriente',
    moneda: cuenta.moneda || 'CLP',
    saldo: parseFloat(cuenta.saldo || cuenta.saldo_actual || cuenta.balance || 0),
    disponible: parseFloat(cuenta.saldo_disponible || cuenta.saldo || 0),
    ultimoMovimiento: cuenta.ultimo_movimiento || cuenta.fecha_actualizacion || new Date().toISOString()
  }));

  console.log(`✅ ${cuentasBancarias.length} cuentas bancarias adaptadas`);
  
  // Log detallado del primer elemento para debugging
  if (cuentasBancarias.length > 0) {
    console.log('📊 Ejemplo de cuenta adaptada:', cuentasBancarias[0]);
  }
  
  return cuentasBancarias;
};

/**
 * Adapta las facturas de venta a cuentas por cobrar
 * @param {object} response - Respuesta de /ventas o /dtes
 * @returns {array} Cuentas por cobrar adaptadas
 */
const adaptCuentasPendientes = (response) => {
  console.log('🔄 adaptCuentasPendientes - Iniciando adaptación');
  
  // Manejar diferentes formatos
  let facturas = [];
  
  if (response && response.items && Array.isArray(response.items)) {
    facturas = response.items;
  } else if (Array.isArray(response)) {
    facturas = response;
  } else {
    console.warn('⚠️ Formato de respuesta no reconocido para facturas de venta');
    return [];
  }

  console.log(`📋 Procesando ${facturas.length} facturas de venta`);

  const cuentasPorCobrar = facturas
    .filter(factura => {
      // Filtrar solo facturas pendientes de cobro
      const estaPagada = factura.pagado === true || 
                        factura.estado_pago === 'pagado' ||
                        factura.estado === 'pagado';
      
      const tieneSaldo = (factura.saldo_pendiente || factura.saldo || 0) > 0;
      const montoTotal = factura.monto_total || factura.total || factura.monto || 0;
      const montoPagado = factura.monto_pagado || factura.pagado || 0;
      const saldoCalculado = montoTotal - montoPagado;
      
      // La factura está pendiente si no está pagada O tiene saldo pendiente
      return !estaPagada || tieneSaldo || saldoCalculado > 0;
    })
    .map(factura => {
      const montoTotal = parseFloat(factura.monto_total || factura.total || factura.monto || 0);
      const montoPagado = parseFloat(factura.monto_pagado || factura.pagado || 0);
      const saldoPendiente = parseFloat(factura.saldo_pendiente || factura.saldo || (montoTotal - montoPagado) || montoTotal);
      
      return {
        id: factura.id,
        folio: factura.folio || factura.numero || factura.numero_documento || 'Sin folio',
        numeroFactura: factura.folio || factura.numero,
        cliente: {
          id: factura.cliente_id || factura.receptor_id,
          nombre: factura.razon_social_receptor || factura.nombre_receptor || factura.cliente?.nombre || 'Cliente no especificado',
          rut: factura.rut_receptor || factura.cliente?.rut || 'Sin RUT'
        },
        monto: montoTotal,
        montoTotal: montoTotal,
        saldo: saldoPendiente,
        moneda: factura.moneda || 'CLP',
        fechaEmision: factura.fecha_emision || factura.fecha,
        fechaVencimiento: factura.fecha_vencimiento || factura.fecha_pago || factura.fecha_emision,
        diasVencidos: calcularDiasVencidos(factura.fecha_vencimiento || factura.fecha_pago),
        diasVencido: calcularDiasVencidos(factura.fecha_vencimiento || factura.fecha_pago),
        estado: factura.estado || 'pendiente'
      };
    })
    .filter(cuenta => cuenta.saldo > 0); // Solo incluir cuentas con saldo pendiente

  console.log(`✅ ${cuentasPorCobrar.length} cuentas por cobrar adaptadas`);
  
  // Estadísticas
  const totalPorCobrar = cuentasPorCobrar.reduce((sum, c) => sum + c.saldo, 0);
  const promedioVencimiento = cuentasPorCobrar.length > 0 
    ? cuentasPorCobrar.reduce((sum, c) => sum + c.diasVencidos, 0) / cuentasPorCobrar.length 
    : 0;
  
  console.log(`💰 Total por cobrar: $${totalPorCobrar.toLocaleString('es-CL')}`);
  console.log(`📅 Promedio días vencidos: ${promedioVencimiento.toFixed(1)}`);
  
  return cuentasPorCobrar;
};

/**
 * Adapta las facturas de compra a cuentas por pagar
 * @param {object} response - Respuesta de /compras
 * @returns {array} Cuentas por pagar adaptadas
 */
const adaptCuentasPorPagar = (response) => {
  console.log('🔄 adaptCuentasPorPagar - Iniciando adaptación');
  
  // Manejar diferentes formatos
  let facturas = [];
  
  if (response && response.items && Array.isArray(response.items)) {
    facturas = response.items;
  } else if (Array.isArray(response)) {
    facturas = response;
  } else {
    console.warn('⚠️ Formato de respuesta no reconocido para facturas de compra');
    return [];
  }
  
  console.log(`📋 Procesando ${facturas.length} facturas de compra`);
  
  // Log del primer elemento para ver estructura
  if (facturas.length > 0) {
    console.log('📄 Estructura de factura de ejemplo:', {
      id: facturas[0].id,
      folio: facturas[0].folio,
      pagado: facturas[0].pagado,
      fecha_pago_interna: facturas[0].fecha_pago_interna,
      estado: facturas[0].estado,
      estado_pago: facturas[0].estado_pago,
      monto_total: facturas[0].monto_total,
      saldo: facturas[0].saldo
    });
  }
  
  const cuentasPorPagar = facturas
    .filter(factura => {
      // Filtrar facturas no pagadas
      const estaPagada = factura.pagado === true || 
                        factura.estado_pago === 'pagado' ||
                        factura.estado === 'pagado';
      
      const tieneFechaPago = factura.fecha_pago_interna !== null && factura.fecha_pago_interna !== undefined;
      
      // La factura está pendiente si no está pagada O no tiene fecha de pago
      return !estaPagada || !tieneFechaPago;
    })
    .map(factura => {
      const montoTotal = parseFloat(factura.monto_total || factura.total || factura.monto || 0);
      const montoPagado = parseFloat(factura.monto_pagado || 0);
      const saldoPendiente = parseFloat(factura.saldo || factura.saldo_pendiente || (montoTotal - montoPagado) || montoTotal);
      
      return {
        id: factura.id,
        folio: factura.folio || factura.numero || factura.numero_documento || 'Sin folio',
        proveedor: {
          id: factura.proveedor_id || factura.emisor_id,
          nombre: factura.razon_social || factura.nombre_emisor || factura.proveedor?.nombre || 'Proveedor no especificado',
          rut: factura.rut_emisor || factura.proveedor?.rut || 'Sin RUT'
        },
        monto: montoTotal,
        montoTotal: montoTotal,
        saldo: saldoPendiente,
        moneda: factura.moneda || 'CLP',
        fechaEmision: factura.fecha_emision || factura.fecha,
        fechaRecepcion: factura.fecha_recepcion || factura.fecha_emision,
        fechaVencimiento: factura.fecha_vencimiento || factura.fecha_pago || factura.fecha_emision,
        fechaPago: factura.fecha_pago_interna || factura.fecha_pago,
        diasVencidos: calcularDiasVencidos(factura.fecha_vencimiento || factura.fecha_pago),
        estado: factura.estado || 'pendiente',
        estadoPago: factura.estado_pago || 'pendiente',
        observaciones: factura.observaciones || factura.notas || ''
      };
    })
    .filter(cuenta => cuenta.saldo > 0); // Solo incluir cuentas con saldo pendiente

  console.log(`✅ ${cuentasPorPagar.length} cuentas por pagar adaptadas`);
  
  // Estadísticas
  const totalPorPagar = cuentasPorPagar.reduce((sum, c) => sum + c.saldo, 0);
  console.log(`💰 Total por pagar: $${totalPorPagar.toLocaleString('es-CL')}`);
  
  return cuentasPorPagar;
};

/**
 * Adapta las facturas pendientes de aprobación
 * @param {object} response - Respuesta con facturas pendientes
 * @returns {array} Facturas pendientes adaptadas
 */
const adaptFacturasPendientesAprobacion = (response) => {
  console.log('🔄 adaptFacturasPendientesAprobacion - Iniciando adaptación');
  
  let facturas = [];
  
  if (response && response.items && Array.isArray(response.items)) {
    facturas = response.items;
  } else if (Array.isArray(response)) {
    facturas = response;
  } else {
    console.warn('⚠️ No se encontraron facturas pendientes');
    return [];
  }

  const facturasPendientes = facturas
    .filter(factura => 
      factura.estado === 'pendiente_aprobacion' ||
      factura.requiere_aprobacion === true ||
      factura.estado === 'por_aprobar'
    )
    .map(factura => {
      const fechaRecepcion = factura.fecha_recepcion || factura.fecha_emision || new Date().toISOString();
      const diasEnEspera = Math.max(0, calcularDiasVencidos(fechaRecepcion) * -1); // Invertir porque queremos días transcurridos
      
      return {
        id: factura.id,
        folio: factura.folio || factura.numero || 'Sin folio',
        proveedor: {
          nombre: factura.razon_social || factura.proveedor?.nombre || 'Sin nombre',
          rut: factura.rut_emisor || factura.proveedor?.rut || 'Sin RUT'
        },
        monto: parseFloat(factura.monto_total || factura.total || 0),
        moneda: factura.moneda || 'CLP',
        fechaEmision: factura.fecha_emision || factura.fecha,
        fechaRecepcion: fechaRecepcion,
        diasEnEspera: diasEnEspera,
        responsableAprobacion: factura.responsable_aprobacion || factura.asignado_a || 'Sin asignar',
        estado: factura.estado || 'pendiente_aprobacion'
      };
    });

  console.log(`✅ ${facturasPendientes.length} facturas pendientes de aprobación`);
  
  return facturasPendientes;
};

/**
 * Genera el flujo de caja basado en las transacciones
 * @param {object} data - Datos de ventas y compras
 * @param {number} saldoInicial - Saldo inicial
 * @returns {object} Flujo de caja adaptado
 */
const adaptFlujoCaja = (data, saldoInicial = 0) => {
  console.log('🔄 adaptFlujoCaja - Generando flujo de caja');
  
  const transaccionesPorMes = new Map();
  
  // Procesar ingresos (ventas)
  if (data.ventas && data.ventas.items) {
    data.ventas.items.forEach(venta => {
      const fecha = new Date(venta.fecha_emision || venta.fecha);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!transaccionesPorMes.has(mesKey)) {
        transaccionesPorMes.set(mesKey, { 
          fecha: mesKey, 
          ingresos: 0, 
          egresos: 0,
          cantidadIngresos: 0,
          cantidadEgresos: 0
        });
      }
      
      const periodo = transaccionesPorMes.get(mesKey);
      periodo.ingresos += parseFloat(venta.monto_total || venta.total || 0);
      periodo.cantidadIngresos += 1;
    });
  }
  
  // Procesar egresos (compras)
  if (data.compras && data.compras.items) {
    data.compras.items.forEach(compra => {
      const fecha = new Date(compra.fecha_emision || compra.fecha);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      
      if (!transaccionesPorMes.has(mesKey)) {
        transaccionesPorMes.set(mesKey, { 
          fecha: mesKey, 
          ingresos: 0, 
          egresos: 0,
          cantidadIngresos: 0,
          cantidadEgresos: 0
        });
      }
      
      const periodo = transaccionesPorMes.get(mesKey);
      periodo.egresos += parseFloat(compra.monto_total || compra.total || 0);
      periodo.cantidadEgresos += 1;
    });
  }
  
  // Convertir a array y ordenar
  const periodos = Array.from(transaccionesPorMes.values())
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((periodo, index, array) => {
      // Calcular flujo neto
      periodo.flujoNeto = periodo.ingresos - periodo.egresos;
      
      // Calcular saldo acumulado
      if (index === 0) {
        periodo.saldoAcumulado = saldoInicial + periodo.flujoNeto;
      } else {
        periodo.saldoAcumulado = array[index - 1].saldoAcumulado + periodo.flujoNeto;
      }
      
      // Formatear fecha para visualización
      const [year, month] = periodo.fecha.split('-');
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                         'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      periodo.mes = monthNames[parseInt(month) - 1];
      periodo.anio = year;
      periodo.etiqueta = `${periodo.mes} ${year}`;
      
      return periodo;
    });
  
  // Calcular totales
  const totalIngresos = periodos.reduce((sum, p) => sum + p.ingresos, 0);
  const totalEgresos = periodos.reduce((sum, p) => sum + p.egresos, 0);
  const saldoFinal = saldoInicial + (totalIngresos - totalEgresos);
  
  console.log(`✅ Flujo de caja generado con ${periodos.length} períodos`);
  console.log(`💰 Saldo inicial: $${saldoInicial.toLocaleString()}, Saldo final: $${saldoFinal.toLocaleString()}`);
  
  return {
    saldoInicial,
    saldoFinal,
    totalIngresos,
    totalEgresos,
    periodos
  };
};

/**
 * Adapta los egresos programados
 * @param {object} response - Respuesta con pagos programados
 * @returns {array} Egresos programados adaptados
 */
const adaptEgresosProgramados = (response) => {
  console.log('🔄 adaptEgresosProgramados - Iniciando adaptación');
  
  let pagos = [];
  
  if (response && response.items && Array.isArray(response.items)) {
    pagos = response.items;
  } else if (Array.isArray(response)) {
    pagos = response;
  } else {
    console.warn('⚠️ No se encontraron pagos programados');
    return [];
  }

  const egresosProgramados = pagos
    .filter(pago => 
      pago.estado === 'programado' ||
      pago.estado === 'pendiente' ||
      (pago.fecha_programada && new Date(pago.fecha_programada) > new Date())
    )
    .map(pago => ({
      id: pago.id,
      concepto: pago.concepto || pago.descripcion || `Pago a ${pago.beneficiario?.nombre || 'Sin especificar'}`,
      beneficiario: {
        nombre: pago.beneficiario?.nombre || pago.proveedor?.nombre || 'Sin especificar',
        rut: pago.beneficiario?.rut || pago.proveedor?.rut || ''
      },
      monto: parseFloat(pago.monto || pago.total || 0),
      moneda: pago.moneda || 'CLP',
      fechaPago: pago.fecha_programada || pago.fecha_pago,
      diasParaPago: Math.max(0, -calcularDiasVencidos(pago.fecha_programada || pago.fecha_pago)),
      categoria: pago.categoria || pago.tipo || 'Otros',
      estado: pago.estado || 'programado'
    }));

  console.log(`✅ ${egresosProgramados.length} egresos programados adaptados`);
  
  return egresosProgramados;
};

/**
 * Adapta la lista de bancos disponibles
 * @param {object} response - Respuesta con cuentas corrientes
 * @returns {array} Bancos únicos
 */
const adaptBancos = (response) => {
  console.log('🔄 adaptBancos - Extrayendo bancos únicos');
  
  let cuentas = [];
  
  if (response && response.items && Array.isArray(response.items)) {
    cuentas = response.items;
  } else if (Array.isArray(response)) {
    cuentas = response;
  } else {
    return [];
  }

  const bancosMap = new Map();
  
  cuentas.forEach(cuenta => {
    const bancoNombre = cuenta.banco?.nombre || cuenta.nombre_banco || cuenta.institucion || 'Banco no especificado';
    const bancoId = cuenta.banco?.id || cuenta.banco_id || bancoNombre;
    
    if (!bancosMap.has(bancoId)) {
      bancosMap.set(bancoId, {
        id: bancoId,
        nombre: bancoNombre,
        tipo: 'banco'
      });
    }
  });

  const bancos = Array.from(bancosMap.values());
  console.log(`✅ ${bancos.length} bancos únicos encontrados`);
  
  return bancos;
};

// Exportar todas las funciones
export default {
  adaptSaldosBancarios,
  adaptCuentasPendientes,
  adaptCuentasPorPagar,
  adaptFacturasPendientesAprobacion,
  adaptFlujoCaja,
  adaptEgresosProgramados,
  adaptBancos,
  // Helpers exportados
  calcularDiasVencidos
};
