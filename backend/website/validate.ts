import Ajv2020, { ErrorObject } from "ajv/dist/2020"
import { config } from "./config";
import { basename, join } from "path";
import fs from 'fs';
import log from 'loglevel';

const ajv = new Ajv2020();

/**
 * Loads all schemas from file system.
 */
export function loadSchemas() {
  const dir = join(__dirname, config.debug ? "../../../" : "./", 'schema');
  fs.readdirSync(dir).forEach((file) => {
    const source = join(dir, file);
    const stat = fs.statSync(source);
    if (stat && stat.isFile() && file.endsWith('.json')) {
      log.info('Loading schema %s from %s', file, source);
      try {
        const content = fs.readFileSync(source, 'utf8');
        ajv.addSchema(JSON.parse(content), file);
      } catch(e){
        log.error('Error loading schema %s from %s. ', file, source, e);
      }
    }
  });
}

/**
 * Check json object for errors against its schema
 *
 * @param schemaKey Schema file name
 * @param object The object to validate
 * @returns false or list of errors
 */
export function checkWithSchema(schemaKey: string, object: any): ErrorObject[] | false {
  // Fix key
  if (!schemaKey.endsWith(".json")) {
    schemaKey = schemaKey + ".json"
  }

  if (!ajv.validate(schemaKey, object)) {
    return ajv.errors ?? [];
  }
  return false;
}

export default checkWithSchema;
