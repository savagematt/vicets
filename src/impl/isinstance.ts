import {BaseSchema} from "./index";
import {failure, Problems} from "../problems";
import {Constructor, typeDescription} from "./util";

export class IsInstanceSchema<T> extends BaseSchema<any, T> {
  constructor(private readonly c:Constructor<T>){
    super();
  }
  conform(value: any): Problems | T {
    return value instanceof this.c ? value : failure(`expected ${this.c.name} but got ${typeDescription(value)}`);
  }

}