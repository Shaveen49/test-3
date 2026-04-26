package com.petbuddy.dto;

import com.petbuddy.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * DTOs for Authentication requests and responses
 */
public class AuthDto {

    /** Request body for user registration */
    @Data
    public static class RegisterRequest {
        @NotBlank(message = "Name is required")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;

        @NotNull(message = "Role is required")
        private User.Role role;

        // Driver-specific fields (optional for USER role)
        private String vehicleType;
        private String vehicleNumber;
        private String licenseNumber;
    }

    /** Request body for login */
    @Data
    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    /** Response after successful authentication */
    @Data
    @lombok.Builder
    @lombok.AllArgsConstructor
    @lombok.NoArgsConstructor
    public static class AuthResponse {
        private String token;
        private String tokenType = "Bearer";
        private Long userId;
        private String name;
        private String email;
        private User.Role role;
        private Long driverId; // Only set for DRIVER role
    }
}
