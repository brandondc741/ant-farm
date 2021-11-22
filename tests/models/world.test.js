import World from "../../src/models/world";

describe("World raw data structures", () => {
  it("creates the world with appropriate buffer size", () => {
    const world = new World(64, 64);
    expect(world.data.byteLength).toBe(16384);
  });

  it("accepts pre-generated worldData buffers", () => {
    const worldData = new ArrayBuffer(100);
    const world = new World(5, 5, worldData);
    expect(world.data.byteLength).toBe(100);
  });

  it("throws when given wrongly sized worldData Buffer", () => {
    const worldData = new ArrayBuffer(99);
    expect(() => new World(5, 5, worldData)).toThrow();
  });
});

describe("World tile methods", () => {
  let worldData = new ArrayBuffer(100);
  let u32a = new Uint32Array(worldData);
  beforeEach(() => {
    // Initialize the world grid to have each tile have the value of it's index.
    for (let i = 0; i < u32a.length; i++) {
      u32a[i] = i;
    }
  });

  it("returns the value at a given tile", () => {
    const world = new World(5, 5, worldData);
    expect(world.getTileRaw(3, 2)).toBe(13);
  });

  it("returns the value at a given tile", () => {
    const world = new World(5, 5, worldData);
    world.setTileRaw(3, 2, 420);
    expect(world.getTileRaw(3, 2)).toBe(420);
  });

  it("sets the entity type value at a given tile", () => {
    const world = new World(5, 5, worldData);
    world.setTileRaw(3, 3, 0xe009); // 1110000000001001

    world.setTileProp(3, 3, "entityType", 5); // 101
    expect(world.getTileRaw(3, 3)).toBe(0xe005); // 1110000000000101
  });

  it("gets the terrain value at a given tile", () => {
    const world = new World(5, 5, worldData);
    world.setTileRaw(4, 4, 0x20000); // 10-000000000000-0000
    expect(world.getTileProp(4, 4, "terrain")).toBe(2);
  });

  it("gets the entity type at a given tile", () => {
    const world = new World(5, 5, worldData);
    world.setTileRaw(3, 4, 0xa); // 1010
    expect(world.getTileProp(3, 4, "entityType")).toBe(10);
  });
});
