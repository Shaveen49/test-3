package com.petbuddy.dto;

import com.petbuddy.entity.Ride;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

/**
 * DTOs for Ride and Driver operations
 */
public class RideDto {

    // ─────────────────────────────────────────────────────────
    // Ride DTOs
    // ─────────────────────────────────────────────────────────

    @Data
    public static class RideRequest {
        @NotNull(message = "Pet ID is required")
        private Long petId;

        @NotBlank(message = "Pickup address is required")
        private String pickupAddress;

        @NotNull(message = "Pickup latitude is required")
        private Double pickupLatitude;

        @NotNull(message = "Pickup longitude is required")
        private Double pickupLongitude;

        @NotBlank(message = "Drop address is required")
        private String dropAddress;

        @NotNull(message = "Drop latitude is required")
        private Double dropLatitude;

        @NotNull(message = "Drop longitude is required")
        private Double dropLongitude;

        private String notes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RideResponse {
        private Long id;
        private Long userId;
        private String userName;
        private Long petId;
        private String petName;
        private Long driverId;
        private String driverName;
        private String driverPhone;
        private String vehicleNumber;
        private String pickupAddress;
        private Double pickupLatitude;
        private Double pickupLongitude;
        private String dropAddress;
        private Double dropLatitude;
        private Double dropLongitude;
        private Ride.RideStatus status;
        private LocalDateTime requestedAt;
        private LocalDateTime acceptedAt;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private Double estimatedFare;
        private String notes;
    }

    // ─────────────────────────────────────────────────────────
    // Driver DTOs
    // ─────────────────────────────────────────────────────────

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DriverResponse {
        private Long id;
        private Long userId;
        private String name;
        private String email;
        private String vehicleType;
        private String vehicleNumber;
        private boolean available;
        private Double currentLatitude;
        private Double currentLongitude;
        private Double rating;
        private Integer totalRides;
    }

    /** WebSocket message for live driver location updates */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationUpdate {
        private Long rideId;
        private Long driverId;
        private Double latitude;
        private Double longitude;
        private String timestamp;
    }

    /** WebSocket message pushed to drivers when a new ride is nearby */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RideRequestNotification {
        private Long rideId;
        private String userName;
        private String petName;
        private String pickupAddress;
        private Double pickupLatitude;
        private Double pickupLongitude;
        private String dropAddress;
        private Double dropLatitude;
        private Double dropLongitude;
        private String notes;
        private String type; // "NEW_RIDE_REQUEST"
    }

    /** Driver availability toggle request */
    @Data
    public static class AvailabilityRequest {
        @NotNull
        private Boolean available;
    }
}
