import {failure, isError, Problems, ValidationResult} from "../../problems";
import {Schema} from "../../schema";
import {MissingItemBehaviour, UnexpectedItemBehaviour} from "../../unexpected_items";
import {BaseSchema} from "../index";

export interface Associative<K, V> {
  set(k: K, v: V): this;

  delete(k: K): boolean;

  has(k: K): boolean;

  get(k: K): any;

  keys(): Iterable<K>;
}

export function conformInPlace<K, V>(unexpectedItems: UnexpectedItemBehaviour,
                                     missingItems: MissingItemBehaviour,
                                     thing: Associative<K, V>,
                                     itemSchemas: Iterable<[K, Schema]>): Problems | undefined {

  let problems = new Problems([]);
  const unmatchedThingKeys = new Set(thing.keys());

  for (const [k, s] of itemSchemas) {
    const v: ValidationResult<any> = s.conform(thing.get(k));

    if (isError(v) && !thing.has(k)) {
      if (s[isOptional] !== true && missingItems !== MissingItemBehaviour.IGNORE) {
        problems = problems.merge(failure("No value", [k]));
      }
      continue;
    }
    unmatchedThingKeys.delete(k);

    if (isError(v)) {
      problems = problems.merge((v as Problems).prefixPath([k]));
    }
    else if (v !== undefined) {
      thing.set(k, v);
    }
  }

  for (const k of unmatchedThingKeys) {
    switch (unexpectedItems) {
      case UnexpectedItemBehaviour.IGNORE:
        break;
      case UnexpectedItemBehaviour.DELETE:
        thing.delete(k);
        break;
      case UnexpectedItemBehaviour.PROBLEM:
        problems = problems.merge(failure("Unexpected item", [k]));
        break;
      default:
        throw new Error(`Not implemented- ${unexpectedItems}`);
    }
  }

  return problems.length > 0 ? problems : undefined;
}

const isOptional = Symbol("isOptional");

export class TagSchemaAsOptional<IN, OUT> extends BaseSchema<IN, OUT | undefined> {
  [isOptional] = true;

  constructor(private readonly subschema: Schema<IN, OUT>) {
    super();
  }

  conform(value: IN): Problems | OUT | undefined {
    return value === undefined ? undefined : this.subschema.conform(value);
  }

}

export type PrimitivePattern<T> = T extends string ? Schema<any, T> | T | RegExp: Schema<any, T> | T;

export type StrictPatternItem<T> = T extends object
  ? StrictPattern<T> | Schema<any, T> | T
  : PrimitivePattern<T>

export type StrictPattern<T extends object> = { [K in keyof T]: StrictPatternItem<T[K]> };

export type PatternItem<T> = T extends object
  ? Pattern<T> | Schema<any, T> | T
  : PrimitivePattern<T>

export type Pattern<T extends object> = { [K in keyof T]?: PatternItem<T[K]> };