package com.petbuddy.repository;

import com.petbuddy.entity.Pet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/** Repository for Pet entity */
@Repository
public interface PetRepository extends JpaRepository<Pet, Long> {
    List<Pet> findByOwnerId(Long ownerId);
    boolean existsByIdAndOwnerId(Long petId, Long ownerId);
}
