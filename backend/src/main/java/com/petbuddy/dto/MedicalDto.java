package com.petbuddy.dto;

import com.petbuddy.entity.Medication;
import com.petbuddy.entity.Reminder;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTOs for Medical Records, Medications, and Reminders
 */
public class MedicalDto {

    // ─────────────────────────────────────────────────────────
    // Medical Record DTOs
    // ─────────────────────────────────────────────────────────

    @Data
    public static class MedicalRecordRequest {
        @NotNull(message = "Visit date is required")
        private LocalDate visitDate;

        @NotBlank(message = "Description is required")
        private String description;

        @NotBlank(message = "Vet name is required")
        private String vetName;

        private String clinicName;
        private String diagnosis;
        private Double cost;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MedicalRecordResponse {
        private Long id;
        private LocalDate visitDate;
        private String description;
        private String vetName;
        private String clinicName;
        private String diagnosis;
        private Double cost;
        private Long petId;
        private String petName;
    }

    // ─────────────────────────────────────────────────────────
    // Medication DTOs
    // ─────────────────────────────────────────────────────────

    @Data
    public static class MedicationRequest {
        @NotBlank(message = "Medication name is required")
        private String name;

        @NotNull(message = "Medication type is required")
        private Medication.MedicationType type;

        @NotNull(message = "Date administered is required")
        private LocalDate dateAdministered;

        private LocalDate nextDueDate;
        private String dosage;
        private String notes;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MedicationResponse {
        private Long id;
        private String name;
        private Medication.MedicationType type;
        private LocalDate dateAdministered;
        private LocalDate nextDueDate;
        private String dosage;
        private String notes;
        private Long petId;
        private String petName;
    }

    // ─────────────────────────────────────────────────────────
    // Reminder DTOs
    // ─────────────────────────────────────────────────────────

    @Data
    public static class ReminderRequest {
        @NotBlank(message = "Title is required")
        private String title;

        private String description;

        @NotNull(message = "Reminder date/time is required")
        private LocalDateTime reminderDateTime;

        @NotNull(message = "Reminder type is required")
        private Reminder.ReminderType type;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReminderResponse {
        private Long id;
        private String title;
        private String description;
        private LocalDateTime reminderDateTime;
        private Reminder.ReminderType type;
        private boolean isCompleted;
        private Long petId;
        private String petName;
    }
}
