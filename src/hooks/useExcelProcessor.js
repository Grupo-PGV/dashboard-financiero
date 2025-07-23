import { useState } from 'react';

/**
 * Hook personalizado para procesar archivos Excel de cartolas bancarias
 * Diseñado específicamente para el formato de bancos chilenos
 */
const useExcelProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Procesa un archivo Excel y extrae los movimientos bancarios
   * @param {File} file - Archivo Excel subido
   * @returns {Promise<Array>} - Array de movimientos procesados
   */
  const processExcelFile = async (file) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Leer el archivo usando window.fs.readFile (específico para Claude)
      const arrayBuffer = await readFileAsArrayBuffer(file);
      
      // Importar XLSX dinámicamente para optimizar el bundle
      const XLSX = await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      
      // Leer el workbook con configuraciones específicas para cartolas bancarias
      const workbook = XLSX.read(arrayBuffer, {
        cellStyles: true,    // Mantener estilos para detectar formatos
        cellFormulas: true,  // Procesar fórmulas si las hay
        cellDates: true,     // Convertir fechas automáticamente
        cellNF: true,        // Mantener formato de números
        sheetStubs: true,    // Incluir celdas vacías
        raw: false           // Formatear valores según tipo
      });

      console.log('📊 Workbook cargado:', {
        hojas: workbook.SheetNames,
        info: workbook.Workbook
      });

      // Buscar la hoja principal (usualmente la primera o la que contiene "cartola")
      const mainSheetName = findMainSheet(workbook.SheetNames);
      const worksheet = workbook.Sheets[mainSheetName];

      // Detectar rango de datos automáticamente
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      console.log('📍 Rango detectado:', range);

      // Convertir a array de objetos con headers automáticos
      const rawData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,           // Usar números como headers temporalmente
        range: range,        // Usar todo el rango
        raw: false,          // Formatear valores
        dateNF: 'dd/mm/yyyy' // Formato fecha chileno
      });

      // Analizar estructura para detectar headers y datos
      const structureAnalysis = analyzeDataStructure(rawData);
      console.log('🔍 Análisis de estructura:', structureAnalysis);

      // Extraer movimientos basado en el análisis
      const movements = extractMovements(rawData, structureAnalysis);
      
      console.log(`✅ Procesados ${movements.length} movimientos del archivo ${file.name}`);
      
      return movements;

    } catch (err) {
      const errorMessage = `Error procesando ${file.name}: ${err.message}`;
      setError(errorMessage);
      console.error('❌', errorMessage, err);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Lee un archivo como ArrayBuffer (compatible con diferentes entornos)
   */
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * Encuentra la hoja principal que contiene los datos de la cartola
   */
  const findMainSheet = (sheetNames) => {
    // Priorizar hojas con nombres típicos de cartolas
    const priorities = ['cartola', 'movimientos', 'detalle', 'cuenta'];
    
    for (const priority of priorities) {
      const match = sheetNames.find(name => 
        name.toLowerCase().includes(priority)
      );
      if (match) return match;
    }
    
    // Si no encuentra, usar la primera hoja
    return sheetNames[0];
  };

  /**
   * Analiza la estructura del archivo para detectar headers y formato de datos
   */
  const analyzeDataStructure = (rawData) => {
    if (!rawData || rawData.length === 0) {
      throw new Error('Archivo vacío o sin datos válidos');
    }

    // Buscar fila de headers analizando las primeras 10 filas
    let headerRowIndex = -1;
    let headerMapping = {};

    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      // Convertir a string y buscar palabras clave
      const rowText = row.map(cell => (cell || '').toString().toLowerCase()).join(' ');
      
      if (includesMultiple(rowText, ['fecha', 'descripcion', 'saldo']) ||
          includesMultiple(rowText, ['date', 'description', 'balance']) ||
          includesMultiple(rowText, ['cargo', 'abono', 'movimiento'])) {
        
        headerRowIndex = i;
        headerMapping = mapHeaders(row);
        break;
      }
    }

    // Si no encuentra headers explícitos, inferir basado en posición típica
    if (headerRowIndex === -1) {
      headerRowIndex = detectDataStartRow(rawData);
      headerMapping = inferHeaderMapping(rawData[headerRowIndex] || []);
    }

    return {
      headerRowIndex,
      headerMapping,
      dataStartRow: headerRowIndex + 1,
      totalRows: rawData.length,
      sampleData: rawData.slice(headerRowIndex + 1, headerRowIndex + 4)
    };
  };

  /**
   * Mapea headers de cartola a campos estándar
   */
  const mapHeaders = (headerRow) => {
    const mapping = {};
    
    headerRow.forEach((header, index) => {
      if (!header) return;
      
      const headerText = header.toString().toLowerCase().trim();
      
      // Mapeo para diferentes formatos de bancos chilenos
      if (includes(headerText, ['fecha', 'date', 'fec'])) {
        mapping.fecha = index;
      } else if (includes(headerText, ['descripcion', 'glosa', 'detalle', 'concepto', 'description'])) {
        mapping.descripcion = index;
      } else if (includes(headerText, ['cargo', 'debe', 'debito', 'debit', 'salida'])) {
        mapping.cargo = index;
      } else if (includes(headerText, ['abono', 'haber', 'credito', 'credit', 'ingreso'])) {
        mapping.abono = index;
      } else if (includes(headerText, ['saldo', 'balance', 'sal'])) {
        mapping.saldo = index;
      } else if (includes(headerText, ['documento', 'doc', 'numero', 'num', 'ref'])) {
        mapping.documento = index;
      } else if (includes(headerText, ['monto', 'valor', 'amount', 'importe'])) {
        mapping.monto = index;
      }
    });

    return mapping;
  };

  /**
   * Infiere mapeo de headers cuando no están explícitos
   */
  const inferHeaderMapping = (firstDataRow) => {
    // Mapeo típico para cartolas bancarias chilenas
    const defaultMapping = {
      fecha: 0,        // Primera columna generalmente es fecha
      descripcion: 1,  // Segunda columna es descripción
      documento: 2,    // Tercera puede ser número de documento
      cargo: 3,        // Cuarta cargo/débito
      abono: 4,        // Quinta abono/crédito
      saldo: 5         // Sexta saldo
    };

    // Ajustar basado en el número de columnas disponibles
    if (firstDataRow && firstDataRow.length < 6) {
      // Formato simplificado: fecha, descripción, monto, saldo
      return {
        fecha: 0,
        descripcion: 1,
        monto: 2,
        saldo: 3
      };
    }

    return defaultMapping;
  };

  /**
   * Detecta dónde empiezan los datos reales (después de headers y metadatos)
   */
  const detectDataStartRow = (rawData) => {
    for (let i = 0; i < Math.min(15, rawData.length); i++) {
      const row = rawData[i];
      if (!row || row.length < 3) continue;

      // Buscar primera fila que parezca contener una fecha válida
      const firstCell = (row[0] || '').toString().trim();
      if (isValidDate(firstCell)) {
        return i;
      }
    }
    
    return 0; // Fallback al inicio
  };

  /**
   * Extrae movimientos financieros del array de datos
   */
  const extractMovements = (rawData, structure) => {
    const movements = [];
    const { dataStartRow, headerMapping } = structure;

    for (let i = dataStartRow; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length < 3) continue;

      try {
        const movement = parseMovementRow(row, headerMapping, i);
        if (movement && movement.fecha && movement.descripcion) {
          movements.push(movement);
        }
      } catch (error) {
        console.warn(`⚠️ Error en fila ${i + 1}:`, error.message, row);
      }
    }

    // Ordenar por fecha (más recientes primero)
    return movements.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  };

  /**
   * Parsea una fila individual a un objeto de movimiento
   */
  const parseMovementRow = (row, mapping, rowIndex) => {
    // Extraer valores usando el mapeo
    const fecha = extractDate(row[mapping.fecha]);
    const descripcion = (row[mapping.descripcion] || '').toString().trim();
    
    let monto = 0;
    let tipo = 'neutral';

    // Determinar monto y tipo basado en estructura detectada
    if (mapping.cargo !== undefined && mapping.abono !== undefined) {
      // Formato con columnas separadas de cargo/abono
      const cargo = parseAmount(row[mapping.cargo]);
      const abono = parseAmount(row[mapping.abono]);
      
      if (abono > 0) {
        monto = abono;
        tipo = 'ingreso';
      } else if (cargo > 0) {
        monto = -cargo;
        tipo = 'egreso';
      }
    } else if (mapping.monto !== undefined) {
      // Formato con una sola columna de monto
      monto = parseAmount(row[mapping.monto]);
      tipo = monto >= 0 ? 'ingreso' : 'egreso';
    }

    const saldo = mapping.saldo !== undefined ? 
      parseAmount(row[mapping.saldo]) : 0;

    return {
      id: `mov_${Date.now()}_${rowIndex}_${Math.random().toString(36).substr(2, 9)}`,
      fecha: fecha,
      descripcion: descripcion,
      monto: monto,
      tipo: tipo,
      saldo: saldo,
      categoria: categorizeMovement(descripcion),
      documento: mapping.documento !== undefined ? 
        (row[mapping.documento] || '').toString().trim() : '',
      origen: 'excel_import'
    };
  };

  /**
   * Extrae y valida fechas en múltiples formatos
   */
  const extractDate = (cellValue) => {
    if (!cellValue) return null;

    const value = cellValue.toString().trim();
    
    // Intentar parsear como fecha Excel (número serial)
    if (!isNaN(value) && value > 40000 && value < 50000) {
      // Número serial de Excel (días desde 1900-01-01)
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }

    // Intentar formatos de fecha comunes en Chile
    const dateFormats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,     // DD/MM/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,      // DD-MM-YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,      // YYYY-MM-DD
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/     // DD.MM.YYYY
    ];

    for (const format of dateFormats) {
      const match = value.match(format);
      if (match) {
        let [, part1, part2, part3] = match;
        
        // Determinar si es DD/MM/YYYY o YYYY-MM-DD
        if (part3.length === 4 && parseInt(part3) > 1900) {
          // DD/MM/YYYY
          return `${part3}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
        } else if (part1.length === 4 && parseInt(part1) > 1900) {
          // YYYY-MM-DD
          return `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`;
        }
      }
    }

    // Intentar Date.parse como último recurso
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0];
    }

    return null;
  };

  /**
   * Parsea montos eliminando formato chileno (puntos, comas, símbolos)
   */
  const parseAmount = (cellValue) => {
    if (!cellValue) return 0;
    
    const value = cellValue.toString().trim();
    
    // Eliminar símbolos de moneda y formato chileno
    const cleaned = value
      .replace(/[$\s]/g, '')           // Eliminar $ y espacios
      .replace(/\./g, '')              // Eliminar separadores de miles (puntos)
      .replace(/,/g, '.')              // Cambiar coma decimal por punto
      .replace(/[^\d.-]/g, '');        // Eliminar cualquier otro carácter

    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  };

  /**
   * Categoriza movimientos basado en descripción
   */
  const categorizeMovement = (descripcion) => {
    if (!descripcion) return 'otros';
    
    const desc = descripcion.toLowerCase();
    const categories = {
      'transferencia': ['transf', 'transfer', 'giro', 'envio'],
      'pago': ['pago', 'pagare', 'cuota', 'factura'],
      'deposito': ['deposito', 'deposit', 'ingreso', 'abono'],
      'comision': ['comision', 'costo', 'mantención', 'cargo'],
      'interes': ['interes', 'interest', 'ganancia'],
      'impuesto': ['impuesto', 'tax', 'retencion'],
      'nomina': ['sueldo', 'salario', 'remuneracion', 'honorario'],
      'servicios': ['agua', 'luz', 'gas', 'telefono', 'internet']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return category;
      }
    }

    return 'otros';
  };

  // Funciones auxiliares
  const includes = (text, keywords) => {
    return keywords.some(keyword => text.includes(keyword));
  };

  const includesMultiple = (text, keywords) => {
    return keywords.filter(keyword => text.includes(keyword)).length >= 2;
  };

  const isValidDate = (value) => {
    if (!value) return false;
    const dateRegex = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/;
    return dateRegex.test(value.toString().trim());
  };

  return {
    processExcelFile,
    isProcessing,
    error,
    clearError: () => setError(null)
  };
};

export default useExcelProcessor;
