package com.petbuddy.repository;

import com.petbuddy.entity.Driver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long> {

    Optional<Driver> findByUserId(Long userId);
    List<Driver> findByAvailableTrue();
    boolean existsByUserId(Long userId);

    /**
     * Find available drivers within radiusKm of a point.
     *
     * FIX: PostgreSQL does NOT allow column aliases in HAVING/WHERE.
     * We wrap the distance expression in a subquery so the outer query
     * can filter on it with a plain WHERE clause.
     */
    @Query(value = """
        SELECT *
        FROM (
            SELECT d.*,
                   (6371 * acos(
                       GREATEST(-1.0, LEAST(1.0,
                           cos(radians(:lat)) * cos(radians(d.current_latitude))
                           * cos(radians(d.current_longitude) - radians(:lng))
                           + sin(radians(:lat)) * sin(radians(d.current_latitude))
                       ))
                   )) AS dist_km
            FROM drivers d
            WHERE d.available = true
              AND d.current_latitude  IS NOT NULL
              AND d.current_longitude IS NOT NULL
        ) sub
        WHERE sub.dist_km <= :radiusKm
        ORDER BY sub.dist_km ASC
        """, nativeQuery = true)
    List<Driver> findAvailableDriversWithinRadius(Double lat, Double lng, Double radiusKm);

    /**
     * Nearest single available driver — kept for fallback use.
     * Same subquery pattern to avoid alias-in-WHERE issue.
     */
    @Query(value = """
        SELECT *
        FROM (
            SELECT d.*,
                   (6371 * acos(
                       GREATEST(-1.0, LEAST(1.0,
                           cos(radians(:lat)) * cos(radians(d.current_latitude))
                           * cos(radians(d.current_longitude) - radians(:lng))
                           + sin(radians(:lat)) * sin(radians(d.current_latitude))
                       ))
                   )) AS dist_km
            FROM drivers d
            WHERE d.available = true
              AND d.current_latitude  IS NOT NULL
              AND d.current_longitude IS NOT NULL
        ) sub
        ORDER BY sub.dist_km ASC
        LIMIT 1
        """, nativeQuery = true)
    Optional<Driver> findNearestAvailableDriver(Double lat, Double lng);
}
