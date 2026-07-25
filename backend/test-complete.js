const http = require('http');

// Configuración
const API_HOST = 'localhost';
const API_PORT = 3001;
const FRONTEND_PORT = 3000;

console.log('\n========================================');
console.log('   PRUEBA COMPLETA - API + Frontend');
console.log('========================================\n');

const tests = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/health',
    port: API_PORT,
  },
  {
    name: 'DB Test',
    method: 'GET',
    path: '/db-test',
    port: API_PORT,
  },
  {
    name: 'Frontend Root',
    method: 'GET',
    path: '/',
    port: FRONTEND_PORT,
  },
];

let completed = 0;
const results = [];

tests.forEach((test, index) => {
  const url = `http://${API_HOST}:${test.port}${test.path}`;

  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`  ${test.method} ${url}`);

  const request = http.request(url, {method: test.method}, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const success = res.statusCode >= 200 && res.statusCode < 300;
      const icon = success ? '✅' : '⚠️ ';

      console.log(`  ${icon} Status: ${res.statusCode}`);

      if (data.length > 100) {
        console.log(`  Response: ${data.substring(0, 100)}...`);
      } else if (data) {
        console.log(`  Response: ${data}`);
      }

      results.push({
        name: test.name,
        status: success ? 'SUCCESS' : 'WARNING',
        code: res.statusCode,
      });

      console.log('');
      completed++;

      if (completed === tests.length) {
        printSummary();
      }
    });
  });

  request.on('error', (e) => {
    console.log(`  ❌ Error: ${e.message}\n`);
    results.push({name: test.name, status: 'FAILED', error: e.message});
    completed++;

    if (completed === tests.length) {
      printSummary();
    }
  });

  request.setTimeout(5000);
  request.end();
});

function printSummary() {
  console.log('========================================');
  console.log('   RESUMEN DE PRUEBAS');
  console.log('========================================\n');

  results.forEach((result) => {
    const icon = result.status === 'SUCCESS' ? '✅' : '❌';
    console.log(
      `${icon} ${result.name}: ${result.status}${result.code ? ` (${result.code})` : result.error ? ` (${result.error})` : ''}`,
    );
  });

  const allSuccess = results.every((r) => r.status === 'SUCCESS');

  console.log('\n========================================');

  if (allSuccess) {
    console.log('🎉 ¡Todas las conexiones funcionan correctamente!');
    console.log('   Base de datos ✅');
    console.log('   API Backend  ✅');
    console.log('   Frontend     ✅');
  } else {
    console.log('⚠️  Algunos servicios necesitan atención');
  }

  console.log('========================================\n');
}
