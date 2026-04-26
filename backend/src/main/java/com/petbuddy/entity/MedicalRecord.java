package com.petbuddy.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

/**
 * MedicalRecord entity - tracks vet visits for pets
 */
@Entity
@Table(name = "medical_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate visitDate;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(nullable = false)
    private String vetName;

    private String clinicName;

    private String diagnosis;

    private Double cost;

    // Many medical records belong to one pet
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;
}
