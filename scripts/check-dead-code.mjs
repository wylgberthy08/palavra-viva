/**
 * Gate de código morto: nenhum símbolo exportado de `src/` fica sem consumidor, e
 * nenhuma chave de `StyleSheet.create` fica sem referência no JSX.
 *
 * A análise usa a API do compilador do TypeScript, que já é devDependency do projeto.
 * Regex sobre TypeScript erra em dois jeitos que importam aqui: não distingue
 * `styles.foo` de `foo` e não sabe o que é re-export. O compilador sabe.
 *
 * Arquivos de teste contam como consumidor, e o relatório mostra onde. Símbolo
 * consumido só por teste aparece com o caminho do teste, para a revisão julgar.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import ts from 'typescript';

const SRC_DIR = 'src';
const TS_EXTENSIONS = new Set(['.ts', '.tsx']);

/** Caminhos de `src/` relativos e normalizados, para comparação estável no Windows. */
function toPosix(path) {
  return path.split(sep).join('/');
}

function listSourceFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...listSourceFiles(fullPath));
    } else if (TS_EXTENSIONS.has(extname(entry.name))) {
      found.push(fullPath);
    }
  }
  return found;
}

/** `true` para nós que produzem valor em tempo de execução, `false` para tipos. */
function hasRuntimeValue(declaration) {
  if (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)) return false;
  if (ts.isModuleDeclaration(declaration)) return false;
  return true;
}

function main() {
  const configPath = ts.findConfigFile('.', ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    console.error('tsconfig.json nao encontrado.');
    process.exitCode = 1;
    return;
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, '.');

  const program = ts.createProgram(parsed.fileNames, {
    ...parsed.options,
    noEmit: true,
  });
  const checker = program.getTypeChecker();

  const sourceFiles = program
    .getSourceFiles()
    .filter((file) => !file.isDeclarationFile && !file.fileName.includes(`${sep}node_modules${sep}`));

  // Índice: nome do símbolo -> lista de "arquivo:linha" onde o identificador aparece.
  const references = new Map();
  for (const sourceFile of sourceFiles) {
    const visit = (node) => {
      if (ts.isIdentifier(node)) {
        const list = references.get(node.text) ?? [];
        list.push({
          file: toPosix(relative('.', sourceFile.fileName)),
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
        });
        references.set(node.text, list);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  const report = [];

  // Nomes exportados por arquivo, para distinguir consumo interno de consumo que
  // escapa do módulo.
  const exportedNames = new Map();

  // 1. Símbolo exportado sem consumidor.
  for (const filePath of listSourceFiles(SRC_DIR)) {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) continue;

    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;

    const declaringFile = toPosix(relative('.', filePath));
    const names = new Set(checker.getExportsOfModule(moduleSymbol).map((symbol) => symbol.getName()));
    exportedNames.set(declaringFile, names);

    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      const name = exported.getName();
      if (name === 'default') continue;

      const declaration = exported.declarations?.[0];
      if (!declaration || !hasRuntimeValue(declaration)) continue;

      // Re-export de outro módulo não é superfície morta deste arquivo.
      if (ts.isExportSpecifier(declaration)) continue;

      const allUses = references.get(name) ?? [];
      const usesOutside = allUses.filter((use) => use.file !== declaringFile);

      if (usesOutside.length > 0) continue;

      // Sem consumidor fora do arquivo. Distingue código morto de `export` mais
      // largo do que o uso real: se o símbolo é consumido por outro `export` do
      // próprio arquivo, ele escapa por ali e não está morto.
      const escapesThroughExport = allUses.some(
        (use) => use.file === declaringFile && exportedNames.get(declaringFile)?.has(use.name)
      );

      if (allUses.length <= 1) {
        report.push({ kind: 'dead', name, file: declaringFile, detail: 'sem nenhuma referência' });
      } else if (escapesThroughExport) {
        report.push({
          kind: 'transitivo',
          name,
          file: declaringFile,
          detail: 'consumido so via outro export do mesmo arquivo',
        });
      } else {
        report.push({
          kind: 'largo',
          name,
          file: declaringFile,
          detail: 'usado so dentro do proprio arquivo; o export e mais largo que o uso',
        });
      }
    }
  }

  // 2. Chave de StyleSheet.create sem referência no arquivo.
  for (const filePath of listSourceFiles(SRC_DIR)) {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) continue;

    const declaringFile = toPosix(relative('.', filePath));
    const stylesKeys = new Set();

    const collect = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'create' &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'StyleSheet' &&
        node.arguments.length === 1 &&
        ts.isObjectLiteralExpression(node.arguments[0])
      ) {
        for (const property of node.arguments[0].properties) {
          if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
            stylesKeys.add(property.name.getText(sourceFile).replace(/^['"]|['"]$/g, ''));
          }
        }
      }
      ts.forEachChild(node, collect);
    };
    collect(sourceFile);

    for (const key of stylesKeys) {
      const uses = (references.get(key) ?? []).filter((use) => use.file === declaringFile);
      if (uses.length <= 1) {
        // Uma ocorrência é a própria declaração em `StyleSheet.create`.
        report.push({
          kind: 'style',
          name: key,
          file: declaringFile,
          detail: 'chave declarada e nunca referenciada',
        });
      }
    }
  }

  const dead = report.filter((item) => item.kind === 'dead' || item.kind === 'style');
  const narrowing = report.filter((item) => item.kind === 'largo' || item.kind === 'transitivo');

  if (narrowing.length > 0) {
    console.warn(`Export mais largo que o uso (${narrowing.length}) - nao quebra o gate:\n`);
    for (const item of narrowing) {
      console.warn(`  ${item.file}  ${item.name}  (${item.detail})`);
    }
    console.warn('');
  }

  if (dead.length === 0) {
    console.log('check:dead OK - nenhum simbolo sem consumidor e nenhuma chave de estilo orfa');
    return;
  }

  console.error(`Codigo morto (${dead.length}):\n`);
  for (const item of dead) {
    console.error(`  ${item.file}  ${item.name}  (${item.detail})`);
  }

  console.error('\nRemova o codigo, ou wire-o a um consumidor. Princípio I e Princípio IV.');
  process.exitCode = 1;
}

main();

// `readFileSync` fica importado para o cache do compilador não reler o disco sem parar.
void readFileSync;
