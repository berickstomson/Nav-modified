import { CampusPlace } from "@/src/domain/campus";

export type BuildingEntranceType =
  | "main"
  | "side"
  | "service"
  | "accessible"
  | "back";

export type BuildingEntrance = {
  id: string;
  buildingId: CampusPlace["id"];
  name: string;
  coordinate: [number, number];
  type?: BuildingEntranceType;
  accessibility?: boolean;
};

export const BUILDING_ENTRANCES: BuildingEntrance[] = [
  // Example entries (replace with real data)
  {
    id: "firstblock-main",
    buildingId: "first-block",
    name: "Main Entrance",
    coordinate: [77.437817, 12.863162],
    type: "main",
    accessibility: true,
  },
  {
    id: "firstblock-side",
    buildingId: "first-block",
    name: "Side Entrance",
    coordinate: [77.437844, 12.862826],
    type: "side",
    accessibility: true,
  },
  {
    id: "secondblock-side",
    buildingId: "second-block",
    name: "Side Entrance",
    coordinate: [77.438176, 12.862676],
    type: "side",
    accessibility: true,
  },
  {
    id: "thirdblock-audi",
    buildingId: "third-block",
    name: "Main Entrance",
    coordinate: [77.438704, 12.862662],
    type: "main",
    accessibility: true,
  },
  {
    id: "thirdblock-back",
    buildingId: "third-block",
    name: "Back Entrance",
    coordinate: [77.43898591547452, 12.862586759476258],
    type: "back",
    accessibility: true,
  },
];
