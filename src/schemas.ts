import {DelegatingSchema} from "./impl";
import {DataSchema} from "./data";
import {ObjectSchema} from "./impl/associative/obj";
import {EqualsSchema} from "./impl/eq";
import {InSchema} from "./impl/isin";
import {DiscriminatedUnionSchema} from "./impl/discriminated_union";
import {failure, Problems} from "./problems";
import {RegExpSchema} from "./impl/regexp";
import {IsURLOptions, UrlSchema} from "./impl/url";
import {buildPredicateMessageFunction, Constructor, entries, toMap, typeDescription} from "./impl/util";
import {detectDiscriminator} from "./impl/discriminated_union/find_discriminators";
import {Schema} from "./schema";
import {ArrayOfSchema} from "./impl/arrayof";
import {EnumValueSchema} from "./impl/enumvalue";
import {LookupSchema} from "./impl/lookup";
import {IsInstanceSchema} from "./impl/isinstance";
import {DeferredSchema} from "./impl/deferred";
import {TagSchemaAsOptional} from "./impl/associative/associative";
import {MapSchema} from "./impl/associative/map";
import {OverrideSchema} from "./impl/override";
import {TupleSchema} from "./impl/associative/tuple";
import {SetOfSchema} from "./impl/setof";
import {schematizeEntries} from "./schematize";
import {HasUnexpectedItemBehaviour, UnexpectedItemBehaviour} from "./unexpected_items";

export function __<IN, OUT>(s: Schema<IN, OUT>): OUT {
  return s.__();
}

export function opt<IN, OUT>(s: Schema<any, OUT>): Schema<any, OUT | undefined> {
  return new TagSchemaAsOptional(s);
}

export function isdata<T>(constructor: Constructor<T>): Schema<any, T> {
  return new DataSchema(constructor);
}

export function eq<T>(value: T): Schema<any, T> {
  return new EqualsSchema(value);
}

export function isnull(): Schema<any, null> {
  return eq(null);
}

export function isundefined(): Schema<any, undefined> {
  return eq(undefined);
}

export function isany(): Schema<any, any> {
  return schema((x)=>x);
}

export function arrayof<T>(schema: Schema<any,T>): Schema<any, T[]> {
  return new ArrayOfSchema(schema);
}

export function setof<T>(schema: Schema<any,T>): Schema<any, Set<T>> {
  return new SetOfSchema(schema);
}

export function enumvalue<T extends object>(e: T): Schema<any, T[keyof T]> {
  return new EnumValueSchema(e);
}

export function enumkey<T extends object>(e: T): Schema<any, T[keyof T]> {
  const stringKeysOnly = {};
  for (let [k, v] of entries(e)) {
    if(isNaN(Number(k)))
      stringKeysOnly[k] = v;
  }

  return lookup(stringKeysOnly);
}

export function lookup<T extends object>(e: T): Schema<any, T[keyof T]> {
  return new LookupSchema(e);
}

export function discriminated<T>(...ctors: Constructor<T>[]): Schema<any, T> {
  return discriminatedBy(detectDiscriminator(ctors), ...ctors);
}

export function discriminatedBy<T>(discriminator: keyof T,
                                   ...ctors: Constructor<T>[]): Schema<any, T> {
  return new DiscriminatedUnionSchema<T>(ctors, discriminator);
}

export function isstring(): Schema<any, string> {
  return predicate<any>(
    (x) => x instanceof String || typeof x === "string",
    (x) => `expected a string but got ${typeDescription(x)}`);
}

export function isinstance<T>(c:Constructor<T>): Schema<any, T> {
  return new IsInstanceSchema(c);
}

export function matches(r: RegExp): Schema<any, string> {
  return new RegExpSchema(r);
}

export function isboolean(): Schema<any, boolean> {
  return predicate<any>(
    (x) => x instanceof Boolean || typeof x === "boolean",
    (x) => `expected a boolean but got ${x}`);
}

export function isin<T>(...values: T[]): Schema<any, T> {
  return new InSchema<T>(values);
}

export function isurl(opts?: IsURLOptions): Schema<any, string> {
  return new UrlSchema(opts || {});
}

export function object<T extends object>(fieldSchemas: Object): Schema<any, object> & HasUnexpectedItemBehaviour {
  return new ObjectSchema(schematizeEntries(fieldSchemas), UnexpectedItemBehaviour.PROBLEM);
}

export function map<K, V>(entrySchemas: Object | Map<K, Schema<any, V>>): Schema<any, Map<K, V>> & HasUnexpectedItemBehaviour  {
  return new MapSchema<K, V>(
    entrySchemas instanceof Map
      ? entrySchemas
      : toMap(schematizeEntries(entrySchemas)),
    UnexpectedItemBehaviour.PROBLEM);
}

export function tuple<A>(a: Schema<any, A>):
  Schema<any, [A]> & HasUnexpectedItemBehaviour;

export function tuple<A, B>(a: Schema<any, A>, b: Schema<any, B>,):
  Schema<any, [A, B]> & HasUnexpectedItemBehaviour;

export function tuple<A, B, C>(a: Schema<any, A>, b: Schema<any, B>, c: Schema<any, C>):
  Schema<any, [A, B, C]> & HasUnexpectedItemBehaviour;

export function tuple<A, B, C, D>(a: Schema<any, A>, b: Schema<any, B>, c: Schema<any, C>, d: Schema<any, D>):
  Schema<any, [A, B, C, D]> & HasUnexpectedItemBehaviour;

export function tuple<A, B, C, D, E>(a: Schema<any, A>, b: Schema<any, B>, c: Schema<any, C>, d: Schema<any, D>, e: Schema<any, E>):
  Schema<any, [A, B, C, D, E]> & HasUnexpectedItemBehaviour;

export function tuple<T extends any[]>(...s: Schema[]):
  Schema<any, T> & HasUnexpectedItemBehaviour {

  return new TupleSchema(s, UnexpectedItemBehaviour.PROBLEM);
}

export function schema<IN, OUT>(conform: (value: IN) => Problems | OUT): Schema<IN, OUT> {
  return new DelegatingSchema<IN, OUT>(conform);
}


export function predicate<T>(predicate: (value: T) => boolean,
                             failureMessage?: ((value: any) => string) | string): Schema<T, T> {
  const messageFn = buildPredicateMessageFunction(failureMessage, predicate);
  return schema(
    (x) => predicate(x) === true ? x : failure(messageFn(x)))
}

export function defer<IN, OUT>(factory: () => Schema<IN, OUT>): Schema<IN, OUT> {
  return new DeferredSchema(factory);
}

export interface SchemaOverrides<IN, OUT> {
  failure?: string | ((value: IN) => Problems);
}

export function override<IN, OUT>(s: Schema<IN, OUT>, o: SchemaOverrides<IN, OUT>) {
  return new OverrideSchema(s, o);
}

