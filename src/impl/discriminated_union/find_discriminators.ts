import {EqualsSchema, Schema, schemaOf} from "../";
import {first} from "../util/iterables";
import {mapKeyValue} from "../util/maps";
import {Constructor, isPrimitive, PrimitiveValue, unsafeCast} from "../util/types";

class CandidateDiscriminators<T extends object> {
  private readonly constructors: Constructor<T>[] = [];
  private readonly fields = new Map<keyof T, Map<PrimitiveValue, Constructor<T>[]>>();

  constructor(ctors: Constructor<T>[]) {
    this.constructors = [...ctors];
    for (const ctor of this.constructors) {
      for (const [fieldName, value] of CandidateDiscriminators.fieldsWithPrimitiveEquals(ctor)) {
        const result = this.fields.get(fieldName) || new Map();
        result.set(value, (result.get(value) || []).concat([ctor]));
        this.fields.set(fieldName, result)
      }
    }
  }

  private static fieldsWithPrimitiveEquals<T extends object>(ctor: Constructor<T>): [keyof T, PrimitiveValue][] {
    return CandidateDiscriminators.fieldSchemas(ctor)
      .map(([field, schema]) => schema instanceof EqualsSchema && isPrimitive(schema.expected) ? [field, schema.expected] : undefined)
      .filter((x) => x)
      .map((x) => unsafeCast(x))
  }

  private static fieldSchemas<T extends object>(ctor: Constructor<T>): [string, Schema<any, any>][] {
    return schemaOf(ctor).fieldSchemaArray;
  }

  keys(): IterableIterator<keyof T> {
    return this.fields.keys();
  }

  get(field: keyof T): Map<PrimitiveValue, Constructor<T>[]> | undefined {
    return this.fields.get(field);
  }

  problemWithDiscriminator(field: keyof T): string | undefined {
    const values = this.fields.get(field)!;
    for (const [value, ctors] of values) {
      if (ctors.length > 1)
        return `value '${value}' is repeated in: ${ctors.map((c) => c.name).join(", ")}`;
    }
    if (values.size !== this.constructors.length)
      return 'field is not present in all classes';
  }


}

class DiscriminatorReport<T> {
  public readonly problems = new Map<keyof T, string>();
  public readonly validFields = new Map<keyof T, Map<PrimitiveValue, Constructor<T>>>();

  reject(k: keyof T, problem: string): this {
    this.problems.set(k, problem);
    return this;
  }

  accept(k: keyof T, mappings: Map<PrimitiveValue, Constructor<T>>): this {
    this.validFields.set(k, mappings);
    return this;
  }
}

export function detectDiscriminator<T extends object>(ctors: Constructor<T>[]): keyof T {
  const report = discriminatorReports(ctors);

  if (report.validFields.size > 1)
    throw new Error(`Multiple possible discriminator fields: [${Array.from(report.validFields.keys()).join(', ')}]`);

  if (report.validFields.size === 0 && report.problems.size === 0)
    throw new Error(`No discriminator fields found in: [${ctors.map((c) => c.name).join(', ')}]`);

  const k = first(report.validFields.keys());
  if (k !== undefined) {
    return k;
  }

  const listOfFieldProblems = Array.from(report.problems.entries()).map(([k, problem]) => `${k}: ${problem}`);
  throw new Error(`No discriminator field found. Considered:\r\n${listOfFieldProblems.join('\r\n')}`);
}

export function discriminatorReports<T extends object>(ctors: Constructor<T>[]): DiscriminatorReport<T> {
  const candidates = new CandidateDiscriminators<T>(ctors);
  const report = new DiscriminatorReport<T>();
  for (const k of candidates.keys()) {
    const problem = candidates.problemWithDiscriminator(k);
    if (problem !== undefined)
      report.reject(k, problem);
    else
      report.accept(k, mapKeyValue((k: PrimitiveValue, v: Constructor<T>[]) => [k, v[0]], candidates.get(k)!))
  }
  return report;
}