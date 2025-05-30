// chipaxAdapter.js - Optimizado para datos reales de Chipax
console.log('🔄 Inicializando chipaxAdapter optimizado...');

/**
 * Adapta saldos bancarios de Chipax
 * NOTA: Esta cuenta no tiene cuentas bancarias configuradas, 
 * pero intentamos extraer datos del flujo de caja si están disponibles
 */
const adaptSaldosBancarios = (response) => {
  console.log('🔄 adaptSaldosBancarios - Procesando respuesta...');
  
  if (!response) {
    console.warn('⚠️ No se recibieron datos bancarios');
    return [];
  }

  // Si hay datos de flujo de caja, intentar extraer información bancaria
  if (response.arrFlujoCaja && Array.isArray(response.arrFlujoCaja)) {
    console.log('📊 Procesando datos de flujo de caja para saldos...');
    
    const cuentasBancarias = [];
    
    response.arrFlujoCaja.forEach((flujo, index) => {
      if (flujo.idCuentaCorriente || flujo.nombreCuenta) {
        cuentasBancarias.push({
          id: flujo.idCuentaCorriente || `cuenta_${index}`,
          nombre: flujo.nombreCuenta || `Cuenta ${flujo.idCuentaCorriente || index}`,
          banco: flujo.banco || 'Banco no especificado',
          numeroCuenta: flujo.idCuentaCorriente?.toString() || '',
          tipo: 'cuenta_corriente',
          moneda: 'CLP',
          saldo: flujo.saldoPeriodo || flujo.saldo || 0,
          disponible: flujo.saldoPeriodo || flujo.saldo || 0,
          ultimoMovimiento: flujo.fecha || null
        });
      }
    });

    console.log(`✅ Cuentas bancarias extraídas del flujo: ${cuentasBancarias.length}`);
    return cuentasBancarias;
  }

  // Si hay cuentas corrientes directas
  if (response.cuentasCorrientes && Array.isArray(response.cuentasCorrientes)) {
    console.log('🏦 Procesando cuentas corrientes directas...');
    return response.cuentasCorrientes.map(cuenta => ({
      id: cuenta.id,
      nombre: cuenta.nombre || cuenta.alias || 'Cuenta sin nombre',
      banco: cuenta.banco || 'Banco no especificado',
      numeroCuenta: cuenta.numero || cuenta.cuenta || '',
      tipo: cuenta.tipo || 'cuenta_corriente',
      moneda: cuenta.moneda || 'CLP',
      saldo: cuenta.saldo || 0,
      disponible: cuenta.disponible || cuenta.saldo || 0,
      ultimoMovimiento: cuenta.ultimoMovimiento || null
    }));
  }

  console.log('ℹ️ No hay cuentas bancarias configuradas en esta cuenta de Chipax');
  return [];
};

/**
 * Adapta cuentas por cobrar (DTEs de venta)
 * CONFIRMADO: 42 facturas disponibles
 */
