// Simple test to manually scan for technical debt
const fs = require('fs');
const path = require('path');

function scanForTechDebt(directory) {
  const results = [];
  
  function scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const issues = [];
      
      // Check for TODO/FIXME/HACK/XXX comments
      lines.forEach((line, index) => {
        if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(line)) {
          issues.push({
            type: 'comment',
            pattern: line.match(/\b(TODO|FIXME|HACK|XXX)\b/i)[0],
            line: index + 1,
            content: line.trim()
          });
        }
        
        // Check for 'any' type usage
        if (/:\s*any\b/.test(line)) {
          issues.push({
            type: 'any_type',
            line: index + 1,
            content: line.trim()
          });
        }
        
        // Check for console.log
        if (/console\.log/.test(line)) {
          issues.push({
            type: 'console_log',
            line: index + 1,
            content: line.trim()
          });
        }
        
        // Check for 'var' instead of 'let'/'const'
        if (/\bvar\s+/.test(line)) {
          issues.push({
            type: 'var_usage',
            line: index + 1,
            content: line.trim()
          });
        }
      });
      
      // Check file size
      if (content.length > 2000) {
        issues.push({
          type: 'large_file',
          metric: 'characters',
          value: content.length
        });
      }
      
      if (lines.length > 100) {
        issues.push({
          type: 'large_file',
          metric: 'lines',
          value: lines.length
        });
      }
      
      if (issues.length > 0) {
        results.push({
          file: path.relative(directory, filePath),
          issues: issues
        });
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
    }
  }
  
  function scanDirectory(dir) {
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip common directories that shouldn't be scanned
          if (!['node_modules', '.git', 'build', 'dist', '.vscode'].includes(entry)) {
            scanDirectory(fullPath);
          }
        } else if (stat.isFile()) {
          // Only scan source code files
          const ext = path.extname(entry).toLowerCase();
          if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs'].includes(ext)) {
            scanFile(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }
  }
  
  scanDirectory(directory);
  return results;
}

// Test the function
const results = scanForTechDebt(__dirname);
console.log('Technical Debt Analysis Results:');
console.log(JSON.stringify(results, null, 2));
