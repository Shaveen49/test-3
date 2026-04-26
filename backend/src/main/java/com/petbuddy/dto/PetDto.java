package com.petbuddy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDate;

/**
 * DTOs for Pet-related requests and responses
 */
public class PetDto {

    /** Request body to create or update a pet */
    @Data
    public static class PetRequest {
        @NotBlank(message = "Pet name is required")
        private String name;

        @NotBlank(message = "Breed is required")
        private String breed;

        @NotNull(message = "Birthday is required")
        private LocalDate birthday;

        private String species;
        private String photoUrl;
    }

    /** Response body for a pet */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PetResponse {
        private Long id;
        private String name;
        private String breed;
        private LocalDate birthday;
        private String species;
        private String photoUrl;
        private Long ownerId;
        private String ownerName;
        private int age; // Calculated field
    }
}
