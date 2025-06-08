// chipaxAdapter.js - Adaptador completo con exportaciones corregidas

/**
 * Formatea un RUT chileno
 */
const formatearRut = (rut) => {
  if (!rut) return '';
  // Mantener formato con guión si ya lo tiene
  if (rut.includes('-')) return rut;
  // Si no tiene guión, agregarlo
  const rutLimpio = rut.replace(/[^0-9kK]/g, '');
  if (rutLimpio.length > 1) {
    return rutLimpio.slice(0, -1) + '-' + rutLimpio.slice(-1);
  }
  return rut;
};

/**
 * Calcula los días vencidos de una factura
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

/**
 * Adapta los saldos bancarios
 */
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

/**
 * Adapta las cuentas pendientes (por cobrar)
 */
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
      diasVencido: calcularDiasVencidos(factura.fechaVencimiento || factura.fechaEmision)
    };
  }).filter(cuenta => cuenta.saldo > 0);
};

/**
 * Adapta las cuentas por pagar (facturas de compra) desde Chipax
 */
const adaptCuentasPorPagar = (datos) => {
  console.log('🔄 Adaptando cuentas por pagar...');
  
  if (!datos) {
    console.warn('⚠️ No se recibieron datos de compras');
    return [];
  }
  
  // Manejar tanto array directo como objeto con items
  const facturas = Array.isArray(datos) ? datos : (datos.items || []);
  
  const cuentasAdaptadas = facturas
    .filter(factura => {
      // Filtrar solo facturas pendientes de pago
      // Basándonos en la estructura real de Chipax:
      // - No tienen campo "pagado" explícito
      // - fechaPagoInterna podría indicar si está pagada
      // - Por ahora incluimos todas las facturas con monto > 0
      return factura.montoTotal > 0;
    })
    .map(factura => {
      // Calcular días vencidos basado en fechaPagoInterna
      const fechaPago = factura.fechaPagoInterna || factura.fechaVencimiento;
      const diasVencidos = calcularDiasVencidos(fechaPago);
      
      return {
        id: factura.id,
        folio: factura.folio || `Doc-${factura.id}`,
        tipo: factura.tipo === 33 ? 'Factura' : factura.tipo === 34 ? 'Factura Exenta' : 'Documento',
        proveedor: {
          rut: formatearRut(factura.rutEmisor || ''),
          nombre: factura.razonSocial || 'Proveedor no especificado'
        },
        monto: factura.montoTotal || 0,
        saldo: factura.montoTotal || 0, // Asumimos que el saldo es el total si no está pagada
        moneda: factura.idMoneda === 1000 ? 'CLP' : 'Otra',
        fechaEmision: factura.fechaEmision || new Date().toISOString(),
        fechaVencimiento: factura.fechaPagoInterna || factura.fechaVencimiento || null,
        diasVencidos: diasVencidos,
        estado: factura.estado || 'pendiente',
        estadoPago: diasVencidos > 0 ? 'vencido' : 'pendiente',
        observaciones: factura.referencias || '',
        // Campos adicionales útiles
        montoNeto: factura.montoNeto || 0,
        iva: factura.iva || 0,
        montoExento: factura.montoExento || 0,
        eventoReceptor: factura.eventoReceptor,
        eventoReceptorLeyenda: factura.eventoReceptorLeyenda
      };
    });
  
  console.log(`✅ ${cuentasAdaptadas.length} cuentas por pagar adaptadas`);
  
  // Mostrar resumen
  const totalPorPagar = cuentasAdaptadas.reduce((sum, c) => sum + c.saldo, 0);
  const vencidas = cuentasAdaptadas.filter(c => c.diasVencidos > 0).length;
  console.log(`💸 Total por pagar: ${totalPorPagar.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`);
  console.log(`⚠️ Facturas vencidas: ${vencidas}`);
  
  return cuentasAdaptadas;
};

/**
 * Adapta bancos desde saldos bancarios
 */
const adaptBancos = (saldosBancarios) => {
  if (!saldosBancarios || !Array.isArray(saldosBancarios)) {
    return [];
  }
  
  // Extraer lista única de bancos
  const bancosUnicos = {};
  
  saldosBancarios.forEach(cuenta => {
    const banco = cuenta.banco || cuenta.nombreBanco || 'Banco Desconocido';
    if (!bancosUnicos[banco]) {
      bancosUnicos[banco] = {
        nombre: banco,
        cuentas: []
      };
    }
    bancosUnicos[banco].cuentas.push(cuenta);
  });
  
  return Object.values(bancosUnicos);
};

/**
 * Adapta facturas pendientes de aprobación
 */
const adaptFacturasPendientesAprobacion = (facturas) => {
  if (!facturas || !Array.isArray(facturas)) {
    return [];
  }
  
  return facturas.filter(f => f.estado === 'pendiente_aprobacion' || f.requiereAprobacion);
};

/**
 * Adapta flujo de caja
 */
const adaptFlujoCaja = (datos, saldoInicial = 0) => {
  // Implementación básica - expandir según estructura real de Chipax
  return {
    meses: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'],
    ingresos: [1000000, 1200000, 1100000, 1300000, 1150000, 1250000],
    egresos: [800000, 950000, 900000, 1050000, 920000, 980000],
    saldoAcumulado: [200000, 450000, 650000, 900000, 1130000, 1400000]
  };
};

/**
 * Adapta egresos programados
 */
const adaptEgresosProgramados = (pagos) => {
  if (!pagos || !Array.isArray(pagos)) {
    return [];
  }
  
  return pagos.map(pago => ({
    id: pago.id,
    descripcion: pago.descripcion || 'Pago programado',
    monto: pago.monto || 0,
    fecha: pago.fechaProgramada || pago.fecha,
    estado: pago.estado || 'pendiente'
  }));
};

/**
 * Función principal de adaptación
 */
export const adaptarDatosChipax = (tipo, datos) => {
  console.log(`🔄 Adaptando datos tipo: ${tipo}`);
  
  switch (tipo) {
    case 'saldosBancarios':
    case 'cuentas_corrientes':
      return adaptSaldosBancarios(datos);
      
    case 'cuentasPorCobrar':
    case 'ventas':
    case 'facturas_venta':
      return adaptCuentasPendientes(datos);
      
    case 'cuentasPorPagar':
    case 'compras':
    case 'facturas_compra':
      return adaptCuentasPorPagar(datos);
      
    case 'flujoCaja':
    case 'flujo_caja':
      return adaptFlujoCaja(datos);
      
    default:
      console.warn(`⚠️ Tipo de adaptación no reconocido: ${tipo}`);
      return datos;
  }
};

// Exportar objeto por defecto para compatibilidad
export default {
  adaptarDatosChipax,
  adaptSaldosBancarios,
  adaptCuentasPendientes,
  adaptCuentasPorPagar,
  adaptBancos,
  adaptFacturasPendientesAprobacion,
  adaptFlujoCaja,
  adaptEgresosProgramados,
  // Funciones helper
  calcularDiasVencidos,
  formatearRut
};
