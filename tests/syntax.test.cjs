const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '../js');
test('todos os scripts da aplicação têm sintaxe JavaScript válida', () => {
  for (const name of fs.readdirSync(root, {recursive: true})) {
    if (name.endsWith('.js')) new vm.Script(fs.readFileSync(path.join(root, name), 'utf8'), {filename: name});
  }
});
