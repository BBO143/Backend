# --- Helpers ---
def upsert_layer(layer):
  if (.layers | map(.id) | index(layer.id)) != null
  then .layers |= (map(if .id==layer.id then layer else . end))
  else .layers += [layer]
  end;

# --- Palette ---
# Fond, eau, parcs, bâti, routes, limites
def palette:
  {
    bg:        "#F6F7F9",
    land:      "#F6F7F9",
    water:     "#2B78C6",
    park:      "#CFE8CF",
    building:  "#D9D9D9",
    boundary:  "#B8C0CC",
    road: {
      casing:  "#FFFFFF",
      minor:   "#CFCFD3",
      tert:    "#BFC6CD",
      sec:     "#AEB8C2",
      prim:    "#8FA3B8",
      trunk:   "#6F8FA6",
      motor:   "#4A6F8E"
    },
    label: {
      text:    "#2E3C48",
      halo:    "#FFFFFF"
    }
  };

# --- Patch global ---
(
  .name = "IDF Rich v2 (esthétique)"
)
| ( .metadata //= {} )
| ( .glyphs = "https://idf-tiles.idf-maps-007.workers.dev/fonts/{fontstack}/{range}.pbf" )
| ( .sprite = "https://idf-tiles.idf-maps-007.workers.dev/sprite" )

# Fond
| upsert_layer({
    id: "background",
    type: "background",
    paint: { "background-color": (palette.bg) }
  })

# Eau (surfaces)
| upsert_layer({
    id: "water",
    type: "fill",
    source: "composite",
    "source-layer": "water",
    paint: { "fill-color": (palette.water) }
  })

# Cours d'eau (traits)
| upsert_layer({
    id: "waterway",
    type: "line",
    source: "composite",
    "source-layer": "waterway",
    paint: {
      "line-color": (palette.water),
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        8, 0.2,
        12, 1.2,
        14, 2.0
      ]
    }
  })

# Parcs / landuse=park
| upsert_layer({
    id: "park",
    type: "fill",
    source: "composite",
    "source-layer": "landuse",
    filter: ["==", "class", "park"],
    paint: {
      "fill-color": (palette.park)
    }
  })

# Bâtiments (2D simple)
| upsert_layer({
    id: "building",
    type: "fill",
    source: "composite",
    "source-layer": "building",
    paint: {
      "fill-color": (palette.building),
      "fill-outline-color": "#BEBEBE"
    }
  })

# Limites administratives (légères, pointillées)
| upsert_layer({
    id: "boundary-admin",
    type: "line",
    source: "composite",
    "source-layer": "boundary",
    paint: {
      "line-color": (palette.boundary),
      "line-width": 1,
      "line-dasharray": [2,2]
    }
  })

# Routes — casing (blanc)
| upsert_layer({
    id: "road-casing",
    type: "line",
    source: "composite",
    "source-layer": "road",
    paint: {
      "line-color": (palette.road.casing),
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        6, 0.6,
        10, 2.0,
        12, 3.2,
        14, 5.5,
        16, 9.0
      ]
    }
  })

# Routes — cœur (couleur selon classe)
| upsert_layer({
    id: "road-core",
    type: "line",
    source: "composite",
    "source-layer": "road",
    paint: {
      "line-color": [
        "match", ["get","class"],
        "motorway", (palette.road.motor),
        "trunk",    (palette.road.trunk),
        "primary",  (palette.road.prim),
        "secondary",(palette.road.sec),
        "tertiary", (palette.road.tert),
        (palette.road.minor)
      ],
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        6, 0.4,
        10, 1.4,
        12, 2.2,
        14, 3.6,
        16, 6.0
      ]
    }
  })

# Labels lieux (villes/quartiers)
| upsert_layer({
    id: "place-label",
    type: "symbol",
    source: "composite",
    "source-layer": "place_label",
    layout: {
      "text-field": ["coalesce", ["get","name"], ["get","name_en"], ["get","name:latin"]],
      "text-size": [
        "interpolate", ["linear"], ["zoom"],
        3, 10, 6, 12, 10, 16, 14, 20
      ],
      "text-font": ["Noto Sans Regular"],
      "text-letter-spacing": 0.01
    },
    paint: {
      "text-color": (palette.label.text),
      "text-halo-color": (palette.label.halo),
      "text-halo-width": 1.2,
      "text-halo-blur": 0.2
    }
  })

# Labels routes
| upsert_layer({
    id: "road-label",
    type: "symbol",
    source: "composite",
    "source-layer": "road",
    minzoom: 12,
    layout: {
      "symbol-placement": "line",
      "text-field": ["coalesce", ["get","name"], ["get","ref"]],
      "text-size": [
        "interpolate", ["linear"], ["zoom"],
        12, 10, 14, 12, 16, 14
      ],
      "text-font": ["Noto Sans Regular"]
    },
    paint: {
      "text-color": "#445566",
      "text-halo-color": (palette.label.halo),
      "text-halo-width": 1.1
    }
  })
