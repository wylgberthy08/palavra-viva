/**
 * Gate de estilo: nenhum literal de cor hexadecimal existe fora de
 * `src/constants/theme.ts`, que é a fonte de verdade da paleta.
 *
 * Cobre `.ts`, `.tsx` e `.css` dentro de `src/`. A lista de extensões é explícita
 * para que um arquivo novo com estilo não escape do gate por extensão desconhecida.
 */
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const SRC_DIR = 'src';
const TOKEN_FILE = join('src', 'constants', 'theme.ts');
const EXTENSIONS = new Set(['.ts', '.tsx', '.css']);

/** `#fff`, `#FFF`, `#8C4A27`, `#8c4a27ff`. Não casa com id de ancoragem como `#topo`. */
const HEX_COLOR = /#[0-9A-Fa-f]{3,8}\b/g;

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (EXTENSIONS.has(extname(entry.name))) {
      yield fullPath;
    }
  }
}

async function main() {
  const findings = [];

  for await (const filePath of walk(SRC_DIR)) {
    if (filePath === TOKEN_FILE) continue;

    const contents = await readFile(filePath, 'utf8');
    const lines = contents.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const match of line.matchAll(HEX_COLOR)) {
        findings.push({
          file: relative('.', filePath).split(sep).join('/'),
          line: index + 1,
          color: match[0],
        });
      }
    });
  }

  if (findings.length > 0) {
    console.error('Literal de cor fora de src/constants/theme.ts:\n');
    for (const finding of findings) {
      console.error(`  ${finding.file}:${finding.line}  ${finding.color}`);
    }
    console.error(`\n${findings.length} ocorrencia(s). Use o token de src/constants/theme.ts.`);
    process.exitCode = 1;
    return;
  }

  console.log('check:styles OK - nenhum literal de cor fora de src/constants/theme.ts');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
