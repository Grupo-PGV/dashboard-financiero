#!/usr/bin/env node
/**
 * Script para verificar y corregir la estructura del proyecto
 * Ejecutar con: node check-structure.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando estructura del proyecto...\n');

// Definir la estructura esperada
const expectedStructure = {
  'src/components/': [
    'AccountsReceivableTable.jsx',
    'BankBalanceCard.jsx', 
    'CashFlowChart.jsx',
    'ChipaxDataUpdater.jsx',
    'PendingInvoicesComponent.jsx',
    'FinancialAlerts.jsx',
    'FinancialKPIDashboard.jsx'
  ],
  'src/pages/': [
    'DashboardFinancieroIntegrado.jsx'
  ],
  'src/services/': [
    'chipaxService.js',
    'chipaxAdapter.js',
    'excelExportService.js'
  ],
  'src/': [
    'App.js',
    'App.css',
    'index.js',
    'index.css'
  ]
};

// Función para verificar si un archivo existe
function checkFile(filePath) {
  return fs.existsSync(filePath);
}

// Función para verificar la estructura
function verifyStructure() {
  let hasErrors = false;
  
  console.log('📂 Verificando estructura de carpetas...\n');
  
  for (const [directory, files] of Object.entries(expectedStructure)) {
    console.log(`📁 ${directory}`);
    
    // Verificar si la carpeta existe
    if (!fs.existsSync(directory)) {
      console.log(`   ❌ Carpeta no existe: ${directory}`);
      hasErrors = true;
      continue;
    }
    
    // Verificar cada archivo
    for (const file of files) {
      const fullPath = path.join(directory, file);
      if (checkFile(fullPath)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} - NO ENCONTRADO`);
        hasErrors = true;
      }
    }
    console.log('');
  }
  
  return !hasErrors;
}

// Función para verificar importaciones en un archivo
function checkImports(filePath, expectedImports) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let hasErrors = false;
    
    console.log(`🔍 Verificando imports en ${filePath}:`);
    
    for (const importPath of expectedImports) {
      if (content.includes(importPath)) {
        console.log(`   ✅ ${importPath}`);
      } else {
        console.log(`   ❌ ${importPath} - NO ENCONTRADO`);
        hasErrors = true;
      }
    }
    
    return !hasErrors;
  } catch (error) {
    console.log(`   ❌ Error leyendo archivo: ${error.message}`);
    return false;
  }
}

// Función para verificar exportaciones
function checkExports(filePath) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar export default
    if (content.includes('export default')) {
      console.log(`   ✅ Tiene export default`);
      return true;
    } else {
      console.log(`   ❌ NO tiene export default`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error leyendo archivo: ${error.message}`);
    return false;
  }
}

// Función principal de verificación
function runChecks() {
  console.log('🚀 Iniciando verificación completa...\n');
  
  // 1. Verificar estructura de carpetas
  const structureOk = verifyStructure();
  
  // 2. Verificar importaciones críticas
  console.log('📦 Verificando importaciones críticas...\n');
  
  const dashboardImports = [
    "import ChipaxDataUpdater from '../components/ChipaxDataUpdater'",
    "import BankBalanceCard from '../components/BankBalanceCard'",
    "import CashFlowChart from '../components/CashFlowChart'",
    "import AccountsReceivableTable from '../components/AccountsReceivableTable'",
    "import PendingInvoicesComponent from '../components/PendingInvoicesComponent'"
  ];
  
  const importsOk = checkImports('src/pages/DashboardFinancieroIntegrado.jsx', dashboardImports);
  
  // 3. Verificar exportaciones
  console.log('\n📤 Verificando exportaciones...\n');
  
  const componentsToCheck = [
    'src/components/AccountsReceivableTable.jsx',
    'src/components/BankBalanceCard.jsx',
    'src/components/CashFlowChart.jsx',
    'src/components/ChipaxDataUpdater.jsx',
    'src/pages/DashboardFinancieroIntegrado.jsx'
  ];
  
  let exportsOk = true;
  for (const component of componentsToCheck) {
    console.log(`📄 ${component}:`);
    if (!checkExports(component)) {
      exportsOk = false;
    }
    console.log('');
  }
  
  // 4. Verificar App.js
  console.log('🎯 Verificando App.js...\n');
  const appImports = ["import DashboardFinancieroIntegrado from './pages/DashboardFinancieroIntegrado'"];
  const appOk = checkImports('src/App.js', appImports);
  
  // 5. Resumen final
  console.log('\n📊 RESUMEN DE VERIFICACIÓN');
  console.log('================================');
  console.log(`Estructura de carpetas: ${structureOk ? '✅' : '❌'}`);
  console.log(`Importaciones críticas: ${importsOk ? '✅' : '❌'}`);
  console.log(`Exportaciones: ${exportsOk ? '✅' : '❌'}`);
  console.log(`App.js: ${appOk ? '✅' : '❌'}\n`);
  
  if (structureOk && importsOk && exportsOk && appOk) {
    console.log('🎉 ¡Todo está correcto! El proyecto debería compilar sin errores.');
  } else {
    console.log('⚠️ Se encontraron problemas que deben corregirse antes del deploy.');
    console.log('\n🔧 PASOS PARA CORREGIR:');
    
    if (!structureOk) {
      console.log('1. Reorganizar los archivos según la estructura esperada');
    }
    
    if (!importsOk) {
      console.log('2. Corregir las rutas de importación en DashboardFinancieroIntegrado.jsx');
    }
    
    if (!exportsOk) {
      console.log('3. Agregar "export default" a los componentes que no lo tienen');
    }
    
    if (!appOk) {
      console.log('4. Corregir la importación en App.js');
    }
  }
  
  return structureOk && importsOk && exportsOk && appOk;
}

// Función para crear package.json actualizado
function createPackageJson() {
  const packageTemplate = {
    "name": "dashboard-financiero",
    "version": "0.1.0",
    "private": true,
    "dependencies": {
      "@testing-library/jest-dom": "^5.16.4",
      "@testing-library/react": "^13.3.0",
      "@testing-library/user-event": "^13.5.0",
      "lucide-react": "^0.263.1",
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-scripts": "5.0.1",
      "recharts": "^2.7.2",
      "web-vitals": "^2.1.4"
    },
    "scripts": {
      "start": "react-scripts start",
      "build": "react-scripts build",
      "test": "react-scripts test",
      "eject": "react-scripts eject",
      "check-structure": "node check-structure.js"
    },
    "eslintConfig": {
      "extends": [
        "react-app",
        "react-app/jest"
      ]
    },
    "browserslist": {
      "production": [
        ">0.2%",
        "not dead",
        "not op_mini all"
      ],
      "development": [
        "last 1 chrome version",
        "last 1 firefox version",
        "last 1 safari version"
      ]
    }
  };
  
  try {
    fs.writeFileSync('package.json', JSON.stringify(packageTemplate, null, 2));
    console.log('✅ package.json actualizado');
    return true;
  } catch (error) {
    console.log('❌ Error actualizando package.json:', error.message);
    return false;
  }
}

// Función para crear netlify.toml
function createNetlifyConfig() {
  const netlifyConfig = `[build]
  publish = "build"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "https://api.chipax.com/v2/:splat"
  status = 200
  force = true
  headers = {X-From = "Netlify"}

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.chipax.com;"
`;

  try {
    fs.writeFileSync('netlify.toml', netlifyConfig);
    console.log('✅ netlify.toml creado');
    return true;
  } catch (error) {
    console.log('❌ Error creando netlify.toml:', error.message);
    return false;
  }
}

// Ejecutar el script
if (require.main === module) {
  const isOk = runChecks();
  
  if (process.argv.includes('--fix')) {
    console.log('\n🔧 Modo de reparación activado...\n');
    createPackageJson();
    createNetlifyConfig();
  }
  
  process.exit(isOk ? 0 : 1);
}

module.exports = { runChecks, verifyStructure };
