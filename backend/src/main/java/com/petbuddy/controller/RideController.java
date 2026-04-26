package com.petbuddy.controller;

import com.petbuddy.dto.RideDto;
import com.petbuddy.service.RideService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Ride (pet transport) REST controller
 *
 * New endpoints added:
 *  GET  /api/rides/driver/nearby   → REQUESTED rides near this driver
 *  POST /api/rides/{id}/driver-cancel → Driver cancels an accepted ride
 */
@RestController
@RequestMapping("/api/rides")
@CrossOrigin(origins = "*")
public class RideController {

    @Autowired private RideService rideService;

    // ─────────────────────────────────────────────────────────
    // User endpoints
    // ─────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<RideDto.RideResponse> requestRide(
            @Valid @RequestBody RideDto.RideRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rideService.requestRide(request, userDetails.getUsername()));
    }

    @GetMapping
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<RideDto.RideResponse>> getMyRides(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rideService.getUserRides(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<RideDto.RideResponse> getRide(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rideService.getRideById(id, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<RideDto.RideResponse> cancelRide(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rideService.cancelRide(id, userDetails.getUsername()));
    }

    // ─────────────────────────────────────────────────────────
    // Driver endpoints
    // ─────────────────────────────────────────────────────────

    /** Get rides already assigned to this driver */
    @GetMapping("/driver/my-rides")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<List<RideDto.RideResponse>> getDriverRides(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rideService.getDriverRides(userDetails.getUsername()));
    }

    /**
     * Get open REQUESTED rides within 5 km of the driver's current location.
     * Driver app calls this on dashboard load / refresh so they can see
     * requests even if the WebSocket notification was missed.
     */
    @GetMapping("/driver/nearby")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<List<RideDto.RideResponse>> getNearbyRides(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rideService.getNearbyRequestedRides(userDetails.getUsername()));
    }

    @PatchMapping("/{id}/accept")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<RideDto.RideResponse> acceptRide(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rideService.acceptRide(id, userDetails.getUsername()));
    }

    @PatchMapping("/{id}/start")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<RideDto.RideResponse> startRide(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rideService.startRide(id, userDetails.getUsername()));
    }

    @PatchMapping("/{id}/complete")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<RideDto.RideResponse> completeRide(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rideService.completeRide(id, userDetails.getUsername()));
    }

    /**
     * Driver cancels an accepted ride.
     * Ride returns to REQUESTED status and gets re-broadcast to nearby drivers.
     */
    @PatchMapping("/{id}/driver-cancel")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<RideDto.RideResponse> driverCancelRide(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(rideService.cancelRideAsDriver(id, userDetails.getUsername()));
    }

    @PatchMapping("/driver/availability")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<RideDto.DriverResponse> toggleAvailability(
            @RequestBody RideDto.AvailabilityRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                rideService.toggleAvailability(request.getAvailable(), userDetails.getUsername()));
    }
}
