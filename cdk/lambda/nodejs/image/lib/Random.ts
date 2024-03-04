export class RandomWithSeed {
  private seed: number

  constructor (seed: number) {
    this.seed = seed
  }

  random (): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed
  }
}
