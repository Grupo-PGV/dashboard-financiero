// chipaxAdapter.js - Adaptador para transformar datos de Chipax al formato del dashboard

// === FUNCIONES AUXILIARES ===

/**
 * Calcula los días vencidos desde una fecha
 */
const calcularDiasVencidos = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diferencia = hoy - vencimiento;
  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
  
  return dias > 0 ? dias : 0;
};

/**
 * Obtiene el nombre del tipo de documento según su código
 */
const obtenerTipoDocumento = (tipo) => {
  const tipos = {
    30: 'Factura',
    32: 'Factura de venta exenta',
    33: 'Factura electrónica',
    34: 'Factura no afecta o exenta electrónica',
    35: 'Boleta',
    38: 'Boleta exenta',
    39: 'Boleta electrónica',
    41: 'Boleta exenta electrónica',
    46: 'Factura de compra',
    52: 'Guía de despacho',
    56: 'Nota de débito',
    61: 'Nota de crédito',
    110: 'Factura de exportación',
    111: 'Nota de débito de exportación',
    112: 'Nota de crédito de exportación'
  };
  
  return tipos[tipo] || `Tipo ${tipo}`;
};

/**
 * Determina el estado de un DTE basado en su información
 */
const determinarEstadoDTE = (dte, saldoPendiente) => {
  if (dte.anulado) return 'anulado';
  if (saldoPendiente === 0) return 'pagado';
  if (saldoPendiente > 0) return 'pendiente';
  return 'desconocido';
};

// === FUNCIÓN PRINCIPAL DE ADAPTACIÓN ===

/**
 * Adapta los datos según el tipo de entidad
 */
export const adaptarDatosChipax = (tipo, datos) => {
  if (!datos || !Array.isArray(datos)) {
    console.warn(`⚠️ Datos inválidos para tipo ${tipo}:`, datos);
    return [];
  }

  console.log(`🔄 Adaptando ${datos.length} registros de tipo ${tipo}`);

  switch (tipo) {
    case 'saldosBancarios':
      return adaptarCuentasCorrientes(datos);
    
    case 'cuentasPorCobrar':
      return adaptarDTEs(datos);
    
    case 'cuentasPorPagar':
      return adaptarCompras(datos);
    
    case 'clientes':
      return adaptarClientes(datos);
    
    case 'proveedores':
      return adaptarProveedores(datos);
    
    case 'flujoCaja':
      return adaptarFlujoCaja(datos);
    
    default:
      console.warn(`⚠️ Tipo de adaptación no reconocido: ${tipo}`);
      return datos;
  }
};

/**
 * Adapta cuentas corrientes al formato de saldos bancarios
 */
const adaptarCuentasCorrientes = (cuentas) => {
  return cuentas.map(cuenta => ({
    id: cuenta.id,
    nombre: cuenta.numeroCuenta || cuenta.nombre || 'Cuenta sin número',
    banco: cuenta.banco || cuenta.TipoCuentaCorriente?.tipoCuenta || cuenta.Banco?.banco || 'Banco no especificado',
    saldo: cuenta.saldo || cuenta.saldoContable || 0,
    moneda: cuenta.Moneda?.moneda || cuenta.moneda || 'CLP',
    simboloMoneda: cuenta.Moneda?.simbolo || cuenta.simboloMoneda || '$',
    tipo: cuenta.TipoCuentaCorriente?.nombreCorto || cuenta.tipo || 'Cuenta Corriente',
    ultimaActualizacion: cuenta.fechaUltimaActualizacion || cuenta.updated_at || new Date().toISOString()
  }));
};

/**
 * Adapta DTEs al formato de cuentas por cobrar
 * Los DTEs vienen del endpoint /dtes?porCobrar=1
 */
