export type PointerIdentity = {
  id: number;
  wasTouch: boolean;
};

export function isSecondaryTouch(pointer: PointerIdentity): boolean {
  return pointer.wasTouch && pointer.id > 1;
}
