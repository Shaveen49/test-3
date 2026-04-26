package com.petbuddy.repository;

import com.petbuddy.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/** Repository for MedicalRecord entity */
@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {
    List<MedicalRecord> findByPetIdOrderByVisitDateDesc(Long petId);
}
