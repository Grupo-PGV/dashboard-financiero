// chipaxAdapter.js - Adaptador para transformar datos de Chipax al formato del dashboard

/**
 * Adapta los datos según el tipo de entidad
 */
export const adaptarDatosChipax = (tipo, datos) => {
  if (!datos || !Array.isArray(datos)) {
    console.warn(`⚠️ Datos inválidos para tipo ${tipo}:`, datos);
    return [];
  }

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
    nombre: cuenta.numeroCuenta || 'Cuenta sin número',
    banco: cuenta.banco || cuenta.TipoCuentaCorriente?.tipoCuenta || 'Banco no especificado',
    saldo: cuenta.saldo || 0, // Puede que necesites obtener esto de otro endpoint
    moneda: cuenta.Moneda?.moneda || 'CLP',
    simboloMoneda: cuenta.Moneda?.simbolo || '$',
    tipo: cuenta.TipoCuentaCorriente?.nombreCorto || 'Cuenta Corriente'
  }));
};

// En chipaxAdapter.js - función adaptarDTEs corregida con la estructura real

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

// Función auxiliar para calcular días vencidos
const calcularDiasVencidos = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diferencia = hoy - vencimiento;
  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
  
  return dias > 0 ? dias : 0;
};

// Función auxiliar para obtener el nombre del tipo de documento
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
 * Adapta compras al formato de cuentas por pagar
 */
const adaptarCompras = (compras) => {
  return compras.map(compra => {
    const fechaVencimiento = compra.fechaVencimiento || compra.fechaEmision;
    const diasVencidos = calcularDiasVencidos(fechaVencimiento);
    
    return {
      id: compra.id,
      folio: compra.folio,
      tipo: obtenerTipoDocumento(compra.tipo),
      proveedor: {
        nombre: compra.razonSocial,
        rut: compra.rutEmisor
      },
      fechaEmision: compra.fechaEmision,
      fechaVencimiento: fechaVencimiento,
      fechaPagoInterna: compra.fechaPagoInterna,
      monto: compra.montoTotal,
      montoNeto: compra.montoNeto,
      iva: compra.iva,
      saldo: compra.fechaPagoInterna ? 0 : compra.montoTotal, // Si tiene fecha de pago, está pagado
      diasVencidos: diasVencidos,
      estado: compra.estado,
      pagado: !!compra.fechaPagoInterna
    };
  });
};

/**
 * Adapta clientes
 */
const adaptarClientes = (clientes) => {
  return clientes.map(cliente => ({
    id: cliente.id,
    nombre: cliente.nombre || cliente.razon_social,
    razonSocial: cliente.razon_social,
    rut: cliente.rut,
    email: cliente.email,
    telefono: cliente.telefono,
    direccion: cliente.direccion
  }));
};

/**
 * Adapta proveedores
 */
const adaptarProveedores = (proveedores) => {
  return proveedores.map(proveedor => ({
    id: proveedor.id,
    nombre: proveedor.nombre || proveedor.razon_social,
    razonSocial: proveedor.razon_social,
    rut: proveedor.rut,
    email: proveedor.email,
    telefono: proveedor.telefono,
    direccion: proveedor.direccion
  }));
};

/**
 * Adapta flujo de caja desde cartolas
 */
const adaptarFlujoCaja = (movimientos) => {
  // Agrupar por mes
  const flujoMensual = {};
  
  movimientos.forEach(mov => {
    const fecha = new Date(mov.fecha);
    const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    
    if (!flujoMensual[mesKey]) {
      flujoMensual[mesKey] = {
        mes: obtenerNombreMes(fecha.getMonth()),
        año: fecha.getFullYear(),
        ingresos: 0,
        egresos: 0
      };
    }
    
    // Sumar abonos como ingresos y cargos como egresos
    flujoMensual[mesKey].ingresos += mov.abono || 0;
    flujoMensual[mesKey].egresos += mov.cargo || 0;
  });
  
  // Convertir a array y ordenar por fecha
  return Object.values(flujoMensual)
    .sort((a, b) => {
      const fechaA = new Date(a.año, obtenerNumeroMes(a.mes));
      const fechaB = new Date(b.año, obtenerNumeroMes(b.mes));
      return fechaA - fechaB;
    })
    .map(item => ({
      mes: `${item.mes} ${item.año}`,
      ingresos: item.ingresos,
      egresos: item.egresos,
      saldo: item.ingresos - item.egresos
    }));
};

// === FUNCIONES AUXILIARES ===

const calcularDiasVencidos = (fechaVencimiento) => {
  if (!fechaVencimiento) return 0;
  
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diferencia = hoy - vencimiento;
  const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
  
  return dias > 0 ? dias : 0;
};

const obtenerTipoDocumento = (codigo) => {
  const tipos = {
    33: 'Factura',
    34: 'Factura Exenta',
    61: 'Nota de Crédito',
    56: 'Nota de Débito',
    39: 'Boleta',
    41: 'Boleta Exenta'
  };
  
  return tipos[codigo] || `Documento ${codigo}`;
};

const determinarEstadoDTE = (dte) => {
  if (dte.anulado) return 'anulado';
  if (dte.monto_por_cobrar === 0) return 'pagado';
  if (dte.Saldo && dte.Saldo.saldo_deudor === 0) return 'pagado';
  return 'pendiente';
};

const obtenerNombreMes = (numeroMes) => {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[numeroMes];
};

const obtenerNumeroMes = (nombreMes) => {
  const meses = {
    'Enero': 0, 'Febrero': 1, 'Marzo': 2, 'Abril': 3, 
    'Mayo': 4, 'Junio': 5, 'Julio': 6, 'Agosto': 7,
    'Septiembre': 8, 'Octubre': 9, 'Noviembre': 10, 'Diciembre': 11
  };
  return meses[nombreMes] || 0;
};

// Exportar
export default { adaptarDatosChipax };