const adaptarDTEs = (dtes) => {
  console.log(`📋 Adaptando ${dtes.length} DTEs`);
  
  return dtes.map((dte, index) => {
    // Log del primer DTE para debugging
    if (index === 0) {
      console.log('🔍 Primer DTE adaptado:', {
        razonSocial: dte.razonSocial,
        montoTotal: dte.montoTotal,
        saldoDeudor: dte.Saldo?.saldoDeudor
      });
    }

    // Calcular días vencidos
    const fechaVencimiento = dte.fechaVencimiento;
    const diasVencidos = calcularDiasVencidos(fechaVencimiento);
    
    // El saldo pendiente viene en Saldo.saldoDeudor
    const saldoPendiente = dte.Saldo?.saldoDeudor || 0;
    
    return {
      id: dte.id,
      folio: dte.folio,
      tipo: obtenerTipoDocumento(dte.tipo),
      tipoNumero: dte.tipo,
      // Cliente como string simple para evitar el error de React
      cliente: dte.razonSocial || dte.ClienteNormalizado?.razonSocial || 'Sin nombre',
      // Información adicional del cliente en objeto separado
      clienteInfo: {
        nombre: dte.razonSocial || dte.ClienteNormalizado?.razonSocial || 'Sin nombre',
        rut: dte.rut || 'Sin RUT',
        id: dte.idCliente
      },
      fechaEmision: dte.fechaEmision,
      fechaVencimiento: dte.fechaVencimiento,
      monto: dte.montoTotal,
      montoNeto: dte.montoNeto,
      iva: dte.iva,
      saldo: saldoPendiente,
      diasVencidos: diasVencidos,
      estado: saldoPendiente > 0 ? 'pendiente' : 'pagado',
      pagado: saldoPendiente === 0,
      // Campos adicionales útiles
      tipoTransaccion: dte.tipoTransaccion,
      numeroInterno: dte.numeroInterno,
      urlPDF: dte.urlPDF,
      urlXML: dte.urlXML,
      // Información de pagos si existe
      cartolas: dte.Cartolas || []
    };
  });
};

/**
 * Adapta compras al formato de cuentas por pagar
 */
const adaptarCompras = (compras) => {
  console.log(`💸 Adaptando ${compras.length} compras`);
  
  return compras.map((compra, index) => {
    // Logging para la primera compra
    if (index === 0) {
      console.log('🔍 Estructura de la primera compra:', {
        id: compra.id,
        folio: compra.folio,
        tipo: compra.tipo,
        razonSocial: compra.razonSocial,
        montoTotal: compra.montoTotal,
        Saldo: compra.Saldo,
        fechaPagoInterna: compra.fechaPagoInterna
      });
    }

    // Determinar el monto pendiente
    let saldoPendiente = 0;
    if (compra.Saldo?.saldo_acreedor) {
      saldoPendiente = compra.Saldo.saldo_acreedor;
    } else if (compra.Saldo?.saldoAcreedor) {
      saldoPendiente = compra.Saldo.saldoAcreedor;
    } else if (!compra.fechaPagoInterna && compra.montoTotal) {
      saldoPendiente = compra.montoTotal;
    }

    const fechaVencimiento = compra.fechaVencimiento || compra.fecha_vencimiento || compra.fechaEmision;
    const diasVencidos = calcularDiasVencidos(fechaVencimiento);
    
    return {
      id: compra.id,
      folio: compra.folio || compra.numero || 'S/N',
      tipo: obtenerTipoDocumento(compra.tipo || compra.tipo_documento),
      tipoNumero: compra.tipo || compra.tipo_documento,
      proveedor: {
        nombre: compra.razonSocial || compra.ClienteProveedor?.razonSocial || 'Sin nombre',
        rut: compra.rutEmisor || compra.ClienteProveedor?.rut || 'Sin RUT'
      },
      fechaEmision: compra.fechaEmision || compra.fecha_emision,
      fechaVencimiento: fechaVencimiento,
      fechaPagoInterna: compra.fechaPagoInterna,
      monto: compra.montoTotal || compra.monto_total || 0,
      montoNeto: compra.montoNeto || compra.monto_neto || 0,
      iva: compra.iva || compra.montoIva || 0,
      saldo: saldoPendiente,
      diasVencidos: diasVencidos,
      estado: compra.estado || (compra.fechaPagoInterna ? 'pagado' : 'pendiente'),
      pagado: compra.fechaPagoInterna !== null || saldoPendiente === 0,
      // Campos adicionales
      observaciones: compra.observaciones || '',
      centroCosto: compra.CentroCosto?.nombre || ''
    };
  });
};

