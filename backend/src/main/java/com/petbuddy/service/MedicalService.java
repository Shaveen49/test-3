package com.petbuddy.service;

import com.petbuddy.dto.MedicalDto;
import com.petbuddy.entity.*;
import com.petbuddy.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for medical records, medications, and reminders
 */
@Service
public class MedicalService {

    @Autowired private MedicalRecordRepository medicalRecordRepository;
    @Autowired private MedicationRepository medicationRepository;
    @Autowired private ReminderRepository reminderRepository;
    @Autowired private PetRepository petRepository;
    @Autowired private UserRepository userRepository;

    // ─────────────────────────────────────────────────────────
    // Medical Records
    // ─────────────────────────────────────────────────────────

    public List<MedicalDto.MedicalRecordResponse> getMedicalRecords(Long petId, String userEmail) {
        verifyPetOwnership(petId, userEmail);
        return medicalRecordRepository.findByPetIdOrderByVisitDateDesc(petId)
                .stream().map(this::mapMedicalRecord).collect(Collectors.toList());
    }

    @Transactional
    public MedicalDto.MedicalRecordResponse addMedicalRecord(Long petId,
            MedicalDto.MedicalRecordRequest request, String userEmail) {
        Pet pet = verifyPetOwnership(petId, userEmail);

        MedicalRecord record = MedicalRecord.builder()
                .visitDate(request.getVisitDate())
                .description(request.getDescription())
                .vetName(request.getVetName())
                .clinicName(request.getClinicName())
                .diagnosis(request.getDiagnosis())
                .cost(request.getCost())
                .pet(pet)
                .build();

        return mapMedicalRecord(medicalRecordRepository.save(record));
    }

    @Transactional
    public void deleteMedicalRecord(Long petId, Long recordId, String userEmail) {
        verifyPetOwnership(petId, userEmail);
        MedicalRecord record = medicalRecordRepository.findById(recordId)
                .orElseThrow(() -> new RuntimeException("Medical record not found: " + recordId));
        medicalRecordRepository.delete(record);
    }

    // ─────────────────────────────────────────────────────────
    // Medications
    // ─────────────────────────────────────────────────────────

    public List<MedicalDto.MedicationResponse> getMedications(Long petId, String userEmail) {
        verifyPetOwnership(petId, userEmail);
        return medicationRepository.findByPetIdOrderByDateAdministeredDesc(petId)
                .stream().map(this::mapMedication).collect(Collectors.toList());
    }

    @Transactional
    public MedicalDto.MedicationResponse addMedication(Long petId,
            MedicalDto.MedicationRequest request, String userEmail) {
        Pet pet = verifyPetOwnership(petId, userEmail);

        Medication medication = Medication.builder()
                .name(request.getName())
                .type(request.getType())
                .dateAdministered(request.getDateAdministered())
                .nextDueDate(request.getNextDueDate())
                .dosage(request.getDosage())
                .notes(request.getNotes())
                .pet(pet)
                .build();

        return mapMedication(medicationRepository.save(medication));
    }

    @Transactional
    public void deleteMedication(Long petId, Long medicationId, String userEmail) {
        verifyPetOwnership(petId, userEmail);
        medicationRepository.deleteById(medicationId);
    }

    // ─────────────────────────────────────────────────────────
    // Reminders
    // ─────────────────────────────────────────────────────────

    public List<MedicalDto.ReminderResponse> getReminders(Long petId, String userEmail) {
        verifyPetOwnership(petId, userEmail);
        return reminderRepository.findByPetIdOrderByReminderDateTimeAsc(petId)
                .stream().map(this::mapReminder).collect(Collectors.toList());
    }

    public List<MedicalDto.ReminderResponse> getPendingReminders(Long petId, String userEmail) {
        verifyPetOwnership(petId, userEmail);
        return reminderRepository.findByPetIdAndIsCompletedFalseOrderByReminderDateTimeAsc(petId)
                .stream().map(this::mapReminder).collect(Collectors.toList());
    }

    @Transactional
    public MedicalDto.ReminderResponse addReminder(Long petId,
            MedicalDto.ReminderRequest request, String userEmail) {
        Pet pet = verifyPetOwnership(petId, userEmail);

        Reminder reminder = Reminder.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .reminderDateTime(request.getReminderDateTime())
                .type(request.getType())
                .isCompleted(false)
                .pet(pet)
                .build();

        return mapReminder(reminderRepository.save(reminder));
    }

    @Transactional
    public MedicalDto.ReminderResponse markReminderComplete(Long petId, Long reminderId, String userEmail) {
        verifyPetOwnership(petId, userEmail);
        Reminder reminder = reminderRepository.findById(reminderId)
                .orElseThrow(() -> new RuntimeException("Reminder not found: " + reminderId));
        reminder.setCompleted(true);
        return mapReminder(reminderRepository.save(reminder));
    }

    @Transactional
    public void deleteReminder(Long petId, Long reminderId, String userEmail) {
        verifyPetOwnership(petId, userEmail);
        reminderRepository.deleteById(reminderId);
    }

    // ─────────────────────────────────────────────────────────
    // Helper methods
    // ─────────────────────────────────────────────────────────

    /** Verify that the pet belongs to the logged-in user */
    private Pet verifyPetOwnership(Long petId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));
        Pet pet = petRepository.findById(petId)
                .orElseThrow(() -> new RuntimeException("Pet not found: " + petId));
        if (!pet.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("You do not have permission to access this pet's data");
        }
        return pet;
    }

    private MedicalDto.MedicalRecordResponse mapMedicalRecord(MedicalRecord r) {
        return MedicalDto.MedicalRecordResponse.builder()
                .id(r.getId()).visitDate(r.getVisitDate()).description(r.getDescription())
                .vetName(r.getVetName()).clinicName(r.getClinicName())
                .diagnosis(r.getDiagnosis()).cost(r.getCost())
                .petId(r.getPet().getId()).petName(r.getPet().getName()).build();
    }

    private MedicalDto.MedicationResponse mapMedication(Medication m) {
        return MedicalDto.MedicationResponse.builder()
                .id(m.getId()).name(m.getName()).type(m.getType())
                .dateAdministered(m.getDateAdministered()).nextDueDate(m.getNextDueDate())
                .dosage(m.getDosage()).notes(m.getNotes())
                .petId(m.getPet().getId()).petName(m.getPet().getName()).build();
    }

    private MedicalDto.ReminderResponse mapReminder(Reminder r) {
        return MedicalDto.ReminderResponse.builder()
                .id(r.getId()).title(r.getTitle()).description(r.getDescription())
                .reminderDateTime(r.getReminderDateTime()).type(r.getType())
                .isCompleted(r.isCompleted())
                .petId(r.getPet().getId()).petName(r.getPet().getName()).build();
    }
}