const adaptCuentasPendientes = (facturas) => {
  console.log('🔄 adaptCuentasPendientes - Procesando facturas por cobrar...');
  
  if (!facturas || !facturas.items || !Array.isArray(facturas.items)) {
    console.warn('⚠️ No se recibieron facturas por cobrar válidas');
    return [];
  }

  console.log(`📊 Procesando ${facturas.items.length} facturas por cobrar...`);
  
  const cuentasAdaptadas = facturas.items.map(factura => {
    // Calcular saldo pendiente
    const montoTotal = factura.montoTotal || factura.total || 0;
    const montoPagado = factura.montoPagado || factura.pagado_monto || 0;
    const saldoPendiente = montoTotal - montoPagado;
    
    return {
      id: factura.id,
      folio: factura.folio || factura.numero || 'Sin folio',
      cliente: {
        rut: factura.rutReceptor || factura.rut_receptor || 'Sin RUT',
        nombre: factura.razonSocial || factura.razon_social || factura.cliente || 'Cliente sin nombre'
      },
      fechaEmision: factura.fechaEmision || factura.fecha_emision || factura.fecha,
      fechaVencimiento: factura.fechaVencimiento || factura.fecha_vencimiento || factura.fechaEmision,
      montoTotal: montoTotal,
      saldo: saldoPendiente > 0 ? saldoPendiente : montoTotal, // Si no hay pagos, usar monto total
      moneda: factura.moneda || 'CLP',
      estado: factura.estado || 'pendiente',
      diasVencidos: calcularDiasVencidos(factura.fechaVencimiento || factura.fecha_vencimiento)
    };
  }).filter(cuenta => cuenta.saldo > 0); // Solo facturas con saldo pendiente

  console.log(`✅ Cuentas por cobrar adaptadas: ${cuentasAdaptadas.length} con saldo pendiente`);
  
  // Mostrar total por cobrar
  const totalPorCobrar = cuentasAdaptadas.reduce((sum, cuenta) => sum + cuenta.saldo, 0);
  console.log(`💰 Total por cobrar: ${totalPorCobrar.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
  
  return cuentasAdaptadas;
};

/**
 * Adapta cuentas por pagar (facturas de compra)
 * CONFIRMADO: 50 facturas por pagar disponibles
 */
const adaptCuentasPorPagar = (facturas) => {
  console.log('🔄 adaptCuentasPorPagar - Procesando facturas por pagar...');
  
  if (!facturas || !facturas.items || !Array.isArray(facturas.items)) {
    console.warn('⚠️ No se recibieron facturas por pagar válidas');
    return [];
  }

  console.log(`📊 Procesando ${facturas.items.length} facturas por pagar...`);
  
  const facturasAdaptadas = facturas.items.map(factura => {
    // Manejar diferentes formatos de monto
    const montoTotal = factura.monto_total || 
                      factura.montoTotal || 
                      factura.total || 
                      factura.monto || 
                      0;
    
    // Para facturas por pagar, el saldo generalmente es el total si no está pagada
    const saldoPendiente = factura.saldo || 
                          factura.monto_por_pagar || 
                          factura.montoPorPagar ||
                          montoTotal;
    
    return {
      id: factura.id,
      folio: factura.folio || factura.numero || 'Sin folio',
      proveedor: {
        nombre: factura.razon_social || factura.razonSocial || factura.proveedor || 'Proveedor no especificado',
        rut: factura.rut_emisor || factura.rutEmisor || factura.rut || 'Sin RUT'
      },
      fechaEmision: factura.fecha_emision || factura.fechaEmision || factura.fecha,
      fechaVencimiento: factura.fecha_vencimiento || factura.fechaVencimiento,
      fechaPago: factura.fecha_pago_interna || factura.fechaPagoInterna,
      montoTotal: parseFloat(montoTotal),
      saldo: parseFloat(saldoPendiente),
      moneda: factura.moneda || 'CLP',
      estado: factura.estado || 'por_pagar',
      estadoPago: factura.estado_pago || factura.estadoPago || 'pendiente',
      pagado: factura.pagado || false,
      diasVencidos: calcularDiasVencidos(factura.fecha_vencimiento || factura.fechaVencimiento),
      observaciones: factura.observaciones || factura.notas || ''
    };
  });
  
  console.log(`✅ Facturas por pagar adaptadas: ${facturasAdaptadas.length}`);
  
  // Mostrar estadísticas
  const totalPorPagar = facturasAdaptadas.reduce((sum, f) => sum + f.saldo, 0);
  const vencidas = facturasAdaptadas.filter(f => f.diasVencidos > 0).length;
  
  console.log(`💰 Total por pagar: ${totalPorPagar.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
  console.log(`⚠️ Facturas vencidas: ${vencidas}`);
  
  return facturasAdaptadas;
};

/**
 * Adapta facturas pendientes de aprobación
 * NOTA: Esta cuenta no tiene flujo de aprobación configurado
 */
const adaptFacturasPendientesAprobacion = (facturas) => {
  console.log('🔄 adaptFacturasPendientesAprobacion - Esta cuenta no tiene flujo de aprobación');
  
  if (!facturas || !Array.isArray(facturas)) {
    return [];
  }

  // En caso de que en el futuro se configure flujo de aprobación
  return facturas.map(factura => ({
    id: factura.id,
    folio: factura.folio || factura.numero,
    proveedor: {
      nombre: factura.razon_social || factura.proveedor || 'Proveedor desconocido',
      rut: factura.rut_emisor || factura.rut || 'Sin RUT'
    },
    fechaEmision: factura.fecha_emision || factura.fecha,
    fechaRecepcion: factura.fecha_recepcion || factura.fecha,
    monto: factura.monto_total || factura.total || 0,
    moneda: factura.moneda || 'CLP',
    estado: factura.estado || 'pendiente_aprobacion',
    responsableAprobacion: factura.responsable || 'No asignado',
    diasEnEspera: calcularDiasDesde(factura.fecha_recepcion || factura.fecha)
  }));
};

/**
 * Adapta flujo de caja
 * CONFIRMADO: Datos disponibles en /flujo-caja/init
 */
const adaptFlujoCaja = (response, saldoInicial = 0) => {
  console.log('🔄 adaptFlujoCaja - Procesando datos de flujo de caja...');
  
  if (!response) {
    console.warn('⚠️ No se recibieron datos de flujo de caja');
    return { periodos: [], saldoInicial: 0, saldoFinal: 0 };
  }

  let periodos = [];
  let saldoActual = saldoInicial;

  // Procesar datos de flujo de caja
  if (response.arrFlujoCaja && Array.isArray(response.arrFlujoCaja)) {
    console.log(`📊 Procesando ${response.arrFlujoCaja.length} períodos de flujo...`);
    
    periodos = response.arrFlujoCaja.map(flujo => {
      const ingresos = flujo.ingresos || 0;
      const egresos = flujo.egresos || 0;
      const flujoNeto = ingresos - egresos;
      
      saldoActual += flujoNeto;
      
      return {
        fecha: flujo.fecha || flujo.periodo,
        mes: flujo.mes,
        anio: flujo.anio,
        ingresos: ingresos,
        egresos: egresos,
        flujoNeto: flujoNeto,
        saldoAcumulado: saldoActual,
        descripcion: flujo.descripcion || ''
      };
    });
  } else {
    console.log('ℹ️ No hay datos específicos de flujo de caja, generando datos básicos...');
    
    // Generar un período básico si no hay datos específicos
    const hoy = new Date();
    periodos = [{
      fecha: hoy.toISOString().split('T')[0],
      mes: hoy.getMonth() + 1,
      anio: hoy.getFullYear(),
      ingresos: 0,
      egresos: 0,
      flujoNeto: 0,
      saldoAcumulado: saldoInicial,
      descripcion: 'Período actual'
    }];
  }

  const resultado = {
    saldoInicial: saldoInicial,
    saldoFinal: saldoActual,
    periodos: periodos
  };

  console.log(`✅ Flujo de caja adaptado: ${periodos.length} períodos`);
  console.log(`💰 Saldo final calculado: ${saldoActual.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
  
  return resultado;
};

/**
 * Adapta egresos programados
 * NOTA: Esta cuenta no tiene pagos programados
 */
const adaptEgresosProgramados = (pagos) => {
  console.log('🔄 adaptEgresosProgramados - Esta cuenta no tiene pagos programados');
  
  if (!pagos || !Array.isArray(pagos)) {
    return [];
  }

  return pagos.map(pago => ({
    id: pago.id,
    fechaPago: pago.fecha_programada || pago.fechaProgramada || pago.fecha,
    beneficiario: {
      nombre: pago.razon_social || pago.beneficiario || 'Beneficiario no especificado',
      rut: pago.rut || 'Sin RUT'
    },
    concepto: pago.concepto || pago.descripcion || `Pago a ${pago.razon_social || 'beneficiario'}`,
    monto: pago.monto || 0,
    moneda: pago.moneda || 'CLP',
    estado: pago.estado || 'programado',
    categoria: pago.categoria || 'pago_proveedor',
    diasParaPago: calcularDiasHasta(pago.fecha_programada || pago.fecha)
  }));
};

/**
 * Adapta información de bancos
 */
const adaptBancos = (response) => {
  console.log('🔄 adaptBancos - Procesando información de bancos...');
  
  if (!response) {
    return [];
  }

  const bancosUnicos = {};
  
  // Extraer bancos del flujo de caja si está disponible
  if (response.arrFlujoCaja && Array.isArray(response.arrFlujoCaja)) {
    response.arrFlujoCaja.forEach(flujo => {
      if (flujo.idCuentaCorriente && flujo.nombreCuenta) {
        const bancoNombre = flujo.banco || extraerBancoDeCuenta(flujo.nombreCuenta);
        bancosUnicos[flujo.idCuentaCorriente] = {
          id: flujo.idCuentaCorriente,
          nombre: bancoNombre,
          alias: flujo.nombreCuenta,
          tipo: 'cuenta_corriente'
        };
      }
    });
  }

  const bancos = Object.values(bancosUnicos);
  console.log(`✅ Bancos extraídos: ${bancos.length}`);
  
  return bancos;
};

// ===== FUNCIONES AUXILIARES =====

/**
 * Calcula días vencidos desde una fecha
 */
const calcularDiasVencidos = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);
    
    const diferencia = hoy - vencimiento;
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.warn('Error calculando días vencidos:', error);
    return 0;
  }
};

/**
 * Calcula días desde una fecha
 */
const calcularDiasDesde = (fecha) => {
  if (!fecha) return 0;
  
  try {
    const hoy = new Date();
    const fechaInicio = new Date(fecha);
    const diferencia = hoy - fechaInicio;
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 0;
  }
};

/**
 * Calcula días hasta una fecha
 */
const calcularDiasHasta = (fecha) => {
  if (!fecha) return 0;
  
  try {
    const hoy = new Date();
    const fechaFutura = new Date(fecha);
    const diferencia = fechaFutura - hoy;
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
  } catch (error) {
    return 0;
  }
};

/**
 * Extrae nombre del banco de una cuenta
 */
const extraerBancoDeCuenta = (nombreCuenta) => {
  if (!nombreCuenta) return 'Banco no especificado';
  
  const bancos = ['BCI', 'Santander', 'Chile', 'Estado', 'Itau', 'Security', 'Falabella', 'Ripley'];
  
  for (const banco of bancos) {
    if (nombreCuenta.toUpperCase().includes(banco.toUpperCase())) {
      return `Banco ${banco}`;
    }
  }
  
  return 'Banco no identificado';
};

// Exportar todas las funciones
const chipaxAdapter = {
  adaptSaldosBancarios,
  adaptCuentasPendientes,
  adaptCuentasPorPagar,
  adaptFacturasPendientesAprobacion,
  adaptFlujoCaja,
  adaptEgresosProgramados,
  adaptBancos
};

export default chipaxAdapter;

console.log('✅ chipaxAdapter optimizado para datos reales de Chipax');


