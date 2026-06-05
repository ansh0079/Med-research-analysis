/**
 * Validate generated OpenAPI spec using @apidevtools/swagger-parser
 */

const SwaggerParser = require('@apidevtools/swagger-parser');
const path = require('path');

const specPath = path.join(__dirname, '..', '..', 'docs', 'openapi.json');

async function validate() {
  try {
    const api = await SwaggerParser.validate(specPath);
    console.log(`✅ OpenAPI spec is valid: ${api.info.title} v${api.info.version}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ OpenAPI validation failed:', err.message);
    process.exit(1);
  }
}

validate();
