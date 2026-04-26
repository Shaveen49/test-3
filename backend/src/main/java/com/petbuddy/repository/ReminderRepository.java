package com.petbuddy.repository;

import com.petbuddy.entity.Reminder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/** Repository for Reminder entity */
@Repository
public interface ReminderRepository extends JpaRepository<Reminder, Long> {
    List<Reminder> findByPetIdOrderByReminderDateTimeAsc(Long petId);
    List<Reminder> findByPetIdAndIsCompletedFalseOrderByReminderDateTimeAsc(Long petId);
}
