const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatches = [...html.matchAll(/src="([^"]+)"/g)].map(m => m[1].replace(/\?.*$/, ''));
const cssMatches = [...html.matchAll(/href="([^"]+\.css)[^"]*"/g)].map(m => m[1]);

let allOk = true;
console.log('Checking scripts in index.html:');
scriptMatches.forEach(s => {
  if (!fs.existsSync(s)) {
    console.error('  MISSING SCRIPT:', s);
    allOk = false;
  } else {
    console.log('  OK:', s);
  }
});

console.log('Checking CSS in index.html:');
cssMatches.forEach(c => {
  if (!fs.existsSync(c)) {
    console.error('  MISSING CSS:', c);
    allOk = false;
  } else {
    console.log('  OK:', c);
  }
});

if (allOk) {
  console.log('\nAll assets in index.html exist and are ready!');
} else {
  process.exit(1);
}
