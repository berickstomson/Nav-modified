// src/data/campusPlaces.ts

import { CampusPlace } from "../domain/campus";

export const CAMPUS_PLACES: CampusPlace[] = [
  // Entrances
  {
    id: "main-gate",
    name: "Main Gate",
    coordinate: [77.434965, 12.86374],
    type: "entrance",
    description: "Primary entrance to campus",
    hours: "24/7",
  },

  // Academic Blocks - Top Row (First to Sixth Block)
  {
    id: "first-block",
    name: "First Block",
    coordinate: [77.437894, 12.863129],
    type: "academic",
    description: "Administrative and Academic Block",
    hours: "6:00 AM - 10:00 PM",
  },
  {
    id: "second-block",
    name: "Second Block",
    coordinate: [77.438359, 12.862898],
    type: "academic",
    description: "Academic Block",
    hours: "6:00 AM - 10:00 PM",
  },
  {
    id: "third-block",
    name: "Third Block",
    coordinate: [77.438841, 12.8626],
    type: "academic",
    description: "Academic Block",
    hours: "6:00 AM - 10:00 PM",
  },
  {
    id: "fourth-block",
    name: "Fourth Block",
    coordinate: [77.43915, 12.862427],
    type: "academic",
    description: "Academic Block",
    hours: "6:00 AM - 10:00 PM",
  },
  {
    id: "sixth-block",
    name: "Sixth Block",
    coordinate: [77.439851, 12.862161],
    type: "academic",
    description: "Academic Block",
    hours: "6:00 AM - 10:00 PM",
  },

  // Specialized Buildings - Bottom Row
  {
    id: "fifth-block",
    name: "Fifth Block",
    coordinate: [77.438516, 12.861963],
    type: "academic",
    description: "Academic Block",
    hours: "6:00 AM - 10:00 PM",
  },
  {
    id: "pu-block",
    name: "PU Block",
    coordinate: [77.437391, 12.86007],
    type: "academic",
    description: "Pre-University Block",
    hours: "6:00 AM - 6:00 PM",
  },
  {
    id: "architecture",
    name: "Architecture Block",
    coordinate: [77.438477, 12.860067],
    type: "academic",
    description: "Architecture Department",
    hours: "6:00 AM - 10:00 PM",
  },
  {
    id: "devdan",
    name: "Devadan Hall",
    coordinate: [77.439342, 12.859932],
    type: "hostel",
    description: "Student Hostel - Devadan Hall",
    hours: "24/7",
  },

  // Canteen
  {
    id: "fourth-block",
    name: "South Canteen",
    coordinate: [77.439306, 12.862325],
    type: "canteen",
    description: "Fourth Block Canteen",
    hours: "6:00 AM - 10:00 PM",
  },

  // Religious/Cultural
  {
    id: "chapel",
    name: "Chapel",
    coordinate: [77.437719, 12.860132],
    type: "landmark",
    description: "Campus Chapel",
    hours: "6:00 AM - 8:00 PM",
  },
];
