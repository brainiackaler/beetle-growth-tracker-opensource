package com.example.beetle;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class NotificationDeliveryService {
    private static final Logger LOGGER = LoggerFactory.getLogger(NotificationDeliveryService.class);

    private final BarkNotificationService barkNotificationService;
    private final TelegramNotificationService telegramNotificationService;

    public NotificationDeliveryService(BarkNotificationService barkNotificationService,
                                       TelegramNotificationService telegramNotificationService) {
        this.barkNotificationService = barkNotificationService;
        this.telegramNotificationService = telegramNotificationService;
    }

    public boolean hasEnabledChannel(NotificationSetting setting) {
        if (setting == null) {
            return false;
        }
        boolean barkEnabled = Boolean.TRUE.equals(setting.getEnabled()) && hasText(setting.getBarkDeviceKey());
        boolean telegramEnabled = Boolean.TRUE.equals(setting.getTelegramEnabled())
                && hasText(setting.getTelegramChatId())
                && telegramNotificationService.isConfigured();
        return barkEnabled || telegramEnabled;
    }

    public void send(NotificationSetting setting, String title, String body) {
        if (setting == null) {
            throw new IllegalArgumentException("notification_setting_missing");
        }

        boolean attempted = false;
        boolean delivered = false;

        if (Boolean.TRUE.equals(setting.getEnabled()) && hasText(setting.getBarkDeviceKey())) {
            attempted = true;
            try {
                barkNotificationService.send(setting, title, body);
                delivered = true;
            } catch (Exception e) {
                LOGGER.warn("Bark reminder delivery failed: {}", e.getMessage());
            }
        }

        if (Boolean.TRUE.equals(setting.getTelegramEnabled()) && hasText(setting.getTelegramChatId())) {
            attempted = true;
            try {
                telegramNotificationService.send(setting, title, body);
                delivered = true;
            } catch (Exception e) {
                LOGGER.warn("Telegram reminder delivery failed: {}", e.getMessage());
            }
        }

        if (!attempted) {
            throw new IllegalStateException("notification_channel_missing");
        }
        if (!delivered) {
            throw new IllegalStateException("notification_delivery_failed");
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
