package com.example.beetle;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationDeliveryServiceTest {
    @Mock
    private BarkNotificationService barkNotificationService;

    @Mock
    private TelegramNotificationService telegramNotificationService;

    private NotificationDeliveryService notificationDeliveryService;

    @BeforeEach
    void setUp() {
        notificationDeliveryService = new NotificationDeliveryService(
                barkNotificationService,
                telegramNotificationService
        );
    }

    @Test
    void telegramOnlySettingIsAnEnabledChannel() {
        NotificationSetting setting = telegramSetting();
        when(telegramNotificationService.isConfigured()).thenReturn(true);

        assertTrue(notificationDeliveryService.hasEnabledChannel(setting));
    }

    @Test
    void missingBotTokenMakesTelegramChannelUnavailableToScheduler() {
        NotificationSetting setting = telegramSetting();
        when(telegramNotificationService.isConfigured()).thenReturn(false);

        assertFalse(notificationDeliveryService.hasEnabledChannel(setting));
    }

    @Test
    void oneSuccessfulChannelCompletesDelivery() {
        NotificationSetting setting = telegramSetting();
        setting.setBarkDeviceKey("bark-key");
        doThrow(new IllegalStateException("bark_failed"))
                .when(barkNotificationService)
                .send(setting, "标题", "内容");

        assertDoesNotThrow(() -> notificationDeliveryService.send(setting, "标题", "内容"));
        verify(telegramNotificationService).send(setting, "标题", "内容");
    }

    @Test
    void allFailedChannelsFailDelivery() {
        NotificationSetting setting = telegramSetting();
        doThrow(new IllegalStateException("telegram_failed"))
                .when(telegramNotificationService)
                .send(setting, "标题", "内容");

        assertThrows(
                IllegalStateException.class,
                () -> notificationDeliveryService.send(setting, "标题", "内容")
        );
    }

    private NotificationSetting telegramSetting() {
        NotificationSetting setting = new NotificationSetting();
        setting.setEnabled(true);
        setting.setTelegramEnabled(true);
        setting.setTelegramChatId("123456789");
        return setting;
    }
}
