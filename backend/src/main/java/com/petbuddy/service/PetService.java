package com.petbuddy.service;

import com.petbuddy.dto.PetDto;
import com.petbuddy.entity.Pet;
import com.petbuddy.entity.User;
import com.petbuddy.repository.PetRepository;
import com.petbuddy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for pet management operations
 */
@Service
public class PetService {

    @Autowired private PetRepository petRepository;
    @Autowired private UserRepository userRepository;

    /** Get all pets for a user */
    public List<PetDto.PetResponse> getUserPets(String userEmail) {
        User user = getUserByEmail(userEmail);
        return petRepository.findByOwnerId(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /** Get a single pet by ID (only if owned by the user) */
    public PetDto.PetResponse getPetById(Long petId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new RuntimeException("Pet not found with id: " + petId));

        if (!pet.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("You do not have permission to view this pet");
        }
        return mapToResponse(pet);
    }

    /** Add a new pet for the authenticated user */
    @Transactional
    public PetDto.PetResponse addPet(PetDto.PetRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);

        Pet pet = Pet.builder()
                .name(request.getName())
                .breed(request.getBreed())
                .birthday(request.getBirthday())
                .species(request.getSpecies())
                .photoUrl(request.getPhotoUrl())
                .owner(user)
                .build();

        pet = petRepository.save(pet);
        return mapToResponse(pet);
    }

    /** Update an existing pet */
    @Transactional
    public PetDto.PetResponse updatePet(Long petId, PetDto.PetRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new RuntimeException("Pet not found with id: " + petId));

        if (!pet.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("You do not have permission to update this pet");
        }

        pet.setName(request.getName());
        pet.setBreed(request.getBreed());
        pet.setBirthday(request.getBirthday());
        pet.setSpecies(request.getSpecies());
        pet.setPhotoUrl(request.getPhotoUrl());

        pet = petRepository.save(pet);
        return mapToResponse(pet);
    }

    /** Delete a pet */
    @Transactional
    public void deletePet(Long petId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new RuntimeException("Pet not found with id: " + petId));

        if (!pet.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("You do not have permission to delete this pet");
        }
        petRepository.delete(pet);
    }

    // ─────────────────────────────────────────────────────────
    // Helper methods
    // ─────────────────────────────────────────────────────────

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    private PetDto.PetResponse mapToResponse(Pet pet) {
        int age = Period.between(pet.getBirthday(), LocalDate.now()).getYears();
        return PetDto.PetResponse.builder()
                .id(pet.getId())
                .name(pet.getName())
                .breed(pet.getBreed())
                .birthday(pet.getBirthday())
                .species(pet.getSpecies())
                .photoUrl(pet.getPhotoUrl())
                .ownerId(pet.getOwner().getId())
                .ownerName(pet.getOwner().getName())
                .age(age)
                .build();
    }
}
