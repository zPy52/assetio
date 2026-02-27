export type Anchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type RelativeValue = `${number}%`;

export type PlacementValue = number | RelativeValue;

export type Source = string | URL | ArrayBuffer | Uint8Array | Buffer;
