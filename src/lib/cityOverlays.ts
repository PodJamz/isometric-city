/**
 * City overlays (MVP)
 *
 * Purpose: Make preset cities look geographically sane without pulling in
 * full hydrography datasets yet. These masks are hand-tuned and only apply
 * to known preset locations.
 */

import type { Tile } from '@/types/game'

export type PresetCityId =
  | 'new_york'
  | 'san_francisco'
  | 'london'
  | 'dublin'
  | 'tokyo'
  | 'sydney'

type LatLng = { lat: number; lng: number }

const PRESET_CITIES: Array<{ id: PresetCityId; center: LatLng }> = [
  { id: 'new_york', center: { lat: 40.7, lng: -74.0 } },
  { id: 'san_francisco', center: { lat: 37.7749, lng: -122.4194 } },
  { id: 'london', center: { lat: 51.5, lng: -0.1 } },
  { id: 'dublin', center: { lat: 53.3498, lng: -6.2603 } },
  { id: 'tokyo', center: { lat: 35.7, lng: 139.8 } },
  { id: 'sydney', center: { lat: -33.9, lng: 151.2 } },
]

export function detectPresetCity(lat: number, lng: number): PresetCityId | null {
  // Very small radius: only intended for our preset buttons.
  const MAX_DIST_DEG = 0.8
  let best: { id: PresetCityId; d: number } | null = null

  for (const c of PRESET_CITIES) {
    const dLat = lat - c.center.lat
    const dLng = lng - c.center.lng
    const d = Math.sqrt(dLat * dLat + dLng * dLng)
    if (d <= MAX_DIST_DEG && (!best || d < best.d)) best = { id: c.id, d }
  }

  return best?.id ?? null
}

function setWater(tile: Tile) {
  tile.building.type = 'water'
  tile.building.level = 0
  tile.building.population = 0
  tile.building.jobs = 0
  tile.building.powered = false
  tile.building.watered = false
  tile.building.onFire = false
  tile.building.fireProgress = 0
  tile.building.age = 0
  tile.building.constructionProgress = 100
  tile.building.abandoned = false
  tile.zone = 'none'
  tile.hasSubway = false
}

function setLand(tile: Tile) {
  tile.building.type = 'grass'
  tile.building.level = 0
  tile.building.population = 0
  tile.building.jobs = 0
  tile.building.powered = false
  tile.building.watered = false
  tile.building.onFire = false
  tile.building.fireProgress = 0
  tile.building.age = 0
  tile.building.constructionProgress = 100
  tile.building.abandoned = false
  tile.zone = 'none'
  tile.hasSubway = false
}

/**
 * Apply hand-tuned “water + land” masks for preset cities.
 */
