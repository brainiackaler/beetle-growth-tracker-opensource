package com.example.beetle;

import com.fasterxml.jackson.annotation.JsonIgnore;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.PrePersist;
import javax.persistence.PreUpdate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Entity
public class NotificationSetting {
    @Id
    private String id;

    @Column(name = "user_id", unique = true, nullable = false)
    private Long userId;

    @Column(length = 500)
    private String barkServerUrl;

    @Column(length = 500)
    private String barkDeviceKey;

    private Boolean enabled = true;

    private Boolean telegramEnabled = false;

    @JsonIgnore
    @Column(name = "telegram_chat_id", length = 64, unique = true)
    private String telegramChatId;

    @Column(length = 64)
    private String telegramUsername;

    @Column(length = 100)
    private String telegramDisplayName;

    @JsonIgnore
    @Column(name = "telegram_bind_token_hash", length = 64, unique = true)
    private String telegramBindTokenHash;

    @JsonIgnore
    private Long telegramBindExpiresAt;

    private String telegramBoundAt;
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

    private void normalizeDefaults() {
        if (enabled == null) {
            enabled = true;
        }
        if (telegramEnabled == null) {
            telegramEnabled = false;
        }
        if (barkServerUrl == null || barkServerUrl.trim().isEmpty()) {
            barkServerUrl = "https://api.day.app";
        } else {
            barkServerUrl = trimTrailingSlash(barkServerUrl.trim());
        }
        barkDeviceKey = clean(barkDeviceKey);
        telegramChatId = nullableClean(telegramChatId);
        telegramUsername = nullableClean(telegramUsername);
        telegramDisplayName = nullableClean(telegramDisplayName);
        telegramBindTokenHash = nullableClean(telegramBindTokenHash);
        if (telegramChatId == null) {
            telegramEnabled = false;
        }
        if (telegramBindTokenHash == null) {
            telegramBindExpiresAt = null;
        }
    }

    private String trimTrailingSlash(String value) {
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }

    private String now() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String nullableClean(String value) {
        String cleaned = clean(value);
        return cleaned.isEmpty() ? null : cleaned;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getBarkServerUrl() { return barkServerUrl; }
    public void setBarkServerUrl(String barkServerUrl) { this.barkServerUrl = clean(barkServerUrl); }
    public String getBarkDeviceKey() { return barkDeviceKey; }
    public void setBarkDeviceKey(String barkDeviceKey) { this.barkDeviceKey = clean(barkDeviceKey); }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public Boolean getTelegramEnabled() { return telegramEnabled; }
    public void setTelegramEnabled(Boolean telegramEnabled) { this.telegramEnabled = telegramEnabled; }
    public String getTelegramChatId() { return telegramChatId; }
    public void setTelegramChatId(String telegramChatId) { this.telegramChatId = nullableClean(telegramChatId); }
    public String getTelegramUsername() { return telegramUsername; }
    public void setTelegramUsername(String telegramUsername) { this.telegramUsername = nullableClean(telegramUsername); }
    public String getTelegramDisplayName() { return telegramDisplayName; }
    public void setTelegramDisplayName(String telegramDisplayName) { this.telegramDisplayName = nullableClean(telegramDisplayName); }
    public String getTelegramBindTokenHash() { return telegramBindTokenHash; }
    public void setTelegramBindTokenHash(String telegramBindTokenHash) { this.telegramBindTokenHash = nullableClean(telegramBindTokenHash); }
    public Long getTelegramBindExpiresAt() { return telegramBindExpiresAt; }
    public void setTelegramBindExpiresAt(Long telegramBindExpiresAt) { this.telegramBindExpiresAt = telegramBindExpiresAt; }
    public String getTelegramBoundAt() { return telegramBoundAt; }
    public void setTelegramBoundAt(String telegramBoundAt) { this.telegramBoundAt = telegramBoundAt; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
