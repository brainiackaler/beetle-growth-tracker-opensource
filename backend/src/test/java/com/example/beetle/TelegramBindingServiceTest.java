package com.example.beetle;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TelegramBindingServiceTest {
    @Mock
    private NotificationSettingRepository settingRepository;

    @Mock
    private TelegramNotificationService telegramNotificationService;

    private TelegramBindingService telegramBindingService;

    @BeforeEach
    void setUp() {
        telegramBindingService = new TelegramBindingService(settingRepository, telegramNotificationService);
    }

    @Test
    void startBindingStoresOnlyHashAndReturnsDeepLink() {
        NotificationSetting setting = setting("setting-1");
        AtomicReference<String> issuedToken = new AtomicReference<>();
        when(telegramNotificationService.isConfigured()).thenReturn(true);
        when(telegramNotificationService.createBindUrl(anyString())).thenAnswer(invocation -> {
            String token = invocation.getArgument(0);
            issuedToken.set(token);
            return "https://t.me/beetle_bot?start=" + token;
        });

        Map<String, Object> result = telegramBindingService.startBinding(setting);

        assertNotNull(issuedToken.get());
        assertEquals(32, issuedToken.get().length());
        assertEquals(64, setting.getTelegramBindTokenHash().length());
        assertNotEquals(issuedToken.get(), setting.getTelegramBindTokenHash());
        assertTrue(((String) result.get("url")).endsWith(issuedToken.get()));
        assertTrue((Long) result.get("expiresAt") > System.currentTimeMillis());
    }

    @Test
    void bindConnectsTelegramAndConsumesToken() {
        NotificationSetting setting = setting("setting-1");
        setting.setTelegramBindTokenHash("stored-hash");
        setting.setTelegramBindExpiresAt(System.currentTimeMillis() + 60000);
        when(settingRepository.findByTelegramBindTokenHash(anyString())).thenReturn(Optional.of(setting));
        when(settingRepository.findByTelegramChatId("123456789")).thenReturn(Optional.empty());

        TelegramBindingService.BindResult result = telegramBindingService.bind(
                "abcdefghijklmnop",
                "123456789",
                "beetle_owner",
                "甲虫",
                "主人"
        );

        assertTrue(result.isSuccess());
        assertEquals("123456789", setting.getTelegramChatId());
        assertEquals("beetle_owner", setting.getTelegramUsername());
        assertEquals("甲虫 主人", setting.getTelegramDisplayName());
        assertTrue(setting.getTelegramEnabled());
        assertNotNull(setting.getTelegramBoundAt());
        assertNull(setting.getTelegramBindTokenHash());
        assertNull(setting.getTelegramBindExpiresAt());
        verify(settingRepository).save(setting);
    }

    @Test
    void bindRejectsTelegramAccountAlreadyUsedByAnotherUser() {
        NotificationSetting setting = setting("setting-1");
        setting.setTelegramBindExpiresAt(System.currentTimeMillis() + 60000);
        NotificationSetting other = setting("setting-2");
        when(settingRepository.findByTelegramBindTokenHash(anyString())).thenReturn(Optional.of(setting));
        when(settingRepository.findByTelegramChatId("123456789")).thenReturn(Optional.of(other));

        TelegramBindingService.BindResult result = telegramBindingService.bind(
                "abcdefghijklmnop",
                "123456789",
                "",
                "",
                ""
        );

        assertFalse(result.isSuccess());
        assertNull(setting.getTelegramChatId());
        verify(settingRepository, never()).save(setting);
    }

    private NotificationSetting setting(String id) {
        NotificationSetting setting = new NotificationSetting();
        setting.setId(id);
        setting.setUserId(1L);
        return setting;
    }
}
