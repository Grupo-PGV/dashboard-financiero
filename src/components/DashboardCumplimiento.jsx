// src/components/DashboardCumplimiento.jsx
import React, { useState, useEffect } from 'react';
import { FileCheck, CheckCircle, Circle, AlertTriangle } from 'lucide-react';

const DashboardCumplimiento = ({ onCerrarSesion }) => {
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [estadoDocumentos, setEstadoDocumentos] = useState({});

  // Datos del manual de certificaciones organizados por cliente
  const clientes = {
    'INCOPORT': {
      modalidad: 'Envío directo',
      documentos: [
        'Liquidaciones de Sueldo',
        'Libro Asistencia', 
        'Certificado F30',
        'Certificado F30-1',
        'Planilla Cotizaciones Previsionales'
      ]
    },
    'ALIANZA INMOBILIARIO': {
      modalidad: 'Envío directo',
      documentos: [
        'Nómina de Personal',
        'Certificado F30',
        'Certificado F30-1', 
        'Liquidación y Transferencias',
        'Certificado Cotizaciones'
      ]
    },
    'IMEL': {
      modalidad: 'Envío directo',
      documentos: [
        'Certificado F30',
        'Certificado F30-1',
        'Planilla Cotizaciones Previsionales',
        'Liquidaciones',
        'Transferencias'
      ]
    },
    'FULL LOGISTIC': {
      modalidad: 'Envío directo',
      documentos: [
        'Certificado F30',
        'Certificado F30-1'
      ]
    },
    'JOSÉ MORENO': {
      modalidad: 'Envío directo',
      documentos: [
        'Certificado F30',
        'Certificado F30-1'
      ]
    },
    'CAROZZI': {
      modalidad: 'Envío directo',
      documentos: [
        'Certificado de Adhesión a Seguro de Accidentes (vigente)',
        'Detalle de Pago de Cotizaciones Previsionales de PreviRed (últimos 3 meses)',
        'Certificado de la Inspección del Trabajo sobre cumplimiento de obligaciones laborales y previsionales',
        'Reglamento interno de la empresa',
        'Escritura de la empresa y modificaciones',
        'Pago del IVA',
        'Balance',
        'Estado de resultado',
        'Contrato de Trabajo vigente y sus anexos',
        'Nómina de trabajadores para validarlos',
        'Fotocopia de cédula de Identidad vigente por ambos lados',
        'Certificado de antecedentes',
        'Certificado curso OS10',
        'Documentación preventiva (recepción EPP, Reglamento interno y Charla de Derecho a Saber)',
        'Inducción contratistas martes y jueves online (Obligatoria)'
      ]
    },
    'CIMOLAI': {
      modalidad: 'Envío directo',
      documentos: [
        'Listado de trabajadores periodo mensual',
        'Liquidaciones de Sueldo mensual',
        'Certificado Cumplimientos Laborales F30-1 y Planilla Cotizaciones Previsionales mensual',
        'Certificado Antecedentes laborales emitido por la Inspección del Trabajo mensual',
        'Finiquito mensual',
        'Certificado Siniestralidad mensual 2025',
        'Planilla Cotizaciones Mutualidad mensual 2025',
        'Certificado aclaración no aplica comité paritario mensual',
        'Certificado cotizaciones al día ACHS mensual',
        'Certificado Afiliación Mutualidad'
      ]
    },
    'CBB - INACAL Y READY MIX PARGUA': {
      modalidad: 'Plataforma Prevsis',
      documentos: [
        'Cédula de Identidad',
        'Contrato de Trabajo',
        'Examen Ocupacional Ruido',
        'Examen Ocupacional Sílice',
        'Examen Alcohol y drogas',
        'Obligación de Informar Riesgos -ODI (Derecho a Saber)',
        'Curso de Herramientas SSO (BCN)',
        'Curso Alcohol y Drogas (BCN)',
        'Inducción Planta',
        'Anexo de vinculación obra - faena',
        'Registro Entrega Elementos Protección Personal (EPP)',
        'Recepción Reglamento Interno de Orden, Higiene y Seguridad (RIOHS)',
        'Difusión procedimiento trabajo seguro',
        'Anexo de traslado mandante o Finiquito del trabajador',
        'Calendario Negociaciones Colectivas',
        'Certificado de tasas o siniestralidad',
        'Plan de Seguridad y Salud Ocupacional (SSO)',
        'Procedimiento de trabajo seguro de tarea a realizar',
        'Recepción Reglamento especial de empresas contratistas y subcontratistas (REECS)',
        'Recepción y adherencia a plan de emergencia CBB',
        'Reglamento Interno de Orden, Higiene y Seguridad (RIOHS) y formalidades',
        'Certificado F30',
        'Certificado F30-1',
        'Nómina de personal',
        'Liquidaciones de Sueldo firmada o Comprobante pago remuneraciones'
      ]
    },
    'TODO MELON': {
      modalidad: 'Plataforma Prevsis + InfoControl',
      documentos: [
        'Cédula de Identidad',
        'Certificado Cotizaciones Previsionales',
        'Contrato y Anexos de Trabajo empleado',
        'Recibo de sueldo o transferencia'
      ]
    },
    'NOVASOURCE': {
      modalidad: 'Plataforma Seyse',
      documentos: [
        'Certificado de Antecedentes Laborales y Previsionales (F-30)',
        'Certificado de Cumplimiento de las Obligaciones Laborales y Previsionales (F30-1)',
        'Certificado de Pago de Cotizaciones Previsionales (PREVIRED)',
        'Certificado de Siniestralidad y Listado de Accidentados (Indicadores Estadísticos)',
        'Comprobante de Pago de Remuneraciones',
        'Nómina de Reporte Mensual de la Empresa'
      ]
    },
    'WALMART': {
      modalidad: 'Plataforma SubcontrataLey',
      documentos: [
        'Criterios de revisión de la matriz documental (archivo CSV)',
        'Programa de Trabajo Preventivo (SGSST)',
        'Registro Difusión Trabajador Reglamento Interno',
        'Toma de Conoc. de Trab. Información de Riesgos Laborales',
        'Toma Conoc. Trab. Matriz IPER del Contratista',
        'Toma Conoc. Trab. Programa de Trabajo Preventivo',
        'Capacitación Uso y Mantención de EPP',
        'Capacitación de Prevención de Riesgos',
        'Información de riesgos laborales',
        'Evaluación de Desempeño del Programa (SGSST)',
        'Mejora Continua (SGSST)'
      ]
    },
    'AGROSUPER': {
      modalidad: 'Plataforma KSEC',
      documentos: [
        'Certificado F30',
        'Certificado F30-1',
        'Contrato de trabajo',
        'Anexos',
        'Finiquitos'
      ]
    },
    'EBCO': {
      modalidad: 'Plataforma Ebco Conecta',
      documentos: [
        'Liquidaciones',
        'Libro de asistencia',
        'Contrato de trabajo',
        'Charlas de prevención mensuales',
        'F-30',
        'F30-1',
        'Libro de remuneraciones',
        'Cotizaciones',
        'Certificados de la ACHS',
        'Anexos',
        'Finiquitos'
      ]
    }
  };

  // Inicializar estado de documentos aleatorio para demostración
  useEffect(() => {
    const estadoInicial = {};
    Object.entries(clientes).forEach(([cliente, data]) => {
      estadoInicial[cliente] = {};
      data.documentos.forEach((doc, index) => {
        // Simular progreso aleatorio pero consistente
        estadoInicial[cliente][doc] = Math.random() > 0.3;
      });
    });
    setEstadoDocumentos(estadoInicial);
  }, []);

  const calcularPorcentaje = (cliente) => {
    const docs = clientes[cliente].documentos;
    const completados = docs.filter(doc => estadoDocumentos[cliente]?.[doc]).length;
    return Math.round((completados / docs.length) * 100);
  };

  const getColorPorcentaje = (porcentaje) => {
    if (porcentaje >= 80) return 'text-green-600 bg-green-100';
    if (porcentaje >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const toggleDocumento = (cliente, documento) => {
    setEstadoDocumentos(prev => ({
      ...prev,
      [cliente]: {
        ...prev[cliente],
        [documento]: !prev[cliente]?.[documento]
      }
    }));
  };

  const clientesConPorcentaje = Object.keys(clientes).map(cliente => ({
    nombre: cliente,
    ...clientes[cliente],
    porcentaje: calcularPorcentaje(cliente)
  }));

  const promedioGeneral = Math.round(
    clientesConPorcentaje.reduce((sum, c) => sum + c.porcentaje, 0) / clientesConPorcentaje.length
  );

  const clientesCriticos = clientesConPorcentaje.filter(c => c.porcentaje < 50).length;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="text-blue-600" />
            Dashboard de Cumplimiento de Contratos
          </h2>
          <button
            onClick={onCerrarSesion}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Volver al Inicio
          </button>
        </div>

        {/* Resumen general */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900">Total Clientes</h3>
            <p className="text-3xl font-bold text-blue-600">{clientesConPorcentaje.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900">Cumplimiento Promedio</h3>
            <p className="text-3xl font-bold text-green-600">{promedioGeneral}%</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900">Clientes Críticos</h3>
            <p className="text-3xl font-bold text-yellow-600">{clientesCriticos}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900">En Proceso</h3>
            <p className="text-3xl font-bold text-purple-600">
              {clientesConPorcentaje.filter(c => c.porcentaje >= 50 && c.porcentaje < 80).length}
            </p>
          </div>
        </div>

        {/* Alerta para clientes críticos */}
        {clientesCriticos > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-600" size={20} />
              <span className="font-medium text-red-900">
                ⚠️ {clientesCriticos} cliente(s) requieren atención urgente (menos del 50% de cumplimiento)
              </span>
            </div>
          </div>
        )}

        {/* Tabla de clientes */}
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cliente</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Modalidad</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Documentos</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Cumplimiento</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientesConPorcentaje
                .sort((a, b) => a.porcentaje - b.porcentaje) // Ordenar por porcentaje ascendente
                .map((cliente) => (
                <tr key={cliente.nombre} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{cliente.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{cliente.modalidad}</td>
                  <td className="px-4 py-3 text-gray-600">{cliente.documentos.length} documentos</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${getColorPorcentaje(cliente.porcentaje)}`}>
                      {cliente.porcentaje}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setClienteSeleccionado(clienteSeleccionado === cliente.nombre ? '' : cliente.nombre)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
                    >
                      {clienteSeleccionado === cliente.nombre ? 'Ocultar' : 'Ver Detalle'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detalle del cliente seleccionado */}
        {clienteSeleccionado && (
          <div className="mt-6 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Detalle de documentos - {clienteSeleccionado}
            </h3>
            <div className="mb-4">
              <div className="flex items-center gap-4">
                <span className="
