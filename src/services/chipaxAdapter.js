// chipaxAdapter.js - Adaptador corregido con validaciones robustas

/**
 * ADAPTADOR PRINCIPAL: Cuentas por Pagar (Compras)
 * CORRECCIÓN CRÍTICA: Maneja datos no-array y convierte proveedor a string
 */
export const adaptarCompras = (compras) => {
  console.log('🛒 Iniciando adaptación de compras...');
  console.log('📊 Tipo de datos recibidos:', typeof compras);
  console.log('📊 Es array:', Array.isArray(compras));
  
  // VALIDACIÓN CRÍTICA: Verificar que tenemos datos válidos
  if (!compras) {
    console.warn('⚠️ adaptarCompras: datos nulos o undefined');
    return [];
  }
  
  // CORRECCIÓN: Si no es array, intentar convertir
  let datosParaProcesar = compras;
  
  if (!Array.isArray(compras)) {
    console.warn('⚠️ adaptarCompras: Se esperaba un array, recibido:', typeof compras);
    
    // Si es un objeto, buscar arrays dentro
    if (typeof compras === 'object' && compras !== null) {
      console.log('🔍 Buscando arrays dentro del objeto...');
      
      // Buscar propiedades que contengan arrays
      for (const [key, value] of Object.entries(compras)) {
        if (Array.isArray(value)) {
          console.log(`✅ Array encontrado en propiedad '${key}':`, value.length, 'items');
          datosParaProcesar = value;
          break;
        }
      }
      
      // Si no encontramos arrays, convertir el objeto a array
      if (!Array.isArray(datosParaProcesar)) {
        console.log('🔄 Convirtiendo objeto único a array');
        datosParaProcesar = [compras];
      }
    } else {
      console.error('❌ Datos inválidos para adaptarCompras');
      return [];
    }
  }
  
  // Asegurar que ahora tenemos un array
  if (!Array.isArray(datosParaProcesar)) {
    console.error('❌ No se pudo convertir a array válido');
    return [];
  }
  
  console.log(`📦 Procesando ${datosParaProcesar.length} compras...`);
  
  return datosParaProcesar.map((compra, index) => {
    // SOLUCIÓN PRINCIPAL: Convertir proveedor a string para evitar error de React
    const proveedorNombre = extraerTextoSeguro(compra.razonSocial || compra.proveedor || compra.nombre) || 'Sin proveedor';
    const proveedorRut = extraerTextoSeguro(compra.rutEmisor || compra.rut) || 'Sin RUT';
    
    // Extraer monto con múltiples estrategias
    const monto = extraerNumero(compra.montoTotal || compra.total || compra.monto || compra.valor) || 0;
    
    const resultado = {
      id: compra.id || `compra_${index}`,
      numero: extraerTextoSeguro(compra.folio || compra.numero) || `C-${index + 1}`,
      fecha: extraerFecha(compra.fecha || compra.fechaEmision) || new Date().toISOString().split('T')[0],
      
      // ✅ CORRECCIÓN PRINCIPAL: proveedor como string
      proveedor: proveedorNombre,
      
      // ✅ Información detallada del proveedor en objeto separado
      proveedorInfo: {
        nombre: proveedorNombre,
        rut: proveedorRut,
        razonSocial: extraerTextoSeguro(compra.razonSocial)
      },
      
      monto: monto,
      moneda: extraerTextoSeguro(compra.moneda) || 'CLP',
      tipo: extraerTextoSeguro(compra.tipo || compra.tipoDocumento) || 'Compra',
      estado: extraerTextoSeguro(compra.estado) || 'Pendiente',
      
      // Campos adicionales
      descripcion: extraerTextoSeguro(compra.descripcion || compra.detalle) || '',
      categoria: extraerTextoSeguro(compra.categoria) || 'Sin categoría',
      
      // Fechas importantes
      fechaVencimiento: extraerFecha(compra.fechaVencimiento),
      fechaPago: extraerFecha(compra.fechaPago),
      
      // Metadatos
      origenDatos: 'compras',
      fechaProcesamiento: new Date().toISOString()
    };
    
    // Log detallado para la primera compra
    if (index === 0) {
      console.log('🔍 Primera compra adaptada:', {
        proveedor: resultado.proveedor,
        monto: resultado.monto,
        esProveedorString: typeof resultado.proveedor === 'string'
      });
    }
    
    return resultado;
  });
};

/**
 * ADAPTADOR: DTEs (Documentos Tributarios Electrónicos) para Cuentas por Cobrar
 */
