import { useLocation } from "@/hooks/useLocation";
import { useNavigation } from "@/hooks/useNavigation";
import { useSearch } from "@/hooks/useSearch";
import {
  CUSTOM_MAPBOX_CONFIG,
  CUSTOM_STYLE_CONFIG,
  styleManager,
} from "@/services/customMapboxStyle";
import { CAMPUS_PLACES } from "@/src/data/campusPlaces";
import { BUILDING_ENTRANCES } from "@/src/data/geo/buildingEntrances";
import { CAMPUS_PATHS } from "@/src/data/geo/paths";
import { CampusBoundaryLayer } from "@/src/map/layers/CampusBoundaryLayer";
import { CampusBuildingsLayer } from "@/src/map/layers/CampusBuildingsLayer";
import { MapCamera } from "@/src/map/MapCamera";
import { MapViewContainer } from "@/src/map/MapViewContainer";

import SmartFloatingButtons from "@/components/FloatingButtons";
import InstructionsPanel from "@/components/InstructionsPanel";
import MenuModal from "@/components/MenuModal";
import EnhancedNavigationPanel from "@/components/NavigationPanel";
import PlaceDetailsModal from "@/components/PlaceDetailsModal";
import RouteProgressBar from "@/components/RouteProgressBar";
import FuturisticSearchBar from "@/components/SearchBar";
import SearchResults from "@/components/SearchResults";
import SettingsModal from "@/components/SettingsModal";

import Mapbox from "@rnmapbox/maps";
import { Feature, FeatureCollection, Point } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { lineSlice, nearestPointOnLine, point } from "@turf/turf";

const DEFAULT_CAMERA_SETTINGS = {
  zoomLevel: 16,
  centerCoordinate: [77.48, 12.94] as [number, number],
  navigationZoomLevel: 17,
};

