import {BaseSchema, failure, ValidationResult} from "./";
import {Constructor, typeDescription} from "./util/types";

export class IsInstanceSchema<T> extends BaseSchema<any, T> {
  constructor(private readonly c: Constructor<T>) {
    super();
  }

  conform(value: any): ValidationResult<T> {
    return value instanceof this.c ? value : failure(`expected ${this.c.name} but got ${typeDescription(value)}`);
  }

  /**
   * This isn't really suitable for json schema,
   * which doesn't have the concept of a type
   */
  toJSON(): any {
    return {
      type: "object",
      description: `Instance of ${this.c.name}`,
      additionalProperties: true,
    }
  }

}