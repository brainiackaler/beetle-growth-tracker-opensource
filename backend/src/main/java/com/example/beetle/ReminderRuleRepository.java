package com.example.beetle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReminderRuleRepository extends JpaRepository<ReminderRule, String> {
    List<ReminderRule> findByUserIdOrderByNextReminderDateAscCreatedAtDesc(Long userId);
    List<ReminderRule> findByEnabledTrueAndNextReminderDateLessThanEqual(String date);
    void deleteByBeetleId(String beetleId);
}
