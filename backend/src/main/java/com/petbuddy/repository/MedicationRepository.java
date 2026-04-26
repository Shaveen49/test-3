package com.petbuddy.repository;

import com.petbuddy.entity.Medication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/** Repository for Medication entity */
@Repository
public interface MedicationRepository extends JpaRepository<Medication, Long> {
    List<Medication> findByPetIdOrderByDateAdministeredDesc(Long petId);
    List<Medication> findByPetIdAndType(Long petId, Medication.MedicationType type);
}
