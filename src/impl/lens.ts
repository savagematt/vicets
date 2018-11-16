import {BaseSchema} from "./index";
import {Schema} from "../schema";
import {SelectSchema} from "./select";
import {failure, Problems, ValidationResult} from "../problems";

export function setAtPath<T>(obj: T, path: string[], value: any): T {
  if (path.length === 1) {
    obj[path[0]] = value;
    return obj;
  }

  const key = path[0];
  setAtPath(obj[key], path.slice(1), value);
  return obj;
}

export class LensSchema<T, U> extends BaseSchema<any, T> {
  private readonly subschema: Schema<any, U>;

  constructor(private readonly path: string[], subschema: Schema<any, U>, behaviour: LensBehaviour) {
    super();
    this.subschema = new SelectSchema(path, subschema)
  }

  conform(value: any): ValidationResult<T> {
    if (typeof value !== 'object')
      return failure("expected an object");

    const conformed = this.subschema.conform(value);
    if (conformed instanceof Problems)
      return conformed;

    return setAtPath(value, this.path, conformed);
  }
}

export enum LensBehaviour {
  MODIFY_IN_PLACE = 'modify-in-place'
  // Deep clone is not implemented.
  // Just a marker enum to flag the behaviour
}