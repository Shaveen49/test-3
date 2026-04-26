package com.petbuddy.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

/**
 * Medication entity - vaccines and medicines for pets
 */
@Entity
@Table(name = "medications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MedicationType type;

    @Column(nullable = false)
    private LocalDate dateAdministered;

    private LocalDate nextDueDate;

    private String dosage;

    private String notes;

    // Many medications belong to one pet
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    public enum MedicationType {
        VACCINE, MEDICINE
    }
}