export const adaptarDTEs = (dtes) => {
  console.log('📋 Iniciando adaptación de DTEs...');
  
  if (!dtes) {
    console.warn('⚠️ adaptarDTEs: datos nulos');
    return [];
  }
  
  let datosParaProcesar = dtes;
  
  if (!Array.isArray(dtes)) {
    console.warn('⚠️ adaptarDTEs: Se esperaba un array, recibido:', typeof dtes);
    
    if (typeof dtes === 'object' && dtes !== null) {
      // Buscar arrays dentro del objeto
      for (const [key, value] of Object.entries(dtes)) {
        if (Array.isArray(value)) {
          console.log(`✅ DTEs encontrados en '${key}':`, value.length, 'items');
          datosParaProcesar = value;
          break;
        }
      }
      
      if (!Array.isArray(datosParaProcesar)) {
        datosParaProcesar = [dtes];
      }
    } else {
      return [];
    }
  }
  
  console.log(`📊 Procesando ${datosParaProcesar.length} DTEs...`);
  
  return datosParaProcesar.map((dte, index) => {
    // Extraer saldo pendiente con múltiples estrategias
    let saldoPendiente = 0;
    
    if (dte.Saldo && dte.Saldo.saldoDeudor !== undefined) {
      saldoPendiente = extraerNumero(dte.Saldo.saldoDeudor);
    } else if (dte.montoTotal !== undefined) {
      saldoPendiente = extraerNumero(dte.montoTotal);
    } else if (dte.total !== undefined) {
      saldoPendiente = extraerNumero(dte.total);
    }
    
    return {
      id: dte.id || `dte_${index}`,
      folio: extraerTextoSeguro(dte.folio) || `DTE-${index + 1}`,
      razonSocial: extraerTextoSeguro(dte.razonSocial) || 'Cliente no especificado',
      rutCliente: extraerTextoSeguro(dte.rutEmisor || dte.rut) || 'Sin RUT',
      monto: saldoPendiente,
      fecha: extraerFecha(dte.fecha || dte.fechaEmision) || new Date().toISOString().split('T')[0],
      fechaVencimiento: extraerFecha(dte.fechaVencimiento),
      tipo: extraerNumero(dte.tipo) || 33, // 33 = Factura electrónica
      tipoDescripcion: obtenerTipoDocumento(dte.tipo),
      estado: extraerTextoSeguro(dte.estado) || 'Pendiente',
      moneda: extraerTextoSeguro(dte.moneda) || 'CLP',
      
      // Metadatos
      origenDatos: 'dtes',
      fechaProcesamiento: new Date().toISOString()
    };
  });
};

/**
 * ADAPTADOR: Cuentas Corrientes para Saldos Bancarios
 */
export const adaptarCuentasCorrientes = (cuentas) => {
  console.log('🏦 Iniciando adaptación de cuentas corrientes...');
  
  if (!cuentas) {
    console.warn('⚠️ adaptarCuentasCorrientes: datos nulos');
    return [];
  }
  
  let datosParaProcesar = cuentas;
  
  if (!Array.isArray(cuentas)) {
    console.warn('⚠️ adaptarCuentasCorrientes: Se esperaba un array, recibido:', typeof cuentas);
    
    if (typeof cuentas === 'object' && cuentas !== null) {
      for (const [key, value] of Object.entries(cuentas)) {
        if (Array.isArray(value)) {
          console.log(`✅ Cuentas encontradas en '${key}':`, value.length, 'items');
          datosParaProcesar = value;
          break;
        }
      }
      
      if (!Array.isArray(datosParaProcesar)) {
        datosParaProcesar = [cuentas];
      }
    } else {
      return [];
    }
  }
  
  console.log(`🏦 Procesando ${datosParaProcesar.length} cuentas corrientes...`);
  
  return datosParaProcesar.map((cuenta, index) => {
    // Extraer saldo con múltiples estrategias
    let saldo = 0;
    
    if (cuenta.saldo !== undefined) saldo = extraerNumero(cuenta.saldo);
    else if (cuenta.saldoActual !== undefined) saldo = extraerNumero(cuenta.saldoActual);
    else if (cuenta.saldoContable !== undefined) saldo = extraerNumero(cuenta.saldoContable);
    else if (cuenta.saldoDisponible !== undefined) saldo = extraerNumero(cuenta.saldoDisponible);
    else if (cuenta.balance !== undefined) saldo = extraerNumero(cuenta.balance);
    else if (cuenta.Saldo && cuenta.Saldo.saldoDeudor !== undefined) saldo = extraerNumero(cuenta.Saldo.saldoDeudor);
    
    return {
      id: cuenta.id || `cuenta_${index}`,
      nombre: extraerTextoSeguro(cuenta.numeroCuenta || cuenta.nombre || cuenta.numero) || `Cuenta ${index + 1}`,
      banco: extraerTextoSeguro(cuenta.banco || (cuenta.Banco && cuenta.Banco.nombre) || cuenta.nombreBanco) || 'Banco no especificado',
      saldo: saldo,
      tipo: extraerTextoSeguro(cuenta.tipo || (cuenta.TipoCuentaCorriente && cuenta.TipoCuentaCorriente.tipoCuenta)) || 'Cuenta Corriente',
      moneda: extraerTextoSeguro(cuenta.moneda || (cuenta.Moneda && cuenta.Moneda.moneda)) || 'CLP',
      simboloMoneda: extraerTextoSeguro(cuenta.simboloMoneda || (cuenta.Moneda && cuenta.Moneda.simbolo)) || '$',
      
      // Metadatos
      origenDatos: 'cuentas-corrientes',
      fechaProcesamiento: new Date().toISOString(),
      ultimaActualizacion: extraerFecha(cuenta.fechaUltimaActualizacion) || new Date().toISOString()
    };
  });
};

