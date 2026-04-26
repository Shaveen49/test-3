package com.petbuddy.repository;

import com.petbuddy.entity.Ride;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long> {

    List<Ride> findByUserIdOrderByRequestedAtDesc(Long userId);
    List<Ride> findByDriverIdOrderByRequestedAtDesc(Long driverId);
    Optional<Ride> findByIdAndUserId(Long rideId, Long userId);
    List<Ride> findByStatus(Ride.RideStatus status);
    Optional<Ride> findByDriverIdAndStatus(Long driverId, Ride.RideStatus status);

    /**
     * Open REQUESTED rides (no driver yet) within radiusKm of a point.
     *
     * FIX: Same subquery pattern — PostgreSQL cannot reference a SELECT
     * alias in HAVING or WHERE of the same query level.
     */
    @Query(value = """
        SELECT *
        FROM (
            SELECT r.*,
                   (6371 * acos(
                       GREATEST(-1.0, LEAST(1.0,
                           cos(radians(:lat)) * cos(radians(r.pickup_latitude))
                           * cos(radians(r.pickup_longitude) - radians(:lng))
                           + sin(radians(:lat)) * sin(radians(r.pickup_latitude))
                       ))
                   )) AS dist_km
            FROM rides r
            WHERE r.status = 'REQUESTED'
              AND r.driver_id IS NULL
        ) sub
        WHERE sub.dist_km <= :radiusKm
        ORDER BY sub.dist_km ASC
        """, nativeQuery = true)
    List<Ride> findRequestedRidesWithinRadius(Double lat, Double lng, Double radiusKm);
}
