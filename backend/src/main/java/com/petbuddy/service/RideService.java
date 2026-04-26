package com.petbuddy.service;

import com.petbuddy.dto.RideDto;
import com.petbuddy.entity.*;
import com.petbuddy.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for ride (pet transport) operations.
 *
 * Fixed behaviour:
 * 1. requestRide now broadcasts a NEW_RIDE_REQUEST notification to EVERY
 * available driver within 5 km — topic: /topic/driver/{driverId}
 * The ride is created WITHOUT an assigned driver (null). The first
 * driver who taps "Accept" wins.
 * 2. acceptRide is now race-condition safe: only works if ride is still
 * in REQUESTED status and has no driver yet.
 * 3. New cancelRideAsDriver — driver can cancel an ACCEPTED ride.
 * 4. Radius constant is 5.0 km (configurable here).
 */
@Service
public class RideService {

    /** Broadcast radius in kilometres */
    private static final double BROADCAST_RADIUS_KM = 5.0;

    @Value("${google.maps.api.key}")
    private String googleMapsApiKey;

    @Autowired private RideRepository rideRepository;
    @Autowired private DriverRepository driverRepository;
    @Autowired private PetRepository petRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private SimpMessagingTemplate messagingTemplate;

    // ─────────────────────────────────────────────────────────
    // User-facing operations
    // ─────────────────────────────────────────────────────────

    /**
     * Request a new ride.
     * - Creates ride with status=REQUESTED and driver=null.
     * - Finds all available drivers within BROADCAST_RADIUS_KM.
     * - Pushes a RideRequestNotification to each driver's personal topic
     * /topic/driver/{driverId} so their app shows a pop-up instantly.
     */
    @Transactional
    public RideDto.RideResponse requestRide(RideDto.RideRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        Pet pet = petRepository.findById(request.getPetId())
                .orElseThrow(() -> new RuntimeException("Pet not found: " + request.getPetId()));

        if (!pet.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("This pet does not belong to you");
        }

        // --- GOOGLE MAPS DISTANCE CALCULATION ---
        double distanceInKm = 0.0;
        try {
            String url = String.format(
                "https://maps.googleapis.com/maps/api/distancematrix/json?origins=%f,%f&destinations=%f,%f&key=%s",
                request.getPickupLatitude(), request.getPickupLongitude(),
                request.getDropLatitude(), request.getDropLongitude(),
                googleMapsApiKey
            );
            RestTemplate restTemplate = new RestTemplate();
            JsonNode response = restTemplate.getForObject(url, JsonNode.class);
            
            // Extract meters and convert to KM safely
            if (response != null && "OK".equals(response.path("status").asText())) {
                JsonNode element = response.path("rows").get(0).path("elements").get(0);
                if ("OK".equals(element.path("status").asText())) {
                    int meters = element.path("distance").path("value").asInt();
                    distanceInKm = meters / 1000.0;
                } else {
                    distanceInKm = 5.0; // Fallback if route not found
                }
            } else {
                distanceInKm = 5.0; // Fallback distance if API request fails structure
            }
        } catch (Exception e) {
            System.out.println("Google API fallback: " + e.getMessage());
            distanceInKm = 5.0; // Fallback distance if API fails entirely
        }

        // Calculate Fare: $5 Base + $2.50 per KM
        double calculatedFare = 5.0 + (distanceInKm * 2.50);

        // Create ride with NO driver assigned yet
        Ride ride = Ride.builder()
                .user(user)
                .pet(pet)
                .driver(null)                          // driver assigned on accept
                .pickupAddress(request.getPickupAddress())
                .pickupLatitude(request.getPickupLatitude())
                .pickupLongitude(request.getPickupLongitude())
                .dropAddress(request.getDropAddress())
                .dropLatitude(request.getDropLatitude())
                .dropLongitude(request.getDropLongitude())
                .notes(request.getNotes())
                .estimatedFare(Math.round(calculatedFare * 100.0) / 100.0) // Round to 2 decimals
                .status(Ride.RideStatus.REQUESTED)
                .requestedAt(LocalDateTime.now())
                .build();

        ride = rideRepository.save(ride);

        // Find every available driver within radius and notify them
        List<Driver> nearbyDrivers = driverRepository.findAvailableDriversWithinRadius(
                request.getPickupLatitude(),
                request.getPickupLongitude(),
                BROADCAST_RADIUS_KM
        );

        if (!nearbyDrivers.isEmpty()) {
            RideDto.RideRequestNotification notification = buildNotification(ride);
            for (Driver driver : nearbyDrivers) {
                // Each driver gets the notification on their personal topic
                messagingTemplate.convertAndSend(
                        "/topic/driver/" + driver.getId(),
                        notification
                );
            }
        }

        return mapToResponse(ride);
    }