export default function MapScreen() {
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);

  const { userLocation, goToCurrentLocation } = useLocation();

  const [ready, setReady] = useState(false);
  const [mapStyle, setMapStyle] = useState(CUSTOM_MAPBOX_CONFIG.styleUrl);
  const [currentZoom, setCurrentZoom] = useState(
    DEFAULT_CAMERA_SETTINGS.zoomLevel,
  );
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPlaceDetails, setShowPlaceDetails] = useState(false);
  const [showInstructionsPanel, setShowInstructionsPanel] = useState(false);
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);
  const [isWaitingForLocation, setIsWaitingForLocation] = useState(true);

  const [selectedPlace, setSelectedPlace] = useState<
    (typeof CAMPUS_PLACES)[0] | null
  >(null);

  const {
    searchQuery,
    searchResults,
    showResults,
    isSearchFocused,
    categories,
    selectedCategory,
    handleSearch,
    handleCategoryChange,
    clearSearch,
    handleSelectResult: selectResult,
    setIsSearchFocused,
    showAllLocations,
  } = useSearch(CAMPUS_PLACES);

  const {
    selectedDestination,
    routeInfo,
    isNavigating,
    travelTime,
    distance,
    slideAnim,
    navigationSteps,
    currentStepIndex,
    routeProgress,
    updateNavigationProgress,
    startNavigation,
    stopNavigation,
    handleImmediateMapNavigation,
  } = useNavigation();

  const displayRouteFeature = useMemo(() => {
    if (!routeInfo?.feature) return null;
    if (!userLocation) return routeInfo.feature;
    try {
      const coords = routeInfo.feature.geometry
        .coordinates as [number, number][];
      if (coords.length < 2) return routeInfo.feature;
      const nearest = nearestPointOnLine(
        routeInfo.feature,
        point(userLocation)
      );
      const lineToEnd = lineSlice(
        nearest,
        point(coords[coords.length - 1]),
        routeInfo.feature
      );
      const slicedCoords = (lineToEnd.geometry.coordinates ||
        []) as [number, number][];
      if (slicedCoords.length < 2) return routeInfo.feature;
      return lineToEnd as Feature<any>;
    } catch (error) {
      console.warn("Route slicing failed:", error);
      return routeInfo.feature;
    }
  }, [routeInfo, userLocation]);

  const placeEntrances = useMemo(() => {
    const map = new Map<string, typeof BUILDING_ENTRANCES>();
    for (const entrance of BUILDING_ENTRANCES) {
      const list = map.get(entrance.buildingId) ?? [];
      list.push(entrance);
      map.set(entrance.buildingId, list);
    }
    return map;
  }, []);

  const getEntrancesForPlace = (placeId?: string) => {
    if (!placeId) return [];
    return placeEntrances.get(placeId) ?? [];
  };

  const getPreferredEntrance = (
    placeId?: string,
    userLoc?: [number, number] | null,
  ) => {
    const entrances = getEntrancesForPlace(placeId);
    if (entrances.length === 0) return null;
    const main = entrances.find((e) => e.type === "main");
    if (main) return main;
    if (userLoc) {
      let nearest = entrances[0];
      let nearestScore = Number.POSITIVE_INFINITY;
      for (const entrance of entrances) {
        const dx = entrance.coordinate[0] - userLoc[0];
        const dy = entrance.coordinate[1] - userLoc[1];
        const score = dx * dx + dy * dy;
        if (score < nearestScore) {
          nearest = entrance;
          nearestScore = score;
        }
      }
      return nearest;
    }
    return entrances[0];
  };

  const placesFeatureCollection = useMemo<FeatureCollection<Point>>(() => {
    return {
      type: "FeatureCollection",
      features: CAMPUS_PLACES.map(
        (place): Feature<Point> => ({
          type: "Feature",
          properties: {
            id: place.id,
            name: place.name,
            type: place.type,
          },
          geometry: {
            type: "Point",
            coordinates: place.coordinate,
          },
        }),
      ),
    };
  }, []);

  useEffect(() => {
    const initMap = async () => {
      try {
        await Mapbox.requestAndroidLocationPermissions();
        setReady(true);
      } catch (error) {
        console.error("Map initialization error:", error);
        setReady(true);
      }
    };

    const timer = setTimeout(() => {
      initMap();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (userLocation && isNavigating) {
      updateNavigationProgress(userLocation);
    }
  }, [userLocation, isNavigating, updateNavigationProgress]);

  useEffect(() => {
    if (userLocation && cameraRef.current && ready && !hasCenteredOnUser) {
      const timer = setTimeout(() => {
        cameraRef.current?.setCamera({
          centerCoordinate: userLocation,
          zoomLevel: DEFAULT_CAMERA_SETTINGS.zoomLevel,
          animationDuration: 1500,
        });
        setHasCenteredOnUser(true);
        setIsWaitingForLocation(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [userLocation, ready, hasCenteredOnUser]);

  useEffect(() => {
    if (ready && isWaitingForLocation) {
      const locationTimeout = setTimeout(() => {
        if (!userLocation) {
          setIsWaitingForLocation(false);
          console.log("Location timeout - using default location");
        }
      }, 8000);

      return () => clearTimeout(locationTimeout);
    }
  }, [ready, isWaitingForLocation, userLocation]);

  const handleGoToCurrentLocation = async () => {
    try {
      const location = await goToCurrentLocation();
      if (location && cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: location,
          zoomLevel: 16,
          animationDuration: 1000,
        });
      }
    } catch (error) {
      console.error("Error going to current location:", error);
      Alert.alert("Error", "Could not get current location");
    }
  };

  const handleMapPressAndRoute = (event: any) => {
    if (isSearchFocused || (searchResults && searchResults.length > 0)) {
      clearSearch();
      Keyboard.dismiss();
    }

    if (handleImmediateMapNavigation) {
      handleImmediateMapNavigation(event, userLocation);
    }
  };

  const handleSelectResult = (result: (typeof CAMPUS_PLACES)[0]) => {
    selectResult(result);
    Keyboard.dismiss();

    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: result.coordinate,
        zoomLevel: DEFAULT_CAMERA_SETTINGS.navigationZoomLevel,
        animationDuration: 1000,
      });
    }

    setSelectedPlace(result);
    setShowPlaceDetails(true);
  };

  const handleQuickNavigation = async (item: (typeof CAMPUS_PLACES)[0]) => {
    if (!userLocation) {
      Alert.alert(
        "Location Required",
        "Please wait for your location to be detected",
      );
      return;
    }

    try {
      handleSelectResult(item);
      const preferredEntrance = getPreferredEntrance(item.id, userLocation);
      if (preferredEntrance) {
        await startNavigation(userLocation, {
          id: preferredEntrance.id,
          name: `${item.name} - ${preferredEntrance.name}`,
          coordinate: preferredEntrance.coordinate,
        });
        return;
      }
      await startNavigation(userLocation, item);
    } catch (error) {
      console.error("Error in quick navigation:", error);
      Alert.alert("Error", "Failed to start navigation");
    }
  };

  const handlePlacePress = (place: (typeof CAMPUS_PLACES)[0]) => {
    setSelectedPlace(place);
    setShowPlaceDetails(true);
  };

  const handleStartNavigationFromPlace = async (
    place: (typeof CAMPUS_PLACES)[0],
  ) => {
    setShowPlaceDetails(false);
    if (!userLocation) {
      Alert.alert(
        "Location Required",
        "Please wait for your location to be detected",
      );
      return;
    }
    const preferredEntrance = getPreferredEntrance(place.id, userLocation);
    if (preferredEntrance) {
      await startNavigation(userLocation, {
        id: preferredEntrance.id,
        name: `${place.name} - ${preferredEntrance.name}`,
        coordinate: preferredEntrance.coordinate,
      });
      return;
    }
    await startNavigation(userLocation, place);
  };

  const handleStartNavigationFromEntrance = async (
    entrance: (typeof BUILDING_ENTRANCES)[0],
  ) => {
    setShowPlaceDetails(false);
    if (!userLocation) {
      Alert.alert(
        "Location Required",
        "Please wait for your location to be detected",
      );
      return;
    }
    await startNavigation(userLocation, {
      id: entrance.id,
      name: entrance.name,
      coordinate: entrance.coordinate,
    });
  };

  const handleBuildingPress = (feature: any) => {
    const placeId = feature?.properties?.placeId;
    if (placeId) {
      const place = CAMPUS_PLACES.find((p) => p.id === placeId);
      if (place) {
        handlePlacePress(place);
        return;
      }
    }

    const geometry = feature?.geometry;
    if (!geometry || geometry.type !== "Polygon") return;

    const coord = geometry.coordinates?.[0]?.[0] as [number, number];
    if (!coord) return;

    const nearestPlace = CAMPUS_PLACES.find((place) => {
      const dist = Math.sqrt(
        Math.pow(place.coordinate[0] - coord[0], 2) +
          Math.pow(place.coordinate[1] - coord[1], 2),
      );
      return dist < 0.001;
    });

    if (nearestPlace) {
      handlePlacePress(nearestPlace);
    }
  };

  const zoomIn = () => {
    const newZoom = Math.min(currentZoom + 1, 20);
    setCurrentZoom(newZoom);
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        zoomLevel: newZoom,
        animationDuration: 300,
      });
    }
  };

  const zoomOut = () => {
    const newZoom = Math.max(currentZoom - 1, 0);
    setCurrentZoom(newZoom);
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        zoomLevel: newZoom,
        animationDuration: 300,
      });
    }
  };

  const toggleMapStyle = () => {
    const availableStyles = styleManager.getAvailableStyles();
    const currentIndex = availableStyles.findIndex(
      (style) => style.url === mapStyle,
    );
    const nextIndex = (currentIndex + 1) % availableStyles.length;
    const nextStyle = availableStyles[nextIndex];

    setMapStyle(nextStyle.url);
    console.log(`Switched to ${nextStyle.name} style`);
  };

  if (!ready) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={{ marginTop: 10, color: "#5F6368" }}>Loading map...</Text>
        <Text style={{ marginTop: 5, fontSize: 12, color: "#9AA0A6" }}>
          Getting your location
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <MapViewContainer
        mapRef={mapRef}
        styleURL={mapStyle}
        onPress={handleMapPressAndRoute}
      >
        <MapCamera
          cameraRef={cameraRef}
          centerCoordinate={DEFAULT_CAMERA_SETTINGS.centerCoordinate}
          zoomLevel={DEFAULT_CAMERA_SETTINGS.zoomLevel}
        />

        <CampusBoundaryLayer />

        <Mapbox.ShapeSource id="campus-paths" shape={CAMPUS_PATHS}>
          <Mapbox.LineLayer
            id="campus-paths-line"
            style={{
              lineColor: CUSTOM_STYLE_CONFIG.campusLayers.paths.strokeColor,
              lineWidth: CUSTOM_STYLE_CONFIG.campusLayers.paths.strokeWidth,
              lineOpacity: CUSTOM_STYLE_CONFIG.campusLayers.paths.strokeOpacity,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </Mapbox.ShapeSource>

        <CampusBuildingsLayer onBuildingPress={handleBuildingPress} />

        {BUILDING_ENTRANCES.length > 0 && (
          <Mapbox.ShapeSource
            id="building-entrances"
            shape={{
              type: "FeatureCollection",
              features: BUILDING_ENTRANCES.map((entrance) => ({
                type: "Feature",
                properties: {
                  id: entrance.id,
                  buildingId: entrance.buildingId,
                },
                geometry: {
                  type: "Point",
                  coordinates: entrance.coordinate,
                },
              })),
            }}
          >
            <Mapbox.CircleLayer
              id="building-entrances-layer"
              style={{
                circleColor: "#FBBC04",
                circleRadius: 4,
                circleStrokeColor: "#FFFFFF",
                circleStrokeWidth: 2,
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {isNavigating && displayRouteFeature && (
          <Mapbox.ShapeSource id="route-source" shape={displayRouteFeature}>
            <Mapbox.LineLayer
              id="route-line-background"
              style={{
                lineColor:
                  CUSTOM_STYLE_CONFIG.campusLayers.route
                    .backgroundStrokeColor,
                lineWidth:
                  CUSTOM_STYLE_CONFIG.campusLayers.route
                    .backgroundStrokeWidth,
                lineOpacity:
                  CUSTOM_STYLE_CONFIG.campusLayers.route
                    .backgroundStrokeOpacity,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Mapbox.LineLayer
              id="route-line"
              style={{
                lineColor: CUSTOM_STYLE_CONFIG.campusLayers.route.strokeColor,
                lineWidth: CUSTOM_STYLE_CONFIG.campusLayers.route.strokeWidth,
                lineOpacity:
                  CUSTOM_STYLE_CONFIG.campusLayers.route.strokeOpacity,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </Mapbox.ShapeSource>
        )}

        <Mapbox.ShapeSource
          id="campus-places"
          shape={placesFeatureCollection}
          onPress={(e) => {
            const feature = e.features?.[0];
            const placeId = feature?.properties?.id;
            if (!placeId) return;
            const place = CAMPUS_PLACES.find((p) => p.id === placeId);
            if (place) handlePlacePress(place);
          }}
        >
          <Mapbox.CircleLayer
            id="campus-places-default"
            style={{
              circleColor: CUSTOM_STYLE_CONFIG.markers.default.color,
              circleRadius: CUSTOM_STYLE_CONFIG.markers.default.size / 2,
              circleStrokeColor:
                CUSTOM_STYLE_CONFIG.markers.default.strokeColor,
              circleStrokeWidth:
                CUSTOM_STYLE_CONFIG.markers.default.strokeWidth,
            }}
          />
          <Mapbox.CircleLayer
            id="campus-places-selected"
            filter={[
              "==",
              ["get", "id"],
              selectedPlace?.id ? selectedPlace.id : "__none__",
            ]}
            style={{
              circleColor: CUSTOM_STYLE_CONFIG.markers.selected.color,
              circleRadius: CUSTOM_STYLE_CONFIG.markers.selected.size / 2,
              circleStrokeColor:
                CUSTOM_STYLE_CONFIG.markers.selected.strokeColor,
              circleStrokeWidth:
                CUSTOM_STYLE_CONFIG.markers.selected.strokeWidth,
            }}
          />
        </Mapbox.ShapeSource>

        {userLocation && <Mapbox.UserLocation visible />}
      </MapViewContainer>

      {isWaitingForLocation && !userLocation && (
        <View style={styles.locationLoadingContainer}>
          <View style={styles.locationLoadingCard}>
            <ActivityIndicator size="small" color="#1A73E8" />
            <Text style={styles.locationLoadingText}>
              Getting your location...
            </Text>
          </View>
        </View>
      )}

      {isNavigating && navigationSteps.length > 0 && (
        <RouteProgressBar
          currentInstruction={navigationSteps[currentStepIndex]}
          progress={routeProgress}
          isNavigating={isNavigating}
        />
      )}

      <FuturisticSearchBar
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onClear={clearSearch}
        onFocus={() => {
          setIsSearchFocused(true);
          showAllLocations();
        }}
        onBlur={() => {
          if (!searchQuery) {
            setIsSearchFocused(false);
          }
        }}
        isSearchFocused={isSearchFocused}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        onVoiceSearch={() => {
          Alert.alert("Voice Search", "Voice search feature coming soon!", [
            { text: "OK" },
          ]);
        }}
        onMenu={() => setShowMenuModal(true)}
        onProfile={() => {
          Alert.alert("Profile", "User Profile", [
            {
              text: "View Profile",
              onPress: () => Alert.alert("Profile", "Profile details"),
            },
            {
              text: "Edit Profile",
              onPress: () => Alert.alert("Edit", "Edit your profile"),
            },
            {
              text: "Logout",
              onPress: () => Alert.alert("Logout", "Logged out"),
            },
            { text: "Cancel", style: "cancel" },
          ]);
        }}
      />

      {showResults && searchResults && searchResults.length > 0 && (
        <SearchResults
          results={searchResults}
          onSelectResult={handleSelectResult}
          onQuickNavigation={handleQuickNavigation}
        />
      )}

      {isNavigating && (
        <EnhancedNavigationPanel
          slideAnim={slideAnim}
          selectedDestination={selectedDestination}
          travelTime={travelTime}
          distance={distance}
          onStopNavigation={stopNavigation}
          isNavigating={isNavigating}
          onShowInstructions={() => setShowInstructionsPanel(true)}
        />
      )}

      <SmartFloatingButtons
        onCurrentLocation={handleGoToCurrentLocation}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onToggleMapStyle={toggleMapStyle}
        on3DView={() => Alert.alert("3D View", "3D view activated")}
        onTraffic={() => Alert.alert("Traffic", "Traffic layer toggled")}
        isNavigating={isNavigating}
      />

      <PlaceDetailsModal
        visible={showPlaceDetails}
        place={selectedPlace}
        entrances={
          selectedPlace ? getEntrancesForPlace(selectedPlace.id) : []
        }
        onClose={() => {
          setShowPlaceDetails(false);
          setSelectedPlace(null);
        }}
        onStartNavigation={handleStartNavigationFromPlace}
        onStartNavigationToEntrance={handleStartNavigationFromEntrance}
      />

      <MenuModal
        visible={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        onSettings={() => {
          setShowMenuModal(false);
          setShowSettingsModal(true);
        }}
        onAbout={() => {
          setShowMenuModal(false);
          Alert.alert(
            "About",
            "Campus Navigation App v1.0\n\nA modern navigation app with real-time directions and advanced features.",
          );
        }}
        onHelp={() => {
          setShowMenuModal(false);
          Alert.alert(
            "Help & Support",
            "For help:\n- Tap search to find locations\n- Tap a location to navigate\n- Use voice guidance for directions",
          );
        }}
        onFeedback={() => {
          setShowMenuModal(false);
          Alert.alert("Send Feedback", "We'd love to hear from you!");
        }}
        onShare={async () => {
          setShowMenuModal(false);
          try {
            await Share.share({
              message: "Check out this amazing Campus Navigation App!",
              title: "Campus Navigation App",
            });
          } catch (error) {
            console.error("Share error:", error);
          }
        }}
      />

      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <InstructionsPanel
        instructions={navigationSteps}
        currentInstructionIndex={currentStepIndex}
        visible={showInstructionsPanel}
        onClose={() => setShowInstructionsPanel(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  locationLoadingContainer: {
    position: "absolute",
    top: 120,
    left: 16,
    right: 16,
    zIndex: 998,
    alignItems: "center",
  },
  locationLoadingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  locationLoadingText: {
    fontSize: 14,
    color: "#5F6368",
    fontWeight: "500",
  },
});