/**
 * Adapta clientes al formato esperado
 */
const adaptarClientes = (clientes) => {
  return clientes.map(cliente => ({
    id: cliente.id,
    nombre: cliente.razonSocial || cliente.nombre || 'Sin nombre',
    rut: cliente.rut || 'Sin RUT',
    email: cliente.email || cliente.correo || '',
    telefono: cliente.telefono || cliente.fono || '',
    direccion: cliente.direccion || cliente.direccionComercial || '',
    comuna: cliente.comuna || '',
    ciudad: cliente.ciudad || '',
    giro: cliente.giro || '',
    contacto: cliente.contacto || cliente.nombreContacto || '',
    plazoPago: cliente.plazoPago || 30,
    activo: cliente.activo !== false
  }));
};

/**
 * Adapta proveedores al formato esperado
 */
const adaptarProveedores = (proveedores) => {
  return proveedores.map(proveedor => ({
    id: proveedor.id,
    nombre: proveedor.razonSocial || proveedor.nombre || 'Sin nombre',
    rut: proveedor.rut || 'Sin RUT',
    email: proveedor.email || proveedor.correo || '',
    telefono: proveedor.telefono || proveedor.fono || '',
    direccion: proveedor.direccion || '',
    comuna: proveedor.comuna || '',
    ciudad: proveedor.ciudad || '',
    giro: proveedor.giro || '',
    contacto: proveedor.contacto || proveedor.nombreContacto || '',
    banco: proveedor.banco || '',
    numeroCuenta: proveedor.numeroCuenta || proveedor.cuentaBancaria || '',
    tipoCuenta: proveedor.tipoCuenta || '',
    activo: proveedor.activo !== false
  }));
};

/**
 * Adapta flujo de caja al formato esperado
 */
const adaptarFlujoCaja = (datos) => {
  console.log('💵 Adaptando flujo de caja, datos recibidos:', datos);
  
  // Si viene un objeto con arrFlujoCaja
  if (datos.arrFlujoCaja && Array.isArray(datos.arrFlujoCaja)) {
    return procesarFlujoCaja(datos.arrFlujoCaja);
  }
  
  // Si ya es un array de movimientos
  if (Array.isArray(datos)) {
    return procesarFlujoCaja(datos);
  }
  
  // Si no hay datos
  return {
    periodos: [],
    totales: { ingresos: 0, egresos: 0, saldo: 0 }
  };
};

/**
 * Procesa los movimientos del flujo de caja agrupándolos por período
 */
const procesarFlujoCaja = (movimientos) => {
  // Agrupar por mes
  const periodosPorMes = {};
  
  movimientos.forEach(mov => {
    const fecha = new Date(mov.fecha || mov.fechaMovimiento);
    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    
    if (!periodosPorMes[mesKey]) {
      periodosPorMes[mesKey] = {
        fecha: mesKey,
        ingresos: 0,
        egresos: 0,
        movimientos: []
      };
    }
    
    const monto = mov.monto || mov.montoMovimiento || 0;
    
    if (monto > 0) {
      periodosPorMes[mesKey].ingresos += monto;
    } else {
      periodosPorMes[mesKey].egresos += Math.abs(monto);
    }
    
    periodosPorMes[mesKey].movimientos.push(mov);
  });
  
  // Convertir a array y ordenar por fecha
  const periodos = Object.values(periodosPorMes)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  
  // Calcular totales
  const totales = periodos.reduce((acc, periodo) => ({
    ingresos: acc.ingresos + periodo.ingresos,
    egresos: acc.egresos + periodo.egresos,
    saldo: acc.ingresos + periodo.ingresos - acc.egresos - periodo.egresos
  }), { ingresos: 0, egresos: 0, saldo: 0 });
  
  return { periodos, totales };
};