export function applyCityOverlay(grid: Tile[][], cityId: PresetCityId): void {
  const size = grid.length
  if (size === 0) return

  const W = size
  const H = size

  const inBounds = (x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W
  const waterAt = (x: number, y: number) => {
    if (!inBounds(x, y)) return
    setWater(grid[y][x])
  }
  const landAt = (x: number, y: number) => {
    if (!inBounds(x, y)) return
    setLand(grid[y][x])
  }

  if (cityId === 'new_york') {
    // NYC: Based on actual geography
    // Manhattan: ~13.4mi N-S, ~2.3mi E-W, centered at 40.7°N, 74.0°W
    // Grid is 64x64 tiles (~32km² view)
    
    // Clear everything first, then build from reference
    // Manhattan runs roughly N-S (top to bottom in isometric view)
    const centerX = Math.floor(W / 2)
    const centerY = Math.floor(H / 2)
    
    // Manhattan island: long narrow strip, slightly angled
    // North end around y=8, South end around y=56
    const manhattanNorthY = 8
    const manhattanSouthY = 56
    const manhattanWidth = 6 // ~2.3 miles wide
    
    // Hudson River (west side) - wider, ~1-2 miles
    const hudsonWidth = 8
    const hudsonCenterX = centerX - Math.floor(manhattanWidth / 2) - Math.floor(hudsonWidth / 2)
    
    // East River (east side) - narrower, ~0.5-1 mile
    const eastWidth = 4
    const eastCenterX = centerX + Math.floor(manhattanWidth / 2) + Math.floor(eastWidth / 2)
    
    // Draw Hudson River (west of Manhattan)
    for (let y = manhattanNorthY; y < manhattanSouthY + 10; y++) {
      for (let x = hudsonCenterX - Math.floor(hudsonWidth / 2); x < hudsonCenterX + Math.floor(hudsonWidth / 2); x++) {
        waterAt(x, y)
      }
    }
    
    // Draw East River (east of Manhattan)
    for (let y = manhattanNorthY + 4; y < manhattanSouthY; y++) {
      for (let x = eastCenterX - Math.floor(eastWidth / 2); x < eastCenterX + Math.floor(eastWidth / 2); x++) {
        waterAt(x, y)
      }
    }
    
    // Draw Manhattan island (long narrow strip)
    for (let y = manhattanNorthY; y < manhattanSouthY; y++) {
      // Manhattan widens slightly in the middle (around 14th St)
      const midY = (manhattanNorthY + manhattanSouthY) / 2
      const widthAtY = y < midY 
        ? manhattanWidth + Math.floor((midY - y) / 8) // Wider in middle
        : manhattanWidth + Math.floor((y - midY) / 8)
      
      const manhattanLeft = centerX - Math.floor(widthAtY / 2)
      const manhattanRight = centerX + Math.floor(widthAtY / 2)
      
      for (let x = manhattanLeft; x < manhattanRight; x++) {
        landAt(x, y)
      }
    }
    
    // NY Harbor (south of Manhattan, opens to Atlantic)
    const harborY = manhattanSouthY
    for (let y = harborY; y < H; y++) {
      const harborWidth = Math.floor(W * 0.6)
      const harborLeft = centerX - Math.floor(harborWidth / 2)
      for (let x = harborLeft; x < harborLeft + harborWidth; x++) {
        waterAt(x, y)
      }
    }
    
    // New Jersey (west of Hudson River)
    for (let y = manhattanNorthY + 8; y < manhattanSouthY; y++) {
      for (let x = 0; x < hudsonCenterX - Math.floor(hudsonWidth / 2); x++) {
        landAt(x, y)
      }
    }
    
    // Brooklyn/Queens (east of East River, Long Island)
    for (let y = manhattanNorthY + 8; y < manhattanSouthY; y++) {
      for (let x = eastCenterX + Math.floor(eastWidth / 2); x < W; x++) {
        landAt(x, y)
      }
    }
    
    // Staten Island (southwest, below harbor)
    const siCx = Math.floor(W * 0.25)
    const siCy = Math.floor(H * 0.75)
    const siR = 8
    for (let y = siCy - siR; y <= siCy + siR; y++) {
      for (let x = siCx - siR; x <= siCx + siR; x++) {
        const dx = x - siCx
        const dy = y - siCy
        if (dx * dx + dy * dy <= siR * siR) {
          landAt(x, y)
        }
      }
    }
    
    // Upper Bay / Hudson continuation (north of Manhattan)
    for (let y = 0; y < manhattanNorthY; y++) {
      for (let x = Math.floor(W * 0.3); x < Math.floor(W * 0.7); x++) {
        waterAt(x, y)
      }
    }

    return
  }

  if (cityId === 'san_francisco') {
    // SF: Peninsula + SF Bay + Pacific Ocean
    // Center: 37.77°N, 122.42°W
    
    // Pacific Ocean (west side)
    const pacificX = Math.floor(W * 0.20)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < pacificX; x++) {
        waterAt(x, y)
      }
    }

    // SF Bay (east side, widens northward)
    const bayStartX = Math.floor(W * 0.50)
    const bayEndX = W
    const bayStartY = 0
    const bayEndY = Math.floor(H * 0.75)
    
    for (let y = bayStartY; y < bayEndY; y++) {
      const progress = y / bayEndY
      const xStart = Math.floor(bayStartX - progress * 5) // Bay widens going north
      for (let x = xStart; x < bayEndX; x++) {
        waterAt(x, y)
      }
    }

    // SF Peninsula (narrow strip between Pacific and Bay)
    const peninsulaStartY = Math.floor(H * 0.10)
    const peninsulaEndY = Math.floor(H * 0.70)
    for (let y = peninsulaStartY; y < peninsulaEndY; y++) {
      const bayEdge = Math.floor(bayStartX - (y / bayEndY) * 5)
      for (let x = pacificX; x < bayEdge; x++) {
        if (inBounds(x, y) && grid[y][x].building.type !== 'water') {
          landAt(x, y)
        }
      }
    }

    // Golden Gate opening (narrow channel connecting Pacific to Bay)
    const goldenGateY = Math.floor(H * 0.05)
    const goldenGateX0 = Math.floor(W * 0.25)
    const goldenGateX1 = Math.floor(W * 0.45)
    for (let y = 0; y < goldenGateY; y++) {
      for (let x = goldenGateX0; x < goldenGateX1; x++) {
        waterAt(x, y)
      }
    }

    // East Bay (land east of SF Bay)
    for (let y = Math.floor(H * 0.15); y < Math.floor(H * 0.65); y++) {
      for (let x = Math.floor(W * 0.55); x < W; x++) {
        if (grid[y][x].building.type !== 'water') {
          landAt(x, y)
        }
      }
    }

    return
  }

  // Other cities: keep elevation-based terrain for now.
}
