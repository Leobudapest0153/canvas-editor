export interface FloorDimensions {
  width: number
  length: number
  height: number
  isElastic?: boolean
}

export interface ElasticBounds {
  width: number
  length: number
  height: number
}

export const DEFAULT_ELASTIC_AREA: ElasticBounds = {
  width: 100,
  length: 100,
  height: 100,
}

export const DEFAULT_ELASTIC_PADDING = 0.25
