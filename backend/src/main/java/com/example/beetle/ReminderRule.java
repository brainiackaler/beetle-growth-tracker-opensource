package com.example.beetle;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.PrePersist;
import javax.persistence.PreUpdate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Entity
public class ReminderRule {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    private String beetleId;
    private String reminderType;
    private String title;

    @Column(length = 1000)
    private String message;

    private Integer intervalDays;
    private String nextReminderDate;
    private Boolean enabled = true;
    private String lastSentAt;
    private String createdAt;
    private String updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null || id.trim().isEmpty()) {
            id = UUID.randomUUID().toString();
        }
        String now = now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        normalizeDefaults();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = now();
        normalizeDefaults();
    }

    public void scheduleNextFrom(LocalDate date) {
        int days = intervalDays == null || intervalDays < 1 ? 1 : intervalDays;
        nextReminderDate = date.plusDays(days).toString();
    }

    public void markSent(LocalDate date) {
        lastSentAt = now();
        scheduleNextFrom(date);
    }

    private void normalizeDefaults() {
        title = clean(title);
        message = clean(message);
        reminderType = clean(reminderType);
        beetleId = clean(beetleId);
        if (enabled == null) {
            enabled = true;
        }
        if (intervalDays == null || intervalDays < 1) {
            intervalDays = 1;
        }
        if (nextReminderDate == null || nextReminderDate.trim().isEmpty()) {
            nextReminderDate = LocalDate.now().plusDays(intervalDays).toString();
        } else {
            nextReminderDate = nextReminderDate.trim();
        }
        if (title.isEmpty()) {
            title = "甲虫提醒";
        }
    }

    private String now() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getBeetleId() { return beetleId; }
    public void setBeetleId(String beetleId) { this.beetleId = clean(beetleId); }
    public String getReminderType() { return reminderType; }
    public void setReminderType(String reminderType) { this.reminderType = clean(reminderType); }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = clean(title); }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = clean(message); }
    public Integer getIntervalDays() { return intervalDays; }
    public void setIntervalDays(Integer intervalDays) { this.intervalDays = intervalDays; }
    public String getNextReminderDate() { return nextReminderDate; }
    public void setNextReminderDate(String nextReminderDate) { this.nextReminderDate = clean(nextReminderDate); }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public String getLastSentAt() { return lastSentAt; }
    public void setLastSentAt(String lastSentAt) { this.lastSentAt = lastSentAt; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
