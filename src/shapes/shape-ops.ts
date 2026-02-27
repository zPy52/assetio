import { BaseShape } from '@/shapes/base';
import { Vector } from '@/shapes/vector';

export type ShapeBooleanOperation = 'subtract' | 'union' | 'intersect' | 'exclude';

export type ShapeBooleanMetadata = {
  operation: ShapeBooleanOperation;
  operands: [BaseShape, BaseShape];
};

type VectorWithBooleanMetadata = Vector & {
  booleanMetadata?: ShapeBooleanMetadata;
};

export class ShapeOps {
  public static subtract(left: BaseShape, right: BaseShape): Vector {
    return this.createBooleanVector('subtract', left, right);
  }

  public static union(left: BaseShape, right: BaseShape): Vector {
    return this.createBooleanVector('union', left, right);
  }

  public static intersect(left: BaseShape, right: BaseShape): Vector {
    return this.createBooleanVector('intersect', left, right);
  }

  public static exclude(left: BaseShape, right: BaseShape): Vector {
    return this.createBooleanVector('exclude', left, right);
  }

  private static createBooleanVector(
    operation: ShapeBooleanOperation,
    left: BaseShape,
    right: BaseShape,
  ): Vector {
    const vector = new Vector({ d: 'M 0 0 Z', closed: true }) as VectorWithBooleanMetadata;
    vector.booleanMetadata = { operation, operands: [left, right] };
    return vector;
  }
}
