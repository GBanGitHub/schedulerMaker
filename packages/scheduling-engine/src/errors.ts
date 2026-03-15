export class SchedulingError extends Error {
  constructor(
    message: string,
    public readonly blockName?: string
  ) {
    super(message);
    this.name = "SchedulingError";
  }
}
