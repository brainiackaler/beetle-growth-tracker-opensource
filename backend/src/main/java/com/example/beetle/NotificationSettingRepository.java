package com.example.beetle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationSettingRepository extends JpaRepository<NotificationSetting, String> {
    Optional<NotificationSetting> findByUserId(Long userId);
    Optional<NotificationSetting> findByTelegramBindTokenHash(String telegramBindTokenHash);
    Optional<NotificationSetting> findByTelegramChatId(String telegramChatId);
}
