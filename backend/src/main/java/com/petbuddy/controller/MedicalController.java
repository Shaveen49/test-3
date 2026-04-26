package com.petbuddy.controller;

import com.petbuddy.dto.MedicalDto;
import com.petbuddy.service.MedicalService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for medical records, medications, and reminders
 * All routes are scoped under /api/pets/{petId}/...
 */
@RestController
@RequestMapping("/api/pets/{petId}")
@CrossOrigin(origins = "*")
public class MedicalController {

    @Autowired private MedicalService medicalService;

    // ─────────────────────────────────────────────────────────
    // Medical Records
    // ─────────────────────────────────────────────────────────

    @GetMapping("/medical-records")
    public ResponseEntity<List<MedicalDto.MedicalRecordResponse>> getMedicalRecords(
            @PathVariable Long petId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicalService.getMedicalRecords(petId, userDetails.getUsername()));
    }

    @PostMapping("/medical-records")
    public ResponseEntity<MedicalDto.MedicalRecordResponse> addMedicalRecord(
            @PathVariable Long petId,
            @Valid @RequestBody MedicalDto.MedicalRecordRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicalService.addMedicalRecord(petId, request, userDetails.getUsername()));
    }

    @DeleteMapping("/medical-records/{recordId}")
    public ResponseEntity<Void> deleteMedicalRecord(
            @PathVariable Long petId,
            @PathVariable Long recordId,
            @AuthenticationPrincipal UserDetails userDetails) {
        medicalService.deleteMedicalRecord(petId, recordId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────
    // Medications
    // ─────────────────────────────────────────────────────────

    @GetMapping("/medications")
    public ResponseEntity<List<MedicalDto.MedicationResponse>> getMedications(
            @PathVariable Long petId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicalService.getMedications(petId, userDetails.getUsername()));
    }

    @PostMapping("/medications")
    public ResponseEntity<MedicalDto.MedicationResponse> addMedication(
            @PathVariable Long petId,
            @Valid @RequestBody MedicalDto.MedicationRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicalService.addMedication(petId, request, userDetails.getUsername()));
    }

    @DeleteMapping("/medications/{medicationId}")
    public ResponseEntity<Void> deleteMedication(
            @PathVariable Long petId,
            @PathVariable Long medicationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        medicalService.deleteMedication(petId, medicationId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────
    // Reminders
    // ─────────────────────────────────────────────────────────

    @GetMapping("/reminders")
    public ResponseEntity<List<MedicalDto.ReminderResponse>> getReminders(
            @PathVariable Long petId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicalService.getReminders(petId, userDetails.getUsername()));
    }

    @GetMapping("/reminders/pending")
    public ResponseEntity<List<MedicalDto.ReminderResponse>> getPendingReminders(
            @PathVariable Long petId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicalService.getPendingReminders(petId, userDetails.getUsername()));
    }

    @PostMapping("/reminders")
    public ResponseEntity<MedicalDto.ReminderResponse> addReminder(
            @PathVariable Long petId,
            @Valid @RequestBody MedicalDto.ReminderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicalService.addReminder(petId, request, userDetails.getUsername()));
    }

    @PatchMapping("/reminders/{reminderId}/complete")
    public ResponseEntity<MedicalDto.ReminderResponse> markComplete(
            @PathVariable Long petId,
            @PathVariable Long reminderId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(medicalService.markReminderComplete(petId, reminderId, userDetails.getUsername()));
    }

    @DeleteMapping("/reminders/{reminderId}")
    public ResponseEntity<Void> deleteReminder(
            @PathVariable Long petId,
            @PathVariable Long reminderId,
            @AuthenticationPrincipal UserDetails userDetails) {
        medicalService.deleteReminder(petId, reminderId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}
