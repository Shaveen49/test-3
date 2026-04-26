package com.petbuddy.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Driver entity - represents a pet transport driver
 */
@Entity
@Table(name = "drivers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Driver {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // One-to-one with User (driver is also a user with DRIVER role)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private String vehicleType;     // e.g., Car, Van, Bike

    private String vehicleNumber;   // License plate

    private String licenseNumber;

    @Column(nullable = false)
    @Builder.Default
    private boolean available = false; // Driver availability toggle

    // Last known location (updated via WebSocket)
    private Double currentLatitude;

    private Double currentLongitude;

    @Builder.Default
    private Double rating = 5.0;

    @Builder.Default
    private Integer totalRides = 0;
}