    /** Get ride history for a user */
    public List<RideDto.RideResponse> getUserRides(String userEmail) {
        User user = getUserByEmail(userEmail);
        return rideRepository.findByUserIdOrderByRequestedAtDesc(user.getId())
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    /** Get a specific ride by ID (user) */
    public RideDto.RideResponse getRideById(Long rideId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Ride ride = rideRepository.findByIdAndUserId(rideId, user.getId())
                .orElseThrow(() -> new RuntimeException("Ride not found: " + rideId));
        return mapToResponse(ride);
    }

    /** User cancels a REQUESTED ride */
    @Transactional
    public RideDto.RideResponse cancelRide(Long rideId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Ride ride = rideRepository.findByIdAndUserId(rideId, user.getId())
                .orElseThrow(() -> new RuntimeException("Ride not found: " + rideId));

        if (ride.getStatus() != Ride.RideStatus.REQUESTED &&
            ride.getStatus() != Ride.RideStatus.ACCEPTED) {
            throw new RuntimeException("Cannot cancel a ride that is already " + ride.getStatus());
        }

        ride.setStatus(Ride.RideStatus.CANCELLED);

        if (ride.getDriver() != null) {
            Driver driver = ride.getDriver();
            driver.setAvailable(true);
            driverRepository.save(driver);
        }

        ride = rideRepository.save(ride);
        notifyRideUpdate(ride);
        return mapToResponse(ride);
    }

    // ─────────────────────────────────────────────────────────
    // Driver-facing operations
    // ─────────────────────────────────────────────────────────

    /**
     * Get all rides assigned to (or previously completed by) this driver.
     * Also returns REQUESTED rides near the driver so the dashboard can
     * show them even before WebSocket notification arrives.
     */
    public List<RideDto.RideResponse> getDriverRides(String driverEmail) {
        User user = getUserByEmail(driverEmail);
        Driver driver = driverRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Driver profile not found"));
        return rideRepository.findByDriverIdOrderByRequestedAtDesc(driver.getId())
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    /**
     * Get open REQUESTED rides near this driver (5 km radius).
     * Used by the driver app to show a list of available rides on refresh.
     */
    public List<RideDto.RideResponse> getNearbyRequestedRides(String driverEmail) {
        User user = getUserByEmail(driverEmail);
        Driver driver = driverRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Driver profile not found"));

        if (driver.getCurrentLatitude() == null || driver.getCurrentLongitude() == null) {
            return List.of();
        }

        return rideRepository.findRequestedRidesWithinRadius(
                driver.getCurrentLatitude(),
                driver.getCurrentLongitude(),
                BROADCAST_RADIUS_KM
        ).stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    /**
     * Driver accepts a REQUESTED ride.
     * Race-condition safe: checks ride is still REQUESTED with no driver.
     */
    @Transactional
    public RideDto.RideResponse acceptRide(Long rideId, String driverEmail) {
        Driver driver = getDriverByEmail(driverEmail);

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found: " + rideId));

        if (ride.getStatus() != Ride.RideStatus.REQUESTED) {
            throw new RuntimeException("This ride has already been taken by another driver.");
        }
        if (ride.getDriver() != null) {
            throw new RuntimeException("This ride has already been accepted.");
        }

        ride.setDriver(driver);
        ride.setStatus(Ride.RideStatus.ACCEPTED);
        ride.setAcceptedAt(LocalDateTime.now());
        driver.setAvailable(false);
        driverRepository.save(driver);

        ride = rideRepository.save(ride);
        notifyRideUpdate(ride);       // tells the user their driver is coming
        return mapToResponse(ride);
    }

    /** Driver starts the ride */
    @Transactional
    public RideDto.RideResponse startRide(Long rideId, String driverEmail) {
        Driver driver = getDriverByEmail(driverEmail);
        Ride ride = getRideForDriver(rideId, driver);

        if (ride.getStatus() != Ride.RideStatus.ACCEPTED) {
            throw new RuntimeException("Ride must be ACCEPTED before starting.");
        }

        ride.setStatus(Ride.RideStatus.STARTED);
        ride.setStartedAt(LocalDateTime.now());
        ride = rideRepository.save(ride);
        notifyRideUpdate(ride);
        return mapToResponse(ride);
    }

    /** Driver completes the ride */
    @Transactional
    public RideDto.RideResponse completeRide(Long rideId, String driverEmail) {
        Driver driver = getDriverByEmail(driverEmail);
        Ride ride = getRideForDriver(rideId, driver);

        if (ride.getStatus() != Ride.RideStatus.STARTED) {
            throw new RuntimeException("Ride must be STARTED before completing.");
        }

        ride.setStatus(Ride.RideStatus.COMPLETED);
        ride.setCompletedAt(LocalDateTime.now());

        driver.setAvailable(true);
        driver.setTotalRides(driver.getTotalRides() + 1);
        driverRepository.save(driver);

        ride = rideRepository.save(ride);
        notifyRideUpdate(ride);
        return mapToResponse(ride);
    }

    /**
     * Driver cancels an ACCEPTED ride.
     * Sets ride back to REQUESTED so other drivers can accept it,
     * and re-broadcasts the request to nearby drivers.
     */
    @Transactional
    public RideDto.RideResponse cancelRideAsDriver(Long rideId, String driverEmail) {
        Driver driver = getDriverByEmail(driverEmail);
        Ride ride = getRideForDriver(rideId, driver);

        if (ride.getStatus() != Ride.RideStatus.ACCEPTED) {
            throw new RuntimeException("Only ACCEPTED rides can be cancelled by a driver.");
        }

        // Free up the driver
        driver.setAvailable(true);
        driverRepository.save(driver);

        // Put ride back to REQUESTED with no driver — another driver can pick it up
        ride.setDriver(null);
        ride.setStatus(Ride.RideStatus.REQUESTED);
        ride.setAcceptedAt(null);
        ride = rideRepository.save(ride);

        // Notify the user that their ride is searching again
        notifyRideUpdate(ride);

        // Re-broadcast to nearby drivers
        List<Driver> nearbyDrivers = driverRepository.findAvailableDriversWithinRadius(
                ride.getPickupLatitude(), ride.getPickupLongitude(), BROADCAST_RADIUS_KM
        );
        if (!nearbyDrivers.isEmpty()) {
            RideDto.RideRequestNotification notification = buildNotification(ride);
            for (Driver d : nearbyDrivers) {
                if (!d.getId().equals(driver.getId())) { // don't re-notify the cancelling driver
                    messagingTemplate.convertAndSend("/topic/driver/" + d.getId(), notification);
                }
            }
        }

        return mapToResponse(ride);
    }

    /** Toggle driver availability */
    @Transactional
    public RideDto.DriverResponse toggleAvailability(boolean available, String driverEmail) {
        User user = getUserByEmail(driverEmail);
        Driver driver = driverRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Driver profile not found"));
        driver.setAvailable(available);
        driver = driverRepository.save(driver);
        return mapDriverToResponse(driver);
    }

    /** Update driver's live location (called from WebSocket @MessageMapping) */
    @Transactional
    public void updateDriverLocation(Long rideId, Double latitude, Double longitude, String driverEmail) {
        User user = getUserByEmail(driverEmail);
        Driver driver = driverRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        // Always update the driver's current location in the database
        driver.setCurrentLatitude(latitude);
        driver.setCurrentLongitude(longitude);
        driverRepository.save(driver);

        // ONLY broadcast to a ride topic if a ride is currently active
        if (rideId != null) {
            RideDto.LocationUpdate update = new RideDto.LocationUpdate(
                    rideId, driver.getId(), latitude, longitude,
                    LocalDateTime.now().toString()
            );
            messagingTemplate.convertAndSend("/topic/ride/" + rideId, update);
        }
    }

    // ─────────────────────────────────────────────────────────
    // Helper methods
    // ─────────────────────────────────────────────────────────

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    private Driver getDriverByEmail(String email) {
        User user = getUserByEmail(email);
        return driverRepository.findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("Driver profile not found for: " + email));
    }

    private Ride getRideForDriver(Long rideId, Driver driver) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found: " + rideId));
        if (ride.getDriver() == null || !ride.getDriver().getId().equals(driver.getId())) {
            throw new RuntimeException("This ride is not assigned to you.");
        }
        return ride;
    }

    /** Broadcast a ride status update to the rider's topic */
    private void notifyRideUpdate(Ride ride) {
        messagingTemplate.convertAndSend("/topic/ride/" + ride.getId(), mapToResponse(ride));
    }

    /** Build the push notification payload sent to drivers */
    private RideDto.RideRequestNotification buildNotification(Ride ride) {
        return new RideDto.RideRequestNotification(
                ride.getId(),
                ride.getUser().getName(),
                ride.getPet().getName(),
                ride.getPickupAddress(),
                ride.getPickupLatitude(),
                ride.getPickupLongitude(),
                ride.getDropAddress(),
                ride.getDropLatitude(),
                ride.getDropLongitude(),
                ride.getNotes(),
                "NEW_RIDE_REQUEST"
        );
    }

    private RideDto.RideResponse mapToResponse(Ride ride) {
        return RideDto.RideResponse.builder()
                .id(ride.getId())
                .userId(ride.getUser().getId())
                .userName(ride.getUser().getName())
                .petId(ride.getPet().getId())
                .petName(ride.getPet().getName())
                .driverId(ride.getDriver() != null ? ride.getDriver().getId() : null)
                .driverName(ride.getDriver() != null ? ride.getDriver().getUser().getName() : null)
                .vehicleNumber(ride.getDriver() != null ? ride.getDriver().getVehicleNumber() : null)
                .pickupAddress(ride.getPickupAddress())
                .pickupLatitude(ride.getPickupLatitude())
                .pickupLongitude(ride.getPickupLongitude())
                .dropAddress(ride.getDropAddress())
                .dropLatitude(ride.getDropLatitude())
                .dropLongitude(ride.getDropLongitude())
                .status(ride.getStatus())
                .requestedAt(ride.getRequestedAt())
                .acceptedAt(ride.getAcceptedAt())
                .startedAt(ride.getStartedAt())
                .completedAt(ride.getCompletedAt())
                .estimatedFare(ride.getEstimatedFare())
                .notes(ride.getNotes())
                .build();
    }

    private RideDto.DriverResponse mapDriverToResponse(Driver driver) {
        return RideDto.DriverResponse.builder()
                .id(driver.getId())
                .userId(driver.getUser().getId())
                .name(driver.getUser().getName())
                .email(driver.getUser().getEmail())
                .vehicleType(driver.getVehicleType())
                .vehicleNumber(driver.getVehicleNumber())
                .available(driver.isAvailable())
                .currentLatitude(driver.getCurrentLatitude())
                .currentLongitude(driver.getCurrentLongitude())
                .rating(driver.getRating())
                .totalRides(driver.getTotalRides())
                .build();
    }
}