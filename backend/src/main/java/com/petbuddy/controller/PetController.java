package com.petbuddy.controller;

import com.petbuddy.dto.PetDto;
import com.petbuddy.service.PetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Pet management controller
 */
@RestController
@RequestMapping("/api/pets")
@CrossOrigin(origins = "*")
public class PetController {

    @Autowired private PetService petService;

    /** GET /api/pets - Get all pets for the logged-in user */
    @GetMapping
    public ResponseEntity<List<PetDto.PetResponse>> getMyPets(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(petService.getUserPets(userDetails.getUsername()));
    }

    /** GET /api/pets/{id} - Get a specific pet */
    @GetMapping("/{id}")
    public ResponseEntity<PetDto.PetResponse> getPet(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(petService.getPetById(id, userDetails.getUsername()));
    }

    /** POST /api/pets - Add a new pet */
    @PostMapping
    public ResponseEntity<PetDto.PetResponse> addPet(
            @Valid @RequestBody PetDto.PetRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(petService.addPet(request, userDetails.getUsername()));
    }

    /** PUT /api/pets/{id} - Update a pet */
    @PutMapping("/{id}")
    public ResponseEntity<PetDto.PetResponse> updatePet(
            @PathVariable Long id,
            @Valid @RequestBody PetDto.PetRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(petService.updatePet(id, request, userDetails.getUsername()));
    }

    /** DELETE /api/pets/{id} - Delete a pet */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePet(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        petService.deletePet(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
