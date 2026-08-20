import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');

// Keep track of old to new file mappings
const fileMappings = new Map();
const allFiles = [];

// Recursive function to get all JS files
function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.name.endsWith('.js')) {
      allFiles.push(fullPath);
    }
  }
}

scanDir(srcDir);

// Define where each file type should go
function getNewLocation(filePath) {
  const fileName = path.basename(filePath);
  if (fileName === 'index.js') return path.join(srcDir, 'server.js');
  
  if (fileName.includes('.controller.')) return path.join(srcDir, 'controllers', fileName);
  if (fileName.includes('.routes.')) return path.join(srcDir, 'routes', fileName);
  if (fileName.includes('.service.') || fileName.includes('.repository.')) return path.join(srcDir, 'services', fileName);
  if (fileName.includes('.middleware.')) return path.join(srcDir, 'middlewares', fileName);
  
  // If it's already in utils or config, keep it in top level utils/config
  if (filePath.includes(path.join(srcDir, 'utils'))) return path.join(srcDir, 'utils', fileName);
  if (filePath.includes(path.join(srcDir, 'config'))) return path.join(srcDir, 'config', fileName);
  
  // Also catch generic utils in modules
  if (filePath.includes('util')) return path.join(srcDir, 'utils', fileName);

  return null;
}

// Compute mappings
for (const oldPath of allFiles) {
  const newPath = getNewLocation(oldPath);
  if (newPath) {
    fileMappings.set(oldPath, newPath);
  }
}

// Move files and update contents
for (const [oldPath, newPath] of fileMappings) {
  const newDir = path.dirname(newPath);
  if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true });

  let content = fs.readFileSync(oldPath, 'utf8');

  // Replace imports using regex
  const importRegex = /(?:import\s+.*?from\s+|import\s+)['"]([^'"]+)['"]/g;
  content = content.replace(importRegex, (match, importPath) => {
    // If it's a node module, leave it
    if (!importPath.startsWith('.')) return match;

    // Resolve the absolute path of the imported file
    let targetOldPath = path.resolve(path.dirname(oldPath), importPath);
    
    // Sometimes imports lack .js extension, let's assume .js if not present
    if (!targetOldPath.endsWith('.js') && !fs.existsSync(targetOldPath) && fs.existsSync(targetOldPath + '.js')) {
      targetOldPath += '.js';
    } else if (!targetOldPath.endsWith('.js')) {
      // It might have the .js extension already
    }

    const targetNewPath = fileMappings.get(targetOldPath);
    
    if (targetNewPath) {
      let relativePath = path.relative(path.dirname(newPath), targetNewPath).replace(/\\/g, '/');
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      return match.replace(importPath, relativePath);
    }

    return match;
  });

  fs.writeFileSync(newPath, content);
}

// Clean up old directories (only modules, v2)
const dirsToRemove = ['modules', 'v2'];
for (const dir of dirsToRemove) {
  const p = path.join(srcDir, dir);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
  }
}

// If index.js was moved to server.js, remove old index.js
if (fs.existsSync(path.join(srcDir, 'index.js'))) {
  fs.rmSync(path.join(srcDir, 'index.js'));
}

console.log('Migration complete.');
