package com.petbuddy.service;

import com.petbuddy.dto.AuthDto;
import com.petbuddy.entity.Driver;
import com.petbuddy.entity.User;
import com.petbuddy.repository.DriverRepository;
import com.petbuddy.repository.UserRepository;
import com.petbuddy.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service handling user registration and authentication
 */
@Service
public class AuthService {

    @Autowired private UserRepository userRepository;
    @Autowired private DriverRepository driverRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;
    @Autowired private AuthenticationManager authenticationManager;

    /**
     * Register a new user (USER or DRIVER)
     * If role is DRIVER, also creates a Driver record
     */
    @Transactional
    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request) {
        // Check if email is already taken
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already registered: " + request.getEmail());
        }

        // Create and save the User entity
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();
        user = userRepository.save(user);

        Long driverId = null;

        // If registering as a driver, create Driver profile
        if (request.getRole() == User.Role.DRIVER) {
            Driver driver = Driver.builder()
                    .user(user)
                    .vehicleType(request.getVehicleType())
                    .vehicleNumber(request.getVehicleNumber())
                    .licenseNumber(request.getLicenseNumber())
                    .available(false)
                    .build();
            driver = driverRepository.save(driver);
            driverId = driver.getId();
        }

        // Generate JWT token
        String token = generateTokenForUser(user);

        return AuthDto.AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .driverId(driverId)
                .build();
    }

    /**
     * Authenticate user and return JWT token
     */
    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        // Authenticate via Spring Security
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        // Get user from database
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Get driver ID if user is a driver
        Long driverId = null;
        if (user.getRole() == User.Role.DRIVER) {
            driverId = driverRepository.findByUserId(user.getId())
                    .map(Driver::getId)
                    .orElse(null);
        }

        String token = generateTokenForUser(user);

        return AuthDto.AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .driverId(driverId)
                .build();
    }

    /** Helper: generate JWT token for a user */
    private String generateTokenForUser(User user) {
        UserDetails userDetails = org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities("ROLE_" + user.getRole().name())
                .build();
        return jwtUtil.generateToken(userDetails);
    }
}
