const fs = require('fs');

// Read the file
const filePath = './server/routes.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Define the pattern and replacement using a regular expression
const pattern = /\s*broadcastNewOrder\(order\);\s*\}\s*else\s*{/g;
const replacement = '\n      broadcastNewOrder(order);\n      } else {';

// Apply the replacement
const fixedContent = content.replace(pattern, replacement);

// Write the fixed content back to the file
fs.writeFileSync(filePath, fixedContent, 'utf8');

console.log('File updated successfully');
