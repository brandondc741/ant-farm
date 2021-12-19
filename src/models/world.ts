import Entity from "./entity";
import Quadtree, { Rectangle } from "./quadtree";

type Tile = number;
type Layer = { entities: Set<Entity>; qtree: Quadtree };
const quadtreeCapacity = 4;
const DEFAULT_LAYER_ID = "DEFAULT";

export default class World {
  readonly width: number;
  readonly height: number;
  readonly data: ArrayBuffer;
  readonly grid: Uint32Array;
  readonly entities: Entity[];
  // readonly terrainData: Uint8Array;
  public entityLayers: Map<string, Layer>;

  constructor(
    width: number,
    height: number,
    entities?: Entity[],
    worldData?: ArrayBuffer
  ) {
    this.width = width;
    this.height = height;
    this.entities = entities || [];
    this.entityLayers = new Map<string, Layer>();

    // The expected number of bytes in the generated wordData buffer
    const byteLength = width * height * 4;

    // Initialize the worldData
    if (worldData) {
      if (worldData.byteLength !== byteLength) {
        throw new Error(
          "Provided buffer is not the right size. Provide a buffer of size"
        );
      }
      this.data = worldData;
    } else {
      this.data = new ArrayBuffer(byteLength);
    }

    // Create the Uint32Array to access the data buffer
    this.grid = new Uint32Array(this.data);
  }

  /**
   * Insert an entity into the world layer system.
   * If no layerId is provided, the entity will be placed in the default layer.
   * If the given layerId does not match any existing layer, a new layer will be created.
   *
   * @param entity - Entity to be inserted into a layer
   * @param layerId - [optional] ID of layer to insert
   */
  insert(entity: Entity, layerId = DEFAULT_LAYER_ID) {
    let layer = this.entityLayers.get(layerId);
    if (!layer) {
      // If no existing layer is found, initialize a new layer
      const entities: Set<Entity> = new Set<Entity>();
      const qtree = new Quadtree(
        new Rectangle(
          this.width / 2,
          this.height / 2,
          this.width / 2,
          this.height / 2
        ),
        quadtreeCapacity
      );

      layer = { entities, qtree };
      this.entityLayers.set(layerId, layer);
    }

    layer.entities.add(entity);
    layer.qtree.insert(entity);
    this.entities.push(entity);
  }

  remove(entity: Entity, layerId = DEFAULT_LAYER_ID): Entity | null {
    // Remove the entry from the full entity list
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities.splice(index, 1);
    }

    // Remove the entry from the qtree layers
    const layer = this.entityLayers.get(layerId);
    if (!layer) return null;

    layer.qtree.remove(entity);
    layer.entities.delete(entity);
    return entity;
  }

  update() {
    for (const layer of this.entityLayers.values()) {
      layer.qtree.clear();
      for (const entity of layer.entities) {
        layer.qtree.insert(entity);
      }
    }
  }

  /**
   *  Each layer contains a set of all entities in that layer, and a
   *  quadtree spacial map for quick querying.
   * @param range
   * @param layerId
   */
  query(range: Rectangle, layerId = DEFAULT_LAYER_ID) {
    if (layerId === "ALL") {
      const found: Entity[] = [];
      for (const layer of this.entityLayers.values()) {
        found.push(...layer.qtree.query(range));
      }
      return found;
    }

    const layer = this.entityLayers.get(layerId);
    return layer?.qtree.query(range) || [];
  }

  nearby(entity: Entity, radius: number, layerId = DEFAULT_LAYER_ID): Entity[] {
    return this.query(
      new Rectangle(entity.pos.x, entity.pos.y, radius, radius),
      layerId
    );
  }

  getTileRaw(x: number, y: number): Tile {
    return this.grid[y * this.width + x];
  }

  getTileProp(x: number, y: number, property: keyof typeof World.bitScheme) {
    return World.getBitValue(this.getTileRaw(x, y), property);
  }

  getTile(x: number, y: number) {
    const tile = this.getTileRaw(x, y);
    const { bitScheme } = World;
    return [
      (tile & bitScheme.entityType.mask) >>> bitScheme.entityType.offset, //entityType
      (tile & bitScheme.entityId.mask) >>> bitScheme.entityId.offset, //entityId
      (tile & bitScheme.terrain.mask) >>> bitScheme.terrain.offset, //terrain
      (tile & bitScheme.homeTrail.mask) >>> bitScheme.homeTrail.offset, //homeTrail
      (tile & bitScheme.foodTrail.mask) >>> bitScheme.foodTrail.offset, //foodTrail
    ];
  }

  setTileProp(
    x: number,
    y: number,
    property: keyof typeof World.bitScheme,
    value: number
  ) {
    const tile = this.getTileRaw(x, y);
    this.setTileRaw(x, y, World.setBitValue(tile, property, value));
  }

  setTileRaw(x: number, y: number, value: number) {
    this.grid[y * this.width + x] = value;
  }

  /**
   * Uses the bitScheme to parse out the given property from the 32 bit data chunk
   */
  static getBitValue(tile: Tile, property: keyof typeof World.bitScheme) {
    const { offset, mask } = World.bitScheme[property];
    // (Left side of >>>) bitwise & to mask out all irrelevant bits
    // (>>> and operand) shift bits by the offset to isolate value
    return (tile & mask) >>> offset;
  }

  /**
   * Uses the bitScheme to set given property to the 32 bit data chunk
   */
  static setBitValue(
    tile: Tile,
    property: keyof typeof World.bitScheme,
    value: number
  ) {
    const { mask, offset } = World.bitScheme[property];
    // (Right side of OR) empty the mask subsection of the tile
    // (Left side of OR) shift the new value into the right spot
    // apply the shifted value to the tile
    return (value << offset) | (tile & ~mask);
  }

  // prettier-ignore
  static bitScheme = {
    entityType: { length: 4,  offset: 0,  mask: 0b00000000000000000000000000001111 },
    entityId:   { length: 12, offset: 4,  mask: 0b00000000000000001111111111110000 },
    terrain:    { length: 2,  offset: 16, mask: 0b00000000000000110000000000000000 },
    homeTrail:  { length: 3,  offset: 18, mask: 0b00000000000111000000000000000000 },
    foodTrail:  { length: 3,  offset: 21, mask: 0b00000000111000000000000000000000 },
  } as const;
}

export enum TILE_PROPS {
  "ENTITY_TYPE" = 0,
  "ENTITY_ID" = 1,
  "TERRAIN" = 2,
  "HOME_TRAIL" = 3,
  "FOOD_TRAIL" = 4,
}
