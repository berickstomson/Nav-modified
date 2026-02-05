import { distance, point } from "@turf/turf";
import { FeatureCollection, LineString } from "geojson";

const CONNECT_THRESHOLD_METERS = 8;

export type GraphNode = {
  id: string;
  coord: [number, number];
};
export type GraphEdge = {
  from: string;
  to: string;
  weight: number;
};
export type Graph = {
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
};

export function buildGraph(paths: FeatureCollection<LineString>): Graph {
  const nodes: Record<string, GraphNode> = {};
  const edges: GraphEdge[] = [];
  let nodeCounter = 0;
  const keyForCoord = (coord: [number, number]) =>
    `${coord[0].toFixed(7)},${coord[1].toFixed(7)}`;
  const idByKey = new Map<string, string>();

  function findOrCreateNode(coord: [number, number]): string {
    const key = keyForCoord(coord);
    const existing = idByKey.get(key);
    if (existing) return existing;

    const id = `${nodeCounter++}`;
    nodes[id] = { id, coord };
    idByKey.set(key, id);
    return id;
  }

  for (const feature of paths.features) {
    const coords = feature.geometry.coordinates;

    for (let i = 1; i < coords.length; i++) {
      const fromCoord: [number, number] = [coords[i - 1][0], coords[i - 1][1]];

      const toCoord: [number, number] = [coords[i][0], coords[i][1]];

      const fromId = findOrCreateNode(fromCoord);
      const toId = findOrCreateNode(toCoord);

      const dist = distance(point(fromCoord), point(toCoord), {
        units: "meters",
      });

      edges.push({ from: fromId, to: toId, weight: dist });
      edges.push({ from: toId, to: fromId, weight: dist });
    }
  }

  const degree: Record<string, number> = {};
  for (const edge of edges) {
    degree[edge.from] = (degree[edge.from] ?? 0) + 1;
  }

  const connectable = Object.keys(nodes).filter((id) => (degree[id] ?? 0) <= 2);

  for (let i = 0; i < connectable.length; i++) {
    for (let j = i + 1; j < connectable.length; j++) {
      const idA = connectable[i];
      const idB = connectable[j];
      const a = nodes[idA];
      const b = nodes[idB];
      if (!a || !b) continue;
      const d = distance(point(a.coord), point(b.coord), { units: "meters" });
      if (d <= CONNECT_THRESHOLD_METERS) {
        edges.push({ from: idA, to: idB, weight: d });
        edges.push({ from: idB, to: idA, weight: d });
      }
    }
  }

  return { nodes, edges };
}