// === FUNCIONES AUXILIARES DE EXTRACCIÓN SEGURA ===

/**
 * Extrae texto de forma segura, manejando objetos y valores nulos
 */
function extraerTextoSeguro(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }
  
  // Si es un objeto, intentar extraer propiedades útiles
  if (typeof valor === 'object') {
    if (valor.nombre) return String(valor.nombre);
    if (valor.descripcion) return String(valor.descripcion);
    if (valor.razonSocial) return String(valor.razonSocial);
    
    // Si es un objeto sin propiedades útiles, convertir a string
    return JSON.stringify(valor);
  }
  
  return String(valor);
}

/**
 * Extrae números de forma segura
 */
function extraerNumero(valor) {
  if (valor === null || valor === undefined) {
    return 0;
  }
  
  const numero = parseFloat(valor);
  return isNaN(numero) ? 0 : numero;
}

/**
 * Extrae fechas de forma segura
 */
function extraerFecha(valor) {
  if (!valor) return null;
  
  try {
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return null;
    return fecha.toISOString().split('T')[0];
  } catch (error) {
    return null;
  }
}

/**
 * Obtiene descripción del tipo de documento
 */
function obtenerTipoDocumento(tipo) {
  const tipos = {
    33: 'Factura Electrónica',
    34: 'Factura No Afecta Electrónica',
    39: 'Boleta Electrónica',
    41: 'Boleta No Afecta Electrónica',
    46: 'Factura de Compra Electrónica',
    52: 'Guía de Despacho Electrónica',
    56: 'Nota de Débito Electrónica',
    61: 'Nota de Crédito Electrónica'
  };
  
  return tipos[tipo] || `Documento Tipo ${tipo}`;
}

/**
 * Función de prueba para verificar que el adaptador funciona
 */
export const probarAdaptadorCorregido = (datosComprasSample) => {
  console.log('🧪 Probando adaptador corregido...');
  
  // Datos de prueba si no se proporcionan
  const datosPrueba = datosComprasSample || [
    {
      id: 1,
      folio: 'F001',
      razonSocial: 'Proveedor Test',
      rutEmisor: '12345678-9',
      montoTotal: 100000,
      fecha: '2025-06-17'
    }
  ];
  
  const resultado = adaptarCompras(datosPrueba);
  
  // Verificar que todos los proveedores sean strings
  const proveedoresString = resultado.every(compra => typeof compra.proveedor === 'string');
  
  console.log('✅ Todos los proveedores son strings:', proveedoresString);
  console.log('📊 Cantidad procesada:', resultado.length);
  
  if (resultado.length > 0) {
    console.log('📋 Muestra del resultado:', {
      proveedor: resultado[0].proveedor,
      tipo: typeof resultado[0].proveedor,
      proveedorInfo: resultado[0].proveedorInfo
    });
  }
  
  return {
    esValido: proveedoresString,
    muestra: resultado[0],
    total: resultado.length,
    todosSonStrings: proveedoresString
  };
};

// Exportaciones por defecto
export default {
  adaptarCompras,
  adaptarDTEs,
  adaptarCuentasCorrientes,
  probarAdaptadorCorregido
};
